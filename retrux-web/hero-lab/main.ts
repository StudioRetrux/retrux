import { HeroEngine } from "../app/hero/engine/HeroEngine";
import { SoundEngine } from "../app/hero/engine/audio/SoundEngine";
import { Cursor } from "../app/hero/engine/ui/Cursor";
import { Loader } from "../app/hero/engine/ui/Loader";
import { revealHeroText } from "../app/hero/engine/ui/Reveal";
import { mountSoundWave } from "../app/hero/engine/ui/SoundWave";

/**
 * Lab entry: the engine and the real UI layer (loader, cursor, text reveal, sound) on the
 * plain-HTML replica of the Figma hero. Mirrors app/hero/HeroExperience.tsx.
 */

const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]")!;
const hud = document.querySelector<HTMLElement>("[data-hud]")!;
const params = new URLSearchParams(location.search);
const debug = params.has("debug");

const loader = new Loader(document.body);
document.querySelector("[data-cover]")?.remove();

const engine = new HeroEngine({
  canvas,
  assetBase: "/hero/",
  debug,
  onProgress: (p) => loader.setProgress(p),
});
(window as unknown as { __hero: HeroEngine }).__hero = engine;

new Cursor(() => engine.state);

// Sound: off by default; a saved "on" waits for the first gesture (browser autoplay rules).
const sound = new SoundEngine(() => engine.state);
const toggle = document.querySelector<HTMLButtonElement>("[data-sound-toggle]")!;
const waveHost = document.querySelector<HTMLElement>("[data-sound-wave]");
const wave = waveHost ? mountSoundWave(waveHost) : null;
const syncSound = () => {
  wave?.setPlaying(sound.enabled);
  toggle.setAttribute("aria-pressed", String(sound.enabled));
};
try {
  if (localStorage.getItem("retrux:sound") === "1") void sound.setEnabled(true).then(syncSound);
} catch {
  // Storage unavailable (private mode): start muted.
}
toggle.addEventListener("click", async () => {
  // setEnabled must run inside the gesture, before any await.
  const pending = sound.setEnabled(!sound.enabled);
  syncSound();
  await pending;
  syncSound();
  try {
    localStorage.setItem("retrux:sound", sound.enabled ? "1" : "0");
  } catch {
    // Not persisted; the toggle still works.
  }
});
// UI ticks on links and buttons.
const TICK_SEL = "a, button";
document.addEventListener("pointerover", (e) => {
  const el = (e.target as Element | null)?.closest?.(TICK_SEL);
  if (el && !el.contains(e.relatedTarget as Node | null)) sound.tick("hover");
});
document.addEventListener("click", (e) => {
  if ((e.target as Element | null)?.closest?.(TICK_SEL)) sound.tick("click");
});

engine
  .load()
  .then(async () => {
    engine.start();
    // The copy rises while the loader dissolves.
    await Promise.all([loader.finish(), revealHeroText(document, { delay: 0.6 })]);
    document.documentElement.dataset.heroReady = "1";
  })
  .catch(async (err) => {
    console.error(err);
    await loader.finish();
    await revealHeroText(document);
    document.documentElement.dataset.heroFailed = "1";
  });

if (debug) hud.style.display = "block";
addEventListener("keydown", (e) => {
  if (e.key === "d" && !(e.target instanceof HTMLInputElement)) hud.style.display = hud.style.display === "block" ? "none" : "block";
});
let prev = performance.now();
const tick = (now: number) => {
  sound.update(Math.min(0.1, (now - prev) / 1000));
  prev = now;
  if (hud.style.display === "block") {
    const s = engine.state;
    hud.textContent =
      `fps ${s.fps.toFixed(0)}  tier ${s.tier}  scale ${s.renderScale.toFixed(2)}\n` +
      `hover ${s.hover.toFixed(2)}  hold ${s.hold.toFixed(2)}  shatter ${s.shatter.toFixed(2)}\n` +
      `spin ${s.spin.toFixed(2)}  intro ${s.intro.toFixed(2)}  gpu ${engine.gpu}`;
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
