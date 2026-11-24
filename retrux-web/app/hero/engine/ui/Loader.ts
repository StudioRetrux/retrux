import { clamp } from "../math";
import { injectStyles, LOADER_CSS, LOADER_DISSOLVE_MS } from "./styles";

/** Beat on 100 % before the dissolve starts, ms. */
const FULL_BEAT_MS = 150;

let uid = 0;

/** The Retrux "R" (public/icons/retrux-logo.svg), white parts tinted through currentColor. */
const logo = (gradient: string) =>
  `<svg data-hero-loader-logo viewBox="0 0 32.9757 38" width="38.18" height="44" fill="none" aria-hidden="true">` +
  `<path opacity="0.2" fill-rule="evenodd" clip-rule="evenodd" fill="url(#${gradient})" d="M21.7602 11.4485C21.7602 11.4485 19.9959 12.412 16.2779 13.6343C13.2774 14.6207 8.93309 16.2687 6.49579 19.6899C6.48253 19.7179 6.25213 19.0446 6.85411 16.7517C6.81183 16.7272 1.88923 23.3441 6.56746 28.1821C6.61404 28.1656 6.64414 23.9579 9.43402 20.8724C11.7273 18.3356 15.8816 15.9321 18.6429 14.6376C20.8437 13.6056 21.7602 11.4485 21.7602 11.4485Z"/>` +
  `<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M12.1052 9.36892C12.4629 9.27758 13.4253 9.12057 14.0739 9.01777C14.1344 9.00992 14.2491 9.5092 14.2491 9.5092C14.2491 9.5092 13.7804 9.46603 13.1336 9.47337C12.3804 9.48183 11.471 9.53099 12.1052 9.36892Z"/>` +
  `<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M0.117735 5.64368C0.117735 5.64368 0.710756 2.50321 0.870208 1.66632C1.02966 0.829428 0.682448 0.378948 5.92252 0.197208C11.1626 0.0154677 20.461 -0.797669 26.4184 3.02794C32.3759 6.85355 32.7571 15.1267 26.8126 19.6898C23.3297 22.3633 21.5345 24.1154 24.6627 28.2537C27.7908 32.3919 32.9757 37.9283 32.9757 37.9283C32.9757 37.9283 27.8643 38 24.0535 38C20.2428 38 19.184 37.0816 13.3039 29.4003C8.74645 23.6747 6.60333 28.182 6.60333 28.182C6.60333 28.182 4.60785 20.3527 19.6104 13.0251C21.4837 12.1101 21.7624 11.5709 21.6886 10.5885C21.6402 9.94327 21.5818 9.82255 21.5095 9.4777C21.4371 9.13286 20.9978 9.02891 19.7179 8.86856C18.4379 8.70821 17.0935 8.74315 16.3138 8.76106C15.3997 8.78203 15.3804 8.82617 15.0597 8.47441C14.739 8.12264 11.4765 8.25942 11.4765 8.25942C11.4765 8.25942 10.9383 6.64339 9.61322 7.22029C8.28816 7.79718 7.3705 10.0036 4.7759 10.5885C2.1813 11.1734 -0.611446 9.78704 0.117735 5.64368Z"/>` +
  `<defs><linearGradient id="${gradient}" x1="7.29707" y1="11.4485" x2="19.014" y2="28.1821" gradientUnits="userSpaceOnUse">` +
  `<stop stop-color="#296EE3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>`;

/**
 * First-paint loader in the Retrux language: pale arctic gradient with drifting frost, the "R" mark,
 * a 1 px progress line and a tabular percentage. Blocks pointer events (and, via `data-no-hold`, hero
 * presses) until `finish()` dissolves it into the scene.
 */
export class Loader {
  private readonly el: HTMLDivElement;
  private readonly bar: HTMLElement;
  private readonly lead: HTMLElement;
  private readonly digits: HTMLElement;
  private readonly releaseStyles: () => void;
  private target = 0;
  private shown = 0;
  private pct = -1;
  private raf = 0;
  private last = 0;
  private finishing = false;
  private dissolving = false;
  private disposed = false;
  private timers: number[] = [];
  private done: Promise<void> | null = null;
  private resolveDone: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.releaseStyles = injectStyles("loader", LOADER_CSS);
    const el = document.createElement("div");
    el.setAttribute("data-hero-loader", "");
    el.setAttribute("data-no-hold", "");
    el.setAttribute("role", "progressbar");
    el.setAttribute("aria-label", "Loading");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "100");
    el.innerHTML =
      `<div data-hero-loader-blur></div>` +
      `<div data-hero-loader-veil><div data-hero-loader-frost></div></div>` +
      `<div data-hero-loader-content>${logo(`retrux-loader-gradient-${++uid}`)}` +
      `<div data-hero-loader-track><div data-hero-loader-fill></div></div>` +
      `<div data-hero-loader-pct><span data-dim></span><span data-digits></span>%</div></div>`;
    this.el = el;
    this.bar = el.querySelector<HTMLElement>("[data-hero-loader-fill]")!;
    this.lead = el.querySelector<HTMLElement>("[data-dim]")!;
    this.digits = el.querySelector<HTMLElement>("[data-digits]")!;
    this.render();
    root.appendChild(el);
  }

  /** Loading progress 0..1. The display eases towards it and never moves backwards. */
  setProgress(p: number) {
    if (this.finishing || this.disposed || !(p > this.target)) return;
    this.target = clamp(p);
    this.wake();
  }

  /** Completes the bar, then dissolves into the scene (~1 s). Resolves once the loader is gone. */
  finish(): Promise<void> {
    if (!this.done) {
      this.done = new Promise<void>((resolve) => {
        this.resolveDone = () => resolve();
      });
      if (this.disposed) {
        this.resolveDone?.();
      } else {
        this.finishing = true;
        this.target = 1;
        if (document.hidden) {
          // No frames in a background tab: skip the fill, the dissolve still plays on return.
          this.shown = 1;
          this.render();
        }
        this.wake();
      }
    }
    return this.done;
  }

  private wake() {
    if (!this.raf && !this.disposed) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    const gap = this.target - this.shown;
    if (gap > 0) {
      // Exponential ease towards the target plus a minimum speed, so the tail never crawls.
      const rate = this.finishing ? 10 : 4;
      const minSpeed = this.finishing ? 1.2 : 0.03;
      const step = Math.max(gap * (1 - Math.exp(-rate * dt)), minSpeed * dt);
      this.shown = gap - step < 1e-3 ? this.target : this.shown + step;
      this.render();
    }
    if (this.shown < this.target) {
      this.wake();
    } else {
      this.last = 0;
      if (this.finishing) this.dissolve();
    }
  };

  private render() {
    this.bar.style.transform = `scaleX(${this.shown.toFixed(4)})`;
    const pct = Math.min(100, Math.floor(this.shown * 100 + 1e-6));
    if (pct === this.pct) return;
    this.pct = pct;
    // Three tabular digits, the leading zeros dimmed.
    this.lead.textContent = pct < 10 ? "00" : pct < 100 ? "0" : "";
    this.digits.textContent = String(pct);
    this.el.setAttribute("aria-valuenow", String(pct));
  }

  private dissolve() {
    if (this.dissolving) return;
    this.dissolving = true;
    // The backdrop blur goes on under the still opaque veil, then everything eases out together.
    this.el.setAttribute("data-state", "arm");
    this.later(FULL_BEAT_MS, () => {
      this.el.setAttribute("data-state", "out");
      this.later(LOADER_DISSOLVE_MS + 50, () => this.teardown());
    });
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private teardown() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.el.remove();
    this.releaseStyles();
    this.resolveDone?.();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.teardown();
  }
}
