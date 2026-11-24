import { ease, lerp } from "../math";
import { injectStyles, SOUND_WAVE_CSS } from "./styles";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Figma "Wave": a 24 x 15 window over a 96 px sine with a 24 px wavelength. */
const WAVELENGTH = 24;
const WIDTH = 96;
const HEIGHT = 15;
/**
 * Amplitude in px. User, 19 Nov: "kalo ga nyala ensure gelombangnya jadi garis, pas nyala gelombang iconnya do as is,
 * ensure seamless perubahan bentuknya": muted is a flat line (a hair above 0: an exactly singular scale can drop
 * the non-scaling stroke), playing is the scrolling wave as before; the wave flattens / grows while the scroll
 * slows / speeds up, one eased morph.
 */
const AMP_ON = 2.6;
const AMP_OFF = 0.001;
/** Seconds per wavelength of scroll while playing. */
const PERIOD = 1.1;
/** Play / mute morph, seconds. */
const TRANSITION = 0.6;

export type SoundWave = {
  /** Eases between the scrolling wave (true) and the still, near-flat line (false). */
  setPlaying(on: boolean): void;
  dispose(): void;
};

/**
 * Unit-amplitude sine from x = 0 to WIDTH, one cubic per half wave. Control points at 4/(3 pi) of the
 * half wave and 4/3 high match the sine's peak and zero-crossing slope exactly.
 */
function sinePath() {
  const half = WAVELENGTH / 2;
  const cx = (half * 4) / (3 * Math.PI);
  const cy = 4 / 3;
  const n = (v: number) => +v.toFixed(3);
  let d = `M0 0C${n(cx)} ${n(-cy)} ${n(half - cx)} ${n(-cy)} ${half} 0`;
  for (let x = half, sign = 1; x < WIDTH; x += half, sign = -sign) d += `S${n(x + half - cx)} ${n(sign * cy)} ${x + half} 0`;
  return d;
}

/**
 * Mounts the Figma "Wave" icon in `container` (the 24 x 15 clip window): a white 1.5 px sine that
 * scrolls in a seamless loop while playing and flattens into a straight line when muted. Starts
 * muted; the rAF loop only runs while scrolling or transitioning.
 */
export function mountSoundWave(container: HTMLElement): SoundWave {
  const releaseStyles = injectStyles("sound-wave", SOUND_WAVE_CSS);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("data-sound-wave-svg", "");
  svg.setAttribute("width", String(WIDTH));
  svg.setAttribute("height", String(HEIGHT));
  svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const group = document.createElementNS(SVG_NS, "g");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", sinePath());
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  // The amplitude is a vertical scale of the group; the stroke stays 1.5 px and round.
  path.setAttribute("vector-effect", "non-scaling-stroke");
  group.appendChild(path);
  svg.appendChild(group);
  container.appendChild(svg);

  const reducedMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let playing = false;
  let disposed = false;
  let amp = AMP_OFF;
  let speed = 0;
  let phase = 0;
  let fromAmp = amp;
  let toAmp = amp;
  let fromSpeed = 0;
  let toSpeed = 0;
  let t = TRANSITION;
  let raf = 0;
  let last = 0;

  const drawAmp = () => group.setAttribute("transform", `translate(0 ${HEIGHT / 2}) scale(1 ${amp.toFixed(3)})`);
  // The window shows x in [24, 48] + phase, never the path's end caps.
  const drawPhase = () => {
    svg.style.transform = `translate3d(${(-WAVELENGTH - phase).toFixed(2)}px, 0, 0)`;
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (t < TRANSITION) {
      t = Math.min(TRANSITION, t + dt);
      const k = ease.inOutCubic(t / TRANSITION);
      amp = lerp(fromAmp, toAmp, k);
      speed = lerp(fromSpeed, toSpeed, k);
      drawAmp();
    }
    if (speed > 0) {
      phase = (phase + speed * dt) % WAVELENGTH;
      drawPhase();
    }
    if (t < TRANSITION || speed > 0) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const setPlaying = (on: boolean) => {
    if (disposed || on === playing) return;
    playing = on;
    toAmp = on ? AMP_ON : AMP_OFF;
    if (reducedMotion?.matches) {
      // No scrolling, instant change.
      amp = fromAmp = toAmp;
      speed = fromSpeed = toSpeed = 0;
      t = TRANSITION;
      drawAmp();
      return;
    }
    toSpeed = on ? WAVELENGTH / PERIOD : 0;
    fromAmp = amp;
    fromSpeed = speed;
    t = 0;
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    svg.remove();
    releaseStyles();
  };

  drawAmp();
  drawPhase();
  return { setPlaying, dispose };
}
