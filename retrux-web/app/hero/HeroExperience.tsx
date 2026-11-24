"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroEngine } from "./engine/HeroEngine";

/**
 * Mounts the real-time ice hero behind the Figma overlay. The engine, the UI
 * layer (loader, cursor, text reveal, sound) and the audio are framework-agnostic
 * modules; this component only wires them to the page and cleans up.
 */
export function HeroExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Static first-paint cover (server-rendered), dropped once the real loader has mounted.
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const loaderRoot = loaderRef.current;
    if (!canvas || !loaderRoot) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const [{ HeroEngine }, { Loader }, { revealHeroText }, { Cursor }, { mountSoundWave }, { SoundEngine }] = await Promise.all([
        import("./engine/HeroEngine"),
        import("./engine/ui/Loader"),
        import("./engine/ui/Reveal"),
        import("./engine/ui/Cursor"),
        import("./engine/ui/SoundWave"),
        import("./engine/audio/SoundEngine"),
      ]);
      if (disposed) return;

      const loader = new Loader(loaderRoot);
      cleanups.push(() => loader.dispose());
      setCovered(false);

      let engine: HeroEngine;
      try {
        engine = new HeroEngine({
          canvas,
          assetBase: "/hero/",
          onProgress: (p) => loader.setProgress(p),
          // The copy steps back while the sculpture is held (the dollied-in rings reach the headline).
          onHoldChange: (on) => document.documentElement.toggleAttribute("data-hero-hold", on),
        });
      } catch (err) {
        console.error(err);
        setFailed(true);
        await loader.finish();
        await revealHeroText(document);
        return;
      }
      cleanups.push(() => engine.dispose());

      const cursor = new Cursor(() => engine.state);
      cleanups.push(() => cursor.dispose());

      const sound = new SoundEngine(() => engine.state);
      cleanups.push(() => sound.dispose());
      const toggle = document.querySelector<HTMLButtonElement>("[data-sound-toggle]");
      const waveHost = document.querySelector<HTMLElement>("[data-sound-wave]");
      const wave = waveHost ? mountSoundWave(waveHost) : null;
      if (wave) cleanups.push(() => wave.dispose());
      // `enabled` stays false when Web Audio is missing, so the UI follows the engine, not the click.
      const syncSound = () => {
        wave?.setPlaying(sound.enabled);
        toggle?.setAttribute("aria-pressed", String(sound.enabled));
      };
      try {
        // A saved "on" is safe without a gesture: the context starts on the first interaction.
        if (localStorage.getItem("retrux:sound") === "1") void sound.setEnabled(true).then(syncSound);
      } catch {
        // Storage may be unavailable (private mode); start muted.
      }
      const onToggle = async () => {
        // setEnabled has to run inside the gesture, before any await.
        const pending = sound.setEnabled(!sound.enabled);
        syncSound();
        await pending;
        syncSound();
        try {
          localStorage.setItem("retrux:sound", sound.enabled ? "1" : "0");
        } catch {
          // Storage may be unavailable (private mode); the toggle still works.
        }
      };
      toggle?.addEventListener("click", onToggle);
      cleanups.push(() => toggle?.removeEventListener("click", onToggle));
      // UI ticks on links and buttons.
      const TICK_SEL = "a, button";
      const onOver = (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest?.(TICK_SEL);
        if (el && !el.contains(e.relatedTarget as Node | null)) sound.tick("hover");
      };
      const onClick = (e: MouseEvent) => {
        if ((e.target as Element | null)?.closest?.(TICK_SEL)) sound.tick("click");
      };
      document.addEventListener("pointerover", onOver);
      document.addEventListener("click", onClick);
      cleanups.push(() => {
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("click", onClick);
      });

      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        sound.update(Math.min(0.1, (now - last) / 1000));
        last = now;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanups.push(() => cancelAnimationFrame(raf));

      try {
        await engine.load();
        if (disposed) return;
        engine.start();
        // The copy rises while the loader dissolves.
        await Promise.all([loader.finish(), revealHeroText(document, { delay: 0.6 })]);
      } catch (err) {
        console.error(err);
        if (!disposed) {
          setFailed(true);
          await loader.finish();
          await revealHeroText(document);
        }
      }
    })();

    return () => {
      disposed = true;
      document.documentElement.removeAttribute("data-hero-hold");
      for (const c of cleanups.reverse()) c();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-hero-canvas
        tabIndex={0}
        aria-label="Ice sculpture above an arctic lake. Press and hold to look closer."
        className="fixed inset-0 z-0 block h-dvh w-screen outline-none"
        style={{ touchAction: "none", visibility: failed ? "hidden" : "visible" }}
      />
      {failed && (
        // Still poster when WebGL 2 is unavailable (not a video: a single frame of the scene).
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/hero/poster.webp" alt="" aria-hidden className="fixed inset-0 z-0 h-dvh w-screen object-cover" />
      )}
      {covered && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[49]"
          style={{ background: "linear-gradient(180deg, #e9eef5, #bccadb)" }}
        />
      )}
      <div ref={loaderRef} className="pointer-events-none fixed inset-0 z-50" />
    </>
  );
}
