/**
 * Cinematic Chinese-ink-on-rice-paper dissolve / reveal for the hero copy (user, 19 Nov: "disappear animation when
 * press and hold is use cinematic chinese ink paper animation", and the text reveals at the start and after the hold).
 *
 * One inline SVG filter, applied with CSS `filter: url(#retrux-ink)` only while an animation runs (no cost at rest):
 *   paper fibres  feTurbulence fractal noise (fixed seed, 2 octaves), stretched along x like xuan paper fibres; live, not an
 *                 feImage: an image input loads asynchronously and the first frames ran without it (a shifted ghost)
 *   bleed         feDisplacementMap of the letters along the fibres (the ink runs into the paper)
 *   spread        feGaussianBlur (wet ink widening)
 *   erosion       the fibre noise mapped to alpha with a moving threshold: the strokes break up along the fibres
 * out(): progress 0 -> 1 (ink disperses and is drawn into the paper); in(): 1 -> 0 (ink gathers back into the strokes).
 * prefers-reduced-motion: a plain opacity fade.
 */
const NS = "http://www.w3.org/2000/svg";
const ID = "retrux-ink";

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * WebKit (Safari, and every iOS browser) does not apply SVG filters such as feDisplacementMap / feTurbulence to HTML
 * content: on the user's iPhone (19 Nov) "press and hold ink text animation doesn't work, malah fade out terus instant".
 * There the same fibre erosion runs as a CSS mask: one sprite of MASK_FRAMES erosion steps of a fixed paper-fibre noise
 * (alpha = clamp(b - 5 fibre), the SVG path's own threshold), generated once, stepped with mask-position.
 * `?ink=mask` forces it elsewhere (tests).
 */
const MASK_FRAMES = 28;
const FRAME_W = 160;
const FRAME_H = 80;

function useMaskInk(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("ink") === "mask") return true;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
  return iOS || safari;
}

function maskSprite(): string {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H * MASK_FRAMES;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // Value-noise fBm, cells ~6:1 like xuan paper fibres (the SVG path's 0.009 x 0.055 at a phone copy block's scale).
  const layer = (cw: number, ch: number) => {
    const gx = Math.ceil(FRAME_W / cw) + 2;
    const gy = Math.ceil(FRAME_H / ch) + 2;
    const g = Float32Array.from({ length: gx * gy }, rnd);
    return (x: number, y: number) => {
      const fx = x / cw, fy = y / ch, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => g[j * gx + i];
      const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
      const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      return a + (b - a) * sy;
    };
  };
  const ls = [layer(48, 8), layer(24, 4), layer(12, 2)];
  const field = new Float32Array(FRAME_W * FRAME_H);
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) field[y * FRAME_W + x] = 0.55 * ls[0](x, y) + 0.3 * ls[1](x, y) + 0.15 * ls[2](x, y);
  const img = ctx.createImageData(FRAME_W, FRAME_H * MASK_FRAMES);
  for (let k = 0; k < MASK_FRAMES; k++) {
    const b = 6 - 5.8 * (k / (MASK_FRAMES - 1));
    for (let i = 0; i < field.length; i++) {
      const o = (k * field.length + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * Math.min(1, Math.max(0, b - 5 * field[i])));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

const setMask = (el: HTMLElement, value: string | null, pos = "") => {
  const st = el.style as CSSStyleDeclaration & Record<string, string>;
  if (value === null) {
    st.webkitMaskImage = st.maskImage = "";
    st.webkitMaskSize = st.maskSize = "";
    st.webkitMaskRepeat = st.maskRepeat = "";
    st.webkitMaskPosition = st.maskPosition = "";
    return;
  }
  if (st.webkitMaskImage !== value && st.maskImage !== value) {
    st.webkitMaskImage = st.maskImage = value;
    st.webkitMaskSize = st.maskSize = `100% ${MASK_FRAMES * 100}%`;
    st.webkitMaskRepeat = st.maskRepeat = "no-repeat";
  }
  st.webkitMaskPosition = st.maskPosition = pos;
};

export class InkText {
  private svg: SVGSVGElement;
  private disp: SVGFEDisplacementMapElement;
  private blur: SVGFEGaussianBlurElement;
  private alpha: SVGFEColorMatrixElement;
  private p = 0;
  /** +1 while dispersing (out), -1 while gathering (in): picks the erosion curve. */
  private dir = 1;
  /** WebKit: the CSS mask sprite (url(...)) instead of the SVG filter. */
  private mask: string | null = null;
  private raf = 0;
  private resolveRun: (() => void) | null = null;
  private disposed = false;

  constructor(private readonly targets: () => HTMLElement[]) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML = `<filter id="${ID}" x="-7%" y="-38%" width="114%" height="176%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.009 0.055" numOctaves="2" seed="11" result="fibre"/>
  <feDisplacementMap in="SourceGraphic" in2="fibre" scale="0" xChannelSelector="R" yChannelSelector="G" result="bleed"/>
  <feGaussianBlur in="bleed" stdDeviation="0" result="spread"/>
  <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -5 0 0 0 6" result="mask"/>
  <feComposite in="spread" in2="mask" operator="in"/>
</filter>`;
    document.body.appendChild(svg);
    this.svg = svg;
    this.disp = svg.querySelector("feDisplacementMap")!;
    this.blur = svg.querySelector("feGaussianBlur")!;
    this.alpha = svg.querySelector("feColorMatrix")!;
    if (useMaskInk()) {
      const sprite = maskSprite();
      if (sprite) this.mask = `url("${sprite}")`;
    }
  }

  /** Writes the filter for progress p (0 = crisp text, 1 = gone into the paper). */
  private apply(p: number) {
    const q = Math.min(1, Math.max(0, p));
    // User, 19 Nov: "pas press and hold, dia opacity down dl, gausah, langsung perform ink aja": on the way out the
    // fibre erosion leads from the first frame (ease-out), the bleed follows, the blur stays small (a wide blur on thin
    // strokes reads as a plain fade). On the way back ("ada lag or glitch pas kemunculan text"), the strokes regrow
    // from the first frame of the reveal instead of waiting (q^1.4), and the erosion ends exactly at full ink (b 6), so
    // nothing pops when the filter is removed. The fibre pattern is fixed (no seed jumps).
    const erode = this.dir > 0 ? 1 - Math.pow(1 - q, 2.2) : Math.pow(q, 1.4);
    const e = easeInOut(q);
    this.disp.setAttribute("scale", (34 * e).toFixed(2));
    this.blur.setAttribute("stdDeviation", `${(1.1 * e).toFixed(2)} ${(0.5 * e).toFixed(2)}`);
    // alpha = -5 * fibre + b. Fibre values sit in ~0.2-0.8: b 6 keeps every stroke whole, b 0.2 clears everything.
    const b = 6 - 5.8 * erode;
    this.alpha.setAttribute("values", `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -5 0 0 0 ${b.toFixed(3)}`);
    if (this.mask) {
      // WebKit: the same erosion as stepped mask frames (no bleed displacement there).
      const k = Math.round(Math.min(1, Math.max(0, erode)) * (MASK_FRAMES - 1));
      for (const el of this.targets()) {
        if (p > 0.001) setMask(el, this.mask, `0% ${((k / (MASK_FRAMES - 1)) * 100).toFixed(3)}%`);
        else setMask(el, null);
        el.style.opacity = p >= 0.999 ? "0" : p > 0.001 ? "1" : "";
      }
      return;
    }
    for (const el of this.targets()) {
      el.style.filter = p > 0.001 ? `url(#${ID})` : "";
      // Inline, so no stylesheet can dim the copy first: the ink alone takes it away.
      el.style.opacity = p >= 0.999 ? "0" : p > 0.001 ? "1" : "";
    }
  }

  private run(to: number, seconds: number, delay = 0): Promise<void> {
    cancelAnimationFrame(this.raf);
    this.resolveRun?.();
    if (this.disposed) return Promise.resolve();
    const els = this.targets();
    if (reduced()) {
      this.p = to;
      for (const el of els) {
        el.style.filter = "";
        setMask(el, null);
        el.style.transition = "opacity 0.5s ease";
        el.style.opacity = to >= 1 ? "0" : "";
      }
      return Promise.resolve();
    }
    for (const el of els) el.style.transition = "none";
    const from = this.p;
    this.dir = to > from ? 1 : -1;
    const span = Math.abs(to - from);
    if (span < 1e-3) {
      this.apply(to);
      return Promise.resolve();
    }
    const dur = seconds * span;
    return new Promise((resolve) => {
      this.resolveRun = resolve;
      let t0 = -1;
      const step = (now: number) => {
        if (t0 < 0) t0 = now + delay * 1000;
        const k = Math.min(1, Math.max(0, (now - t0) / (dur * 1000)));
        this.p = from + (to - from) * k;
        this.apply(this.p);
        if (k < 1 && !this.disposed) this.raf = requestAnimationFrame(step);
        else {
          this.resolveRun = null;
          resolve();
        }
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  /** Hide instantly in the "gone" state (before the first reveal). */
  hideNow() {
    this.p = 1;
    this.apply(1);
  }

  /** Ink disperses into the paper (press-and-hold). */
  out(): Promise<void> {
    return this.run(1, 1.1);
  }

  /** Ink gathers back into the letters (page start, hold released). */
  in(delay = 0): Promise<void> {
    return this.run(0, 1.4, delay);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resolveRun?.();
    for (const el of this.targets()) {
      el.style.filter = "";
      setMask(el, null);
      el.style.opacity = "";
      el.style.willChange = "";
      el.style.transition = "";
    }
    this.svg.remove();
  }
}
