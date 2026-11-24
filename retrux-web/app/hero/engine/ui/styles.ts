/**
 * CSS of the DOM UI layer (cursor, loader, text reveal, sound wave), one block per module, injected
 * once through `injectStyles`. Selectors are data attributes so nothing collides with the page CSS.
 * Stacking above the canvas: loader 50, cursor 60.
 */

/** Class on <html> that hides the native cursor while the custom one is visible. */
export const CURSOR_ROOT_CLASS = "retrux-hero-cursor";

/** Loader dissolve length in ms, shared by the transitions below and the Loader's teardown. */
export const LOADER_DISSOLVE_MS = 1000;

const SOFT = "cubic-bezier(0.6, 0, 0.1, 1)";
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** A CSS cursor image (1x / 2x) with its hotspot at the centre. */
function cursorImage(name: string, hotspot: number, fallback: string) {
  const a = `url(/hero/cursor/${name}.png)`;
  const b = `url(/hero/cursor/${name}@2x.png)`;
  return `cursor: ${a} ${hotspot} ${hotspot}, ${fallback} !important;
  cursor: -webkit-image-set(${a} 1x, ${b} 2x) ${hotspot} ${hotspot}, ${fallback} !important;
  cursor: image-set(${a} 1x, ${b} 2x) ${hotspot} ${hotspot}, ${fallback} !important;`;
}

/** Elements that take the small link ring (Cursor.ts LINK_TARGETS). */
const LINK_SEL = ["a[href]", "button:not(:disabled)", "[role='button']", "summary", "[data-cursor='link']"];
const linkSel = (root: string) => LINK_SEL.flatMap((s) => [`${root} ${s}`, `${root} ${s} *`]).join(",\n");

/**
 * Ring: 79 px at a 1440 px viewport, 68 px and 56 px on narrower ones. Link ring: 40 / 79, filled at 20 %.
 * The ring itself is the OS cursor (a CSS cursor image), so it moves at hardware rate whatever the WebGL
 * frame rate: a DOM ring only moved when Chrome committed a frame, so on a throttled GPU or while shaders
 * compiled it lagged or froze, and the trackpad pointer read as stuck. The DOM element only draws the press
 * disc, sized to the same ring.
 */
export const CURSOR_CSS = `
html.${CURSOR_ROOT_CLASS},
html.${CURSOR_ROOT_CLASS} * {
  ${cursorImage("ring-80", 40, "auto")}
}
${linkSel(`html.${CURSOR_ROOT_CLASS}`)} {
  ${cursorImage("link-40", 20, "pointer")}
}
@media (max-width: 1339px) {
  html.${CURSOR_ROOT_CLASS},
  html.${CURSOR_ROOT_CLASS} * {
    ${cursorImage("ring-68", 34, "auto")}
  }
  ${linkSel(`html.${CURSOR_ROOT_CLASS}`)} {
    ${cursorImage("link-34", 17, "pointer")}
  }
}
@media (max-width: 1129px) {
  html.${CURSOR_ROOT_CLASS},
  html.${CURSOR_ROOT_CLASS} * {
    ${cursorImage("ring-56", 28, "auto")}
  }
  ${linkSel(`html.${CURSOR_ROOT_CLASS}`)} {
    ${cursorImage("link-28", 14, "pointer")}
  }
}
[data-hero-cursor] {
  --hero-cursor-size: 79px;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 60;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s linear;
  will-change: transform;
}
[data-hero-cursor][data-visible] {
  opacity: 1;
}
@media (max-width: 1339px) {
  [data-hero-cursor] {
    --hero-cursor-size: 67px;
  }
}
@media (max-width: 1129px) {
  [data-hero-cursor] {
    --hero-cursor-size: 55px;
  }
}
/* Positions the press disc inside the cursor image's 1.5 px ring (the ring itself is not drawn here). */
[data-hero-cursor-ring] {
  position: absolute;
  inset: calc(var(--hero-cursor-size) / -2);
  box-sizing: border-box;
  border: 1.5px solid transparent;
  border-radius: 50%;
  transition: inset 0.35s ${EASE_OUT};
}
[data-hero-cursor][data-link] [data-hero-cursor-ring] {
  inset: calc(var(--hero-cursor-size) * -0.2532);
}
[data-hero-cursor-disc] {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.51);
  opacity: 0;
  transform: scale(0);
}
@media (prefers-reduced-motion: reduce) {
  [data-hero-cursor-ring] {
    transition: none;
  }
}
`;

/**
 * Pale arctic veil with static frost blooms and a drifting, twinkling speck layer (one speck per
 * tile, eight co-prime tile sizes so the pattern never visibly repeats). The backdrop blur sits under
 * the veil, outside any element with opacity, so it still sees the scene while dissolving; it is only
 * switched on ("arm", under the opaque veil) for the beat before the dissolve, not during loading.
 */
export const LOADER_CSS = `
[data-hero-loader] {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: auto;
  color: #3d5577;
  font-family: var(--font-sans, "Space Grotesk"), "Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-user-select: none;
  user-select: none;
}
[data-hero-loader][data-state="out"] {
  pointer-events: none;
}
[data-hero-loader-blur],
[data-hero-loader-veil] {
  position: absolute;
  inset: 0;
}
[data-hero-loader][data-state] [data-hero-loader-blur] {
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}
[data-hero-loader-veil] {
  overflow: hidden;
  background:
    radial-gradient(40% 36% at 26% 28%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
    radial-gradient(34% 30% at 76% 68%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0)),
    radial-gradient(28% 24% at 62% 20%, rgba(222, 231, 242, 0.6), rgba(222, 231, 242, 0)),
    radial-gradient(140% 100% at 50% 42%, rgba(61, 85, 119, 0) 58%, rgba(61, 85, 119, 0.12)),
    linear-gradient(180deg, #e9eef5 0%, #bccadb 100%);
  transition: opacity ${LOADER_DISSOLVE_MS * 0.9}ms ${SOFT};
}
[data-hero-loader-frost] {
  position: absolute;
  inset: -32px;
  background-image:
    radial-gradient(1.2px 1.2px at 9px 13px, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0)),
    radial-gradient(0.9px 0.9px at 17px 5px, rgba(61, 85, 119, 0.14), rgba(61, 85, 119, 0)),
    radial-gradient(1.4px 1.4px at 22px 40px, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
    radial-gradient(0.9px 0.9px at 11px 21px, rgba(61, 85, 119, 0.14), rgba(61, 85, 119, 0)),
    radial-gradient(1px 1px at 51px 27px, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0)),
    radial-gradient(1.6px 1.6px at 6px 58px, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0)),
    radial-gradient(1px 1px at 70px 49px, rgba(61, 85, 119, 0.2), rgba(61, 85, 119, 0)),
    radial-gradient(1.1px 1.1px at 30px 9px, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0));
  background-size: 41px 37px, 23px 29px, 59px 61px, 31px 43px, 67px 71px, 79px 73px, 97px 89px, 53px 47px;
  animation: hero-loader-drift 14s ease-in-out infinite alternate, hero-loader-twinkle 3.6s ease-in-out infinite alternate;
}
[data-hero-loader-content] {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: opacity ${LOADER_DISSOLVE_MS * 0.7}ms ${SOFT}, transform ${LOADER_DISSOLVE_MS}ms ${SOFT};
}
[data-hero-loader-logo] {
  display: block;
  width: 38.18px;
  height: 44px;
}
[data-hero-loader-track] {
  position: relative;
  width: clamp(140px, 13.889vw, 200px);
  height: 1px;
  margin-top: 32px;
  overflow: hidden;
  background: rgba(61, 85, 119, 0.16);
}
[data-hero-loader-fill] {
  position: absolute;
  inset: 0;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: 0 50%;
}
[data-hero-loader-pct] {
  margin-top: 16px;
  padding-left: 0.08em;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
[data-hero-loader-pct] [data-dim] {
  opacity: 0.32;
}
[data-hero-loader][data-state="out"] [data-hero-loader-blur] {
  -webkit-backdrop-filter: blur(0px);
  backdrop-filter: blur(0px);
  transition: -webkit-backdrop-filter ${LOADER_DISSOLVE_MS}ms ${SOFT}, backdrop-filter ${LOADER_DISSOLVE_MS}ms ${SOFT};
}
[data-hero-loader][data-state="out"] [data-hero-loader-veil] {
  opacity: 0;
}
[data-hero-loader][data-state="out"] [data-hero-loader-content] {
  opacity: 0;
  transform: translate3d(0, -16px, 0);
}
@keyframes hero-loader-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-14px, -22px, 0); }
}
@keyframes hero-loader-twinkle {
  from { opacity: 0.4; }
  to { opacity: 0.85; }
}
@media (prefers-reduced-motion: reduce) {
  [data-hero-loader-frost] {
    animation: none;
    opacity: 0.6;
  }
  [data-hero-loader][data-state="out"] [data-hero-loader-content] {
    transform: none;
  }
}
`;

/**
 * The hide rule is only ever added by Reveal.ts, so the copy stays visible if the script never runs.
 * Masks clip with overflow:hidden but keep 0.12 em below the line box for descenders (line-height 1),
 * given back to the flow by the negative margin; a line at translateY(105%) still clears it.
 */
export const REVEAL_CSS = `
[data-reveal]:not([data-revealed]) {
  opacity: 0;
}
[data-reveal-mask] {
  display: block;
  overflow: hidden;
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}
[data-reveal-line] {
  display: block;
  white-space: nowrap;
}
`;

/** The container is the Figma 24 x 15 window; the 96 px wave inside scrolls by transform. */
export const SOUND_WAVE_CSS = `
[data-sound-wave] {
  overflow: hidden;
}
[data-sound-wave-svg] {
  display: block;
  flex: none;
  width: 96px;
  height: 15px;
  max-width: none;
  color: #fff;
  transform: translate3d(-24px, 0, 0);
  will-change: transform;
}
`;

const sheets = new Map<string, { node: HTMLStyleElement; users: number }>();

/**
 * Adds `<style data-hero-ui="id">` on first use (reusing one left over by hot reload) and removes it
 * when the last user releases it. Returns the idempotent release function.
 */
export function injectStyles(id: string, css: string): () => void {
  if (typeof document === "undefined") return () => {};
  let sheet = sheets.get(id);
  if (!sheet) {
    const existing = document.querySelector<HTMLStyleElement>(`style[data-hero-ui="${id}"]`);
    const node = existing ?? document.createElement("style");
    node.setAttribute("data-hero-ui", id);
    if (node.textContent !== css) node.textContent = css;
    if (!existing) (document.head ?? document.documentElement).appendChild(node);
    sheet = { node, users: 0 };
    sheets.set(id, sheet);
  }
  const entry = sheet;
  entry.users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--entry.users > 0) return;
    entry.node.remove();
    if (sheets.get(id) === entry) sheets.delete(id);
  };
}
