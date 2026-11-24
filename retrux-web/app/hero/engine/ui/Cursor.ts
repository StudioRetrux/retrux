import { clamp, ease } from "../math";
import type { HeroState } from "../types";
import { CURSOR_CSS, CURSOR_ROOT_CLASS, injectStyles } from "./styles";

/** Press squeeze: the ring dips to 0.87 over 0.1 s, then recovers over the next 0.1 s. */
const PULSE_MIN = 0.87;
const PULSE_DOWN = 0.1;
const PULSE_UP = 0.1;
/** Linear fade of the press disc after release, seconds. */
const RELEASE_FADE = 0.15;
/** Pointer affordances: the ring shrinks to ~40 px and fills at 20 %. */
const LINK_TARGETS = "a[href], button:not(:disabled), [role='button'], summary, [data-cursor='link']";
/** Text fields and embeds keep the native cursor. */
const NATIVE_TARGETS = "input, textarea, select, [contenteditable]:not([contenteditable='false']), iframe, [data-cursor='native']";

type Mode = "ring" | "link" | "native";

function modeFor(target: EventTarget | null): Mode {
  if (!(target instanceof Element)) return "ring";
  if (target.closest(NATIVE_TARGETS)) return "native";
  return target.closest(LINK_TARGETS) ? "link" : "ring";
}

/** Cursor images used by CURSOR_CSS (warmed up front so the first switch never shows the fallback). */
const CURSOR_IMAGES = ["ring-80", "ring-68", "ring-56", "link-40", "link-34", "link-28"];

/**
 * The reference cursor: a hollow ring that follows the mouse 1:1 and fills with a disc while the hero
 * is pressed (`HeroState.pressed` / `hold`). Mouse only; touch and pen input, form fields and a pointer
 * outside the window get the native cursor back.
 *
 * The ring is the OS cursor (CSS cursor images, see CURSOR_CSS), so it tracks a trackpad at hardware rate
 * even when the GPU is throttled or the main thread is busy compiling shaders. This element only draws the
 * press disc inside it.
 */
export class Cursor {
  private readonly el: HTMLDivElement;
  private readonly ring: HTMLDivElement;
  private readonly disc: HTMLDivElement;
  private readonly reducedMotion: MediaQueryList | null;
  private readonly releaseStyles: () => void;
  private disposers: (() => void)[] = [];
  private disposed = false;
  private raf = 0;
  private last = 0;
  // Latest pointer event.
  private x = 0;
  private y = 0;
  private mouse = false;
  private inside = false;
  private target: EventTarget | null = null;
  private mode: Mode = "ring";
  // Press feedback.
  private wasPressed = false;
  private pulseT = -1;
  private fill = 0;
  private alpha = 0;
  private fadeT = -1;
  // Last values written to the DOM.
  private shown = false;
  private outX = NaN;
  private outY = NaN;
  private outScale = 1;
  private outFill = 0;
  private outAlpha = 0;
  private outLink = false;

  constructor(private readonly getState: () => HeroState, root: HTMLElement = document.body) {
    this.releaseStyles = injectStyles("cursor", CURSOR_CSS);
    this.el = document.createElement("div");
    this.el.setAttribute("data-hero-cursor", "");
    this.el.setAttribute("aria-hidden", "true");
    this.ring = document.createElement("div");
    this.ring.setAttribute("data-hero-cursor-ring", "");
    this.disc = document.createElement("div");
    this.disc.setAttribute("data-hero-cursor-disc", "");
    this.ring.appendChild(this.disc);
    this.el.appendChild(this.ring);
    root.appendChild(this.el);
    this.reducedMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (typeof Image === "function") {
      const hi = (window.devicePixelRatio || 1) > 1.25 ? "@2x" : "";
      for (const name of CURSOR_IMAGES) new Image().src = `/hero/cursor/${name}${hi}.png`;
    }

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        this.mouse = false;
      } else {
        this.mouse = true;
        this.inside = true;
        this.x = e.clientX;
        this.y = e.clientY;
        if (e.target !== this.target) {
          this.target = e.target;
          this.mode = modeFor(e.target);
        }
        // Keep the press disc on the pointer between frames (the ring itself is the OS cursor).
        if (this.shown) this.place();
      }
      this.sync();
    };
    this.on(window, "pointermove", onPointer);
    this.on(window, "pointerdown", onPointer);
    this.on(document, "pointerover", onPointer);
    this.on(document, "pointerout", (e) => {
      // No related target: the pointer left the window.
      if (e.relatedTarget === null && e.pointerType === "mouse") {
        this.inside = false;
        this.sync();
      }
    });
    this.on(document, "visibilitychange", () => {
      if (document.hidden) this.inside = false;
      this.sync();
    });
  }

  private on<K extends keyof DocumentEventMap>(target: EventTarget, type: K, fn: (e: DocumentEventMap[K]) => void) {
    target.addEventListener(type, fn as EventListener, { passive: true });
    this.disposers.push(() => target.removeEventListener(type, fn as EventListener));
  }

  /** Runs the frame loop while the custom cursor should be visible, otherwise hides it. */
  private sync() {
    const visible = this.mouse && this.inside && this.mode !== "native" && !document.hidden;
    if (visible) {
      if (!this.raf) {
        this.last = 0;
        this.raf = requestAnimationFrame(this.frame);
      }
    } else if (this.raf || this.shown) {
      this.stop();
    }
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.pulseT = -1;
    this.fadeT = -1;
    this.fill = 0;
    this.alpha = 0;
    this.write(false, 1);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const resumed = this.last === 0;
    const dt = resumed ? 0 : Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const s = this.getState();
    const reduced = this.reducedMotion?.matches === true;

    if (resumed) {
      // Appearing mid-press (e.g. re-entering the window): show the fill, skip the pulse.
      this.wasPressed = s.pressed;
      this.alpha = s.pressed ? 1 : 0;
    } else if (s.pressed !== this.wasPressed) {
      this.wasPressed = s.pressed;
      if (s.pressed) {
        this.pulseT = reduced ? -1 : 0;
        this.alpha = 1;
        this.fadeT = -1;
      } else {
        this.fadeT = 0;
      }
    }

    if (s.pressed) {
      // Latched: the disc only grows during a press, so a quick re-press never shrinks it.
      const f = reduced ? 1 : ease.outCubic(clamp(s.hold));
      if (f > this.fill) this.fill = f;
    } else if (this.fadeT >= 0) {
      this.fadeT += dt;
      this.alpha = Math.max(0, 1 - this.fadeT / RELEASE_FADE);
      if (this.alpha === 0) {
        this.fadeT = -1;
        this.fill = 0;
      }
    }

    let scale = 1;
    if (this.pulseT >= 0) {
      this.pulseT += dt;
      const t = this.pulseT;
      if (t >= PULSE_DOWN + PULSE_UP) this.pulseT = -1;
      else if (t < PULSE_DOWN) scale = 1 - (1 - PULSE_MIN) * ease.outCubic(t / PULSE_DOWN);
      else scale = PULSE_MIN + (1 - PULSE_MIN) * ease.inOutCubic((t - PULSE_DOWN) / PULSE_UP);
    }
    this.write(true, scale);
  };

  /** Writes only what changed; the position snaps to device pixels so the 1.5 px ring stays crisp. */
  private place() {
    const dpr = window.devicePixelRatio || 1;
    const x = Math.round(this.x * dpr) / dpr;
    const y = Math.round(this.y * dpr) / dpr;
    if (x !== this.outX || y !== this.outY) {
      this.outX = x;
      this.outY = y;
      this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  private write(visible: boolean, scale: number) {
    if (visible) {
      this.place();
      const link = this.mode === "link";
      if (link !== this.outLink) {
        this.outLink = link;
        this.el.toggleAttribute("data-link", link);
      }
    }
    const ring = Math.round(scale * 1e4) / 1e4;
    if (ring !== this.outScale) {
      this.outScale = ring;
      this.ring.style.transform = ring === 1 ? "" : `scale(${ring})`;
    }
    const fill = this.alpha > 0 ? Math.round(this.fill * 1e3) / 1e3 : 0;
    if (fill !== this.outFill) {
      this.outFill = fill;
      this.disc.style.transform = `scale(${fill})`;
    }
    const alpha = Math.round(this.alpha * 1e3) / 1e3;
    if (alpha !== this.outAlpha) {
      this.outAlpha = alpha;
      this.disc.style.opacity = String(alpha);
    }
    if (visible !== this.shown) {
      this.shown = visible;
      this.el.toggleAttribute("data-visible", visible);
      document.documentElement.classList.toggle(CURSOR_ROOT_CLASS, visible);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    for (const off of this.disposers) off();
    this.disposers = [];
    this.el.remove();
    this.releaseStyles();
  }
}
