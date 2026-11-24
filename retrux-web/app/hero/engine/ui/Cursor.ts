import type { HeroState } from "../types";
import { injectStyles } from "./styles";

/**
 * Cursor follower in the wearemasa.com design (user, 19 Nov: "implement the same cursor follower design as
 * wearemasa.com"), measured on their live site: a 42 px ring (1 px outline) and a 42 px disc scaled to 0.1 (a 4.2 px
 * dot), both centred on one point that eases toward the pointer (~12 % of the gap per 60 Hz frame); hidden on coarse
 * pointers. Plain white (user: "ensure white color as before"), not wearemasa's difference blend.
 * States (user, 19 Nov): over a link or button the ring shrinks down into the dot; pressing / press-and-hold grows the
 * dot until it fills the whole ring (wearemasa's hold). Over the sculpture a "Press & Hold" caption sits beside the
 * ring in Space Grotesk. The native cursor stays visible (user: "ensure real cursor still seen").
 * The previous PNG ring cursor is in git history (round 10/11).
 */
const LINK_TARGETS = "a[href], button:not(:disabled), [role='button'], summary, [data-cursor='link']";
const NATIVE_TARGETS = "input, textarea, select, [contenteditable]:not([contenteditable='false']), iframe, [data-cursor='native']";
/** Follow rate: 1 - exp(-dt * RATE) per frame = 0.118 at 60 Hz (measured 0.11-0.12 on wearemasa.com). */
const RATE = 7.5;

const CSS = `
.rx-cursor{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;opacity:0;
  transition:opacity .3s ease;will-change:transform}
.rx-cursor.is-on{opacity:1}
.rx-cursor.is-native{opacity:0}
.rx-cursor__ring,.rx-cursor__dot{position:absolute;left:0;top:0;width:42px;height:42px;border-radius:50%;
  transform:translate(-50%,-50%) scale(var(--s,1));transition:transform .45s cubic-bezier(.22,1,.36,1)}
.rx-cursor__ring{outline:1px solid #fff;outline-offset:-1px}
.rx-cursor__dot{background:#fff;--s:.1}
.rx-cursor.is-link .rx-cursor__ring{--s:.1}
.rx-cursor.is-down .rx-cursor__dot,.rx-cursor.is-hold .rx-cursor__dot{--s:1;transition-duration:.6s}
.rx-cursor.is-down .rx-cursor__label{opacity:0;transform:translate(-6px,-50%)}
@keyframes rx-press{0%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(.87)}100%{transform:translate(-50%,-50%) scale(1)}}
.rx-cursor.is-down .rx-cursor__ring{animation:rx-press .2s ease-in-out}
.rx-cursor.is-link.is-down .rx-cursor__ring{animation:none}
.rx-cursor__label{position:absolute;left:31px;top:0;transform:translate(-6px,-50%);opacity:0;white-space:nowrap;
  font-family:var(--font-sans),"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-size:11px;line-height:1;font-weight:500;
  letter-spacing:.12em;text-transform:uppercase;color:#fff;
  transition:opacity .35s ease,transform .5s cubic-bezier(.22,1,.36,1)}
.rx-cursor.is-hero .rx-cursor__label{opacity:1;transform:translate(0,-50%)}
.rx-cursor.is-link .rx-cursor__label,.rx-cursor.is-hold .rx-cursor__label{opacity:0;transform:translate(-6px,-50%)}
@media (min-width:768px){.rx-cursor__label{font-size:12px}}
@media (pointer:coarse),(hover:none){.rx-cursor{display:none}}
@media (prefers-reduced-motion:reduce){.rx-cursor__ring,.rx-cursor__dot{transition:none}}
`;

export class Cursor {
  private el: HTMLDivElement;
  private disposers: (() => void)[] = [];
  private disposed = false;
  private x = -100;
  private y = -100;
  private tx = -100;
  private ty = -100;
  private seen = false;
  private raf = 0;
  private last = 0;

  constructor(private readonly getState: () => HeroState, root: HTMLElement = document.body) {
    this.disposers.push(injectStyles("rx-cursor", CSS));
    const el = document.createElement("div");
    el.className = "rx-cursor";
    el.setAttribute("aria-hidden", "true");
    // The label sits beside the ring over the sculpture (wearemasa's cursor captions, in the site's Space Grotesk).
    el.innerHTML = '<div class="rx-cursor__ring"></div><div class="rx-cursor__dot"></div><div class="rx-cursor__label">Press &amp; Hold</div>';
    root.appendChild(el);
    this.el = el;
    const fine = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
    if (fine) document.documentElement.classList.add("rx-cursor-on");

    const on = <K extends keyof DocumentEventMap>(type: K, fn: (e: DocumentEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      document.addEventListener(type, fn, opts);
      this.disposers.push(() => document.removeEventListener(type, fn, opts));
    };
    on("pointermove", (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      this.tx = e.clientX;
      this.ty = e.clientY;
      if (!this.seen) {
        this.seen = true;
        this.x = this.tx;
        this.y = this.ty;
      }
      el.classList.add("is-on");
    }, { passive: true });
    on("pointerover", (e) => {
      const t = e.target instanceof Element ? e.target : null;
      el.classList.toggle("is-native", !!t?.closest(NATIVE_TARGETS));
      el.classList.toggle("is-link", !!t?.closest(LINK_TARGETS));
      el.classList.toggle("is-hero", !!t?.closest("[data-hero-canvas]"));
    }, { passive: true });
    on("pointerdown", (e) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") el.classList.add("is-down");
    }, { passive: true });
    on("pointerup", () => el.classList.remove("is-down"), { passive: true });
    on("pointercancel", () => el.classList.remove("is-down"), { passive: true });
    const leave = (e: MouseEvent) => {
      if (!e.relatedTarget) el.classList.remove("is-on");
    };
    on("mouseout", leave);
    const blur = () => el.classList.remove("is-on");
    window.addEventListener("blur", blur);
    this.disposers.push(() => window.removeEventListener("blur", blur));

    const tick = (now: number) => {
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
      this.last = now;
      const k = 1 - Math.exp(-dt * RATE);
      this.x += (this.tx - this.x) * k;
      this.y += (this.ty - this.y) * k;
      el.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`;
      let holding = false;
      try {
        holding = this.getState().holding;
      } catch {
        holding = false;
      }
      el.classList.toggle("is-hold", holding);
      if (!this.disposed) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const off of this.disposers) off();
    this.disposers = [];
    this.el.remove();
    document.documentElement.classList.remove("rx-cursor-on");
  }
}
