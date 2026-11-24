import { injectStyles, REVEAL_CSS } from "./styles";

/** Headline: lines rise out of their masks, staggered. */
const LINE_FRAMES: Keyframe[] = [{ transform: "translate3d(0, 105%, 0)" }, { transform: "translate3d(0, 0, 0)" }];
const LINE_STAGGER = 0.09;
const LINE_DURATION = 1.1;
const EASE_RISE = "cubic-bezier(0.16, 1, 0.3, 1)";
/** Subline: starts 0.25 s after the headline, rises 20 px and fades. */
const SUBLINE_FRAMES: Keyframe[] = [
  { opacity: 0, transform: "translate3d(0, 20px, 0)" },
  { opacity: 1, transform: "translate3d(0, 0, 0)" },
];
const SUBLINE_OFFSET = 0.25;
/** Chrome (logo, nav, scroll hint, sound): fades in, nav first. */
const FADE_FRAMES: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const FADE_DURATION = 0.8;
const FADE_STAGGER = 0.06;
const EASE_FADE = "cubic-bezier(0.33, 1, 0.68, 1)";

const FONT_TIMEOUT = 1500;
const RESIZE_DEBOUNCE = 150;
/** HTML whitespace (not &nbsp;), captured so split() keeps the separators at odd indices. */
const SPACE = /([ \t\n\r\f]+)/;
/** Headings holding interactive content are not split (their copies would sit in aria-hidden spans). */
const INTERACTIVE = "a[href], button, input, select, textarea, [tabindex]";
/** While one of these covers the page, the safety net below keeps waiting. */
const LOADERS = "[data-hero-loader], [data-loader]";

type Word = {
  text: string;
  /** Inline ancestors between the split element and the text (em, strong, span...). */
  chain: readonly Element[];
  /** Whitespace before the word. */
  space: boolean;
  /** A <br> before the word. */
  br: boolean;
};

type Split = {
  el: HTMLElement;
  words: Word[];
  /** Line index of every word, joined: the DOM is only rebuilt when it changes. */
  key: string;
  masks: HTMLElement[];
  lines: HTMLElement[];
  busy: boolean;
  stale: boolean;
};

type Frame = { src: Element | null; node: Node };

const claimed = new WeakSet<Element>();
const splits = new Map<HTMLElement, Split>();
let started = false;
let listening = false;
let resizeTimer = 0;

const noop = () => {};
const markRevealed = (el: Element) => el.setAttribute("data-revealed", "");
const inNav = (el: Element) => el.closest("header, nav") !== null;
const isSplittable = (el: HTMLElement) =>
  (/^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading") && !el.querySelector(INTERACTIVE);
const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms: number) => new Promise<void>((resolve) => (ms > 0 ? window.setTimeout(resolve, ms) : resolve()));
const timing = (delay: number, duration: number, easing: string): KeyframeAnimationOptions => ({
  delay: delay * 1000,
  duration: duration * 1000,
  easing,
  fill: "both",
});

// The hide rule goes in as soon as this module loads (before the loader dissolves), never from CSS,
// so the copy stays visible when the script does not run.
if (typeof document !== "undefined") {
  injectStyles("reveal", REVEAL_CSS);
  armSafetyNet();
}

/**
 * Safety net: if no reveal has started and no loader has covered the page for 3 s (e.g. the hero
 * bundle failed to load), the copy is shown without animation.
 */
function armSafetyNet() {
  let idle = 0;
  const timer = window.setInterval(() => {
    idle = document.querySelector(LOADERS) ? 0 : idle + 1;
    if (!started && idle < 3) return;
    window.clearInterval(timer);
    if (!started) document.querySelectorAll("[data-reveal]").forEach(markRevealed);
  }, 1000);
}

/**
 * Reveals the hero copy under `root`: `[data-reveal="lines"]` headings rise line by line out of masks,
 * other `[data-reveal="lines"]` elements (the subline) follow 0.25 s later rising 20 px, and
 * `[data-reveal="fade"]` elements fade in, nav first. `delay` is in seconds. Resolves when every
 * animation has finished; instant with prefers-reduced-motion. Already revealed elements are skipped,
 * and split headings re-split on resize without animating again.
 */
export async function revealHeroText(root: ParentNode, opts: { delay?: number } = {}): Promise<void> {
  if (typeof document === "undefined") return;
  started = true;
  const startAt = performance.now() + Math.max(0, opts.delay ?? 0) * 1000;
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
    (el) => !el.hasAttribute("data-revealed") && !claimed.has(el),
  );
  if (!els.length) return;
  for (const el of els) claimed.add(el);

  try {
    if (prefersReducedMotion() || typeof els[0].animate !== "function") {
      await sleep(startAt - performance.now());
      return;
    }
    const lines = els.filter((el) => el.dataset.reveal === "lines");
    const heads = lines.filter(isSplittable);
    const subs = lines.filter((el) => !heads.includes(el));
    // Stable sort: DOM order within the nav and within the rest.
    const fades = els.filter((el) => el.dataset.reveal !== "lines").sort((a, b) => Number(inNav(b)) - Number(inNav(a)));
    if (heads.length) await fontsReady(FONT_TIMEOUT);
    const base = Math.max(0, startAt - performance.now()) / 1000;
    const jobs: Promise<void>[] = [];

    let index = 0;
    for (const el of heads) {
      const split = splitLines(el);
      const anims = split.lines.map((line) => line.animate(LINE_FRAMES, timing(base + LINE_STAGGER * index++, LINE_DURATION, EASE_RISE)));
      // Visible from here on: the lines are held below their masks by the backwards fill.
      markRevealed(el);
      split.busy = true;
      jobs.push(
        Promise.all(anims.map((a) => a.finished.then(noop, noop))).then(() => {
          for (const a of anims) a.cancel();
          split.busy = false;
          if (split.stale) {
            split.stale = false;
            layout(split);
          }
        }),
      );
    }
    subs.forEach((el, i) => jobs.push(play(el, SUBLINE_FRAMES, timing(base + SUBLINE_OFFSET + LINE_STAGGER * i, LINE_DURATION, EASE_RISE))));
    fades.forEach((el, i) => jobs.push(play(el, FADE_FRAMES, timing(base + FADE_STAGGER * i, FADE_DURATION, EASE_FADE))));
    await Promise.all(jobs);
  } catch (err) {
    console.error("[hero] text reveal failed", err);
  } finally {
    for (const el of els) markRevealed(el);
  }
}

/** One element's entrance; the hide rule stops matching it once the animation has finished. */
function play(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  const anim = el.animate(frames, options);
  return anim.finished.then(noop, noop).then(() => {
    markRevealed(el);
    anim.cancel();
  });
}

function fontsReady(timeout: number) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, timeout);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    if (document.fonts?.ready) document.fonts.ready.then(done, done);
    else done();
  });
}

function splitLines(el: HTMLElement): Split {
  let split = splits.get(el);
  if (!split) {
    const words = readWords(el);
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", words.map((w, i) => (i && (w.space || w.br) ? " " : "") + w.text).join(""));
    split = { el, words, key: "", masks: [], lines: [], busy: false, stale: false };
    splits.set(el, split);
    listen();
  }
  layout(split);
  return split;
}

/** Flattens the element into words, remembering spaces, <br>s and inline wrappers. */
function readWords(el: Element): Word[] {
  const words: Word[] = [];
  let space = false;
  let br = false;
  const walk = (node: Node, chain: readonly Element[]) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        (child.nodeValue ?? "").split(SPACE).forEach((part, i) => {
          if (i % 2) {
            space = true;
          } else if (part) {
            const first = words.length === 0;
            words.push({ text: part, chain, space: space && !br && !first, br: br && !first });
            space = br = false;
          }
        });
      } else if (child.nodeName === "BR") {
        br = true;
      } else if (child instanceof Element) {
        walk(child, [...chain, child]);
      }
    }
  };
  walk(el, []);
  return words;
}

/**
 * Measures where the words break (as inline spans in the element's own layout, so <br>s, width and
 * font all count), then rebuilds the content as masked block lines. Keeps the current lines when the
 * breaks did not change. Synchronous, so nothing in between is ever painted.
 */
function layout(split: Split) {
  const { el, words } = split;
  const flow = document.createDocumentFragment();
  const stack: Frame[] = [{ src: null, node: flow }];
  const probes = words.map((w, i) => {
    if (w.br && i) {
      stack.length = 1;
      flow.appendChild(document.createElement("br"));
    }
    const probe = document.createElement("span");
    probe.textContent = w.text;
    enter(stack, w.chain, w.space).appendChild(probe);
    return probe;
  });
  el.replaceChildren(flow);

  let line = -1;
  let top = -Infinity;
  let height = 0;
  const lineOf = probes.map((probe) => {
    const r = probe.getBoundingClientRect();
    if (r.top > top + height / 2) line++;
    top = r.top;
    height = r.height;
    return line;
  });
  const key = lineOf.join();
  if (key === split.key && split.masks.length) {
    el.replaceChildren(...split.masks);
    return;
  }

  const masks: HTMLElement[] = [];
  const lines: HTMLElement[] = [];
  let lineStack: Frame[] = [];
  words.forEach((w, i) => {
    let space = w.space;
    if (!i || lineOf[i] !== lineOf[i - 1]) {
      // Trailing space (collapsed by nowrap) keeps textContent and copy/paste readable.
      if (i && (w.space || w.br)) lines[lines.length - 1].appendChild(document.createTextNode(" "));
      const mask = document.createElement("span");
      mask.setAttribute("data-reveal-mask", "");
      mask.setAttribute("aria-hidden", "true");
      const lineEl = mask.appendChild(document.createElement("span"));
      lineEl.setAttribute("data-reveal-line", "");
      masks.push(mask);
      lines.push(lineEl);
      lineStack = [{ src: null, node: lineEl }];
      space = false;
    }
    enter(lineStack, w.chain, space).appendChild(document.createTextNode(w.text));
  });
  for (const l of lines) l.normalize();
  el.replaceChildren(...masks);
  split.key = key;
  split.masks = masks;
  split.lines = lines;
}

/** Re-opens the inline wrappers a word sits in (shallow clones), reusing the ones still open. */
function enter(stack: Frame[], chain: readonly Element[], space: boolean): Node {
  let depth = 0;
  while (depth < chain.length && depth + 1 < stack.length && stack[depth + 1].src === chain[depth]) depth++;
  stack.length = depth + 1;
  if (space) stack[depth].node.appendChild(document.createTextNode(" "));
  for (let i = depth; i < chain.length; i++) {
    const clone = chain[i].cloneNode(false) as Element;
    clone.removeAttribute("id");
    stack[stack.length - 1].node.appendChild(clone);
    stack.push({ src: chain[i], node: clone });
  }
  return stack[stack.length - 1].node;
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("resize", scheduleRelayout, { passive: true });
  document.fonts?.addEventListener("loadingdone", scheduleRelayout);
}

function unlisten() {
  listening = false;
  window.clearTimeout(resizeTimer);
  window.removeEventListener("resize", scheduleRelayout);
  document.fonts?.removeEventListener("loadingdone", scheduleRelayout);
}

function scheduleRelayout() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(relayout, RESIZE_DEBOUNCE);
}

/** Re-splits after a resize or a late font; deferred while a heading is animating; stops once unmounted. */
function relayout() {
  for (const [el, split] of splits) {
    if (!el.isConnected) splits.delete(el);
    else if (split.busy) split.stale = true;
    else layout(split);
  }
  if (!splits.size) unlisten();
}
