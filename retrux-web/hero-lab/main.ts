import { HeroEngine } from "../app/hero/engine/HeroEngine";
import { SoundEngine } from "../app/hero/engine/audio/SoundEngine";
import { Cursor } from "../app/hero/engine/ui/Cursor";
import { InkText } from "../app/hero/engine/ui/Ink";
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

// P4 R4-Q1 (lane p4h4): HeroExperience.tsx's onHoldChange, so a hold in the lab takes the copy ([data-hero-copy]: the
// headline + subline, and "Scroll to Explore" in the bottom-centre slot of production's "Coming Soon") away like ink and the
// release brings it back, with data-hero-hold on <html>. The entrance stays the lab's own (revealHeroText). Captures read
// data-hero-ink: "shown" from the start, "out" / "in" while the ink runs, "gone" / "shown" once it has finished (the attribute's
// presence tells shoot_sweep.mjs that the ink is wired). `?p4h4=0` / `?labink=0`: off (no attribute, no ink).
const ink = params.get("p4h4") !== "0" && params.get("labink") !== "0" ? new InkText(() => Array.from(document.querySelectorAll<HTMLElement>("[data-hero-copy]"))) : null;
let inkRun = 0;
if (ink) document.documentElement.dataset.heroInk = "shown";
const onHoldChange = ink
  ? (on: boolean) => {
      const root = document.documentElement;
      root.toggleAttribute("data-hero-hold", on);
      const gen = ++inkRun;
      root.dataset.heroInk = on ? "out" : "in";
      void (on ? ink.out() : ink.in(0.05)).then(() => {
        if (gen === inkRun) root.dataset.heroInk = on ? "gone" : "shown";
      });
    }
  : undefined;

const engine = new HeroEngine({
  canvas,
  assetBase: "/hero/",
  debug,
  onProgress: (p) => loader.setProgress(p),
  onHoldChange,
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
