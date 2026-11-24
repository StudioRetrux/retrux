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
      const [{ HeroEngine }, { Loader }, { revealHeroText }, { Cursor }, { mountSoundWave }, { SoundEngine }, { InkText }] = await Promise.all([
        import("./engine/HeroEngine"),
        import("./engine/ui/Loader"),
        import("./engine/ui/Reveal"),
        import("./engine/ui/Cursor"),
        import("./engine/ui/SoundWave"),
        import("./engine/audio/SoundEngine"),
        import("./engine/ui/Ink"),
      ]);
      if (disposed) return;

      // The copy appears and leaves like ink on rice paper (start, press-and-hold, release).
      const ink = new InkText(() => Array.from(document.querySelectorAll<HTMLElement>("[data-hero-copy]")));
      cleanups.push(() => ink.dispose());
      ink.hideNow();
      // The copy enters with the ink alone ("ada lag or glitch di entrance animation text"): the line split and rise
      // under the ink filter rebuilt the headline mid-animation and doubled the per-frame work. Marked revealed here,
      // so revealHeroText only fades the nav, the logo and Sound in.
      for (const el of document.querySelectorAll<HTMLElement>("[data-hero-copy] [data-reveal]")) el.setAttribute("data-revealed", "");

      // Set once the sound engine exists: the hold callback is wired into the engine before it.
      let holdSound: ((on: boolean) => void) | null = null;

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
          onHoldChange: (on) => {
            document.documentElement.toggleAttribute("data-hero-hold", on);
            holdSound?.(on);
            if (on) void ink.out();
            else void ink.in(0.05);
          },
        });
      } catch (err) {
        console.error(err);
        // No WebGL 2 (the poster): the sound engine is never wired, so the Sound toggle would be a dead control.
        document.querySelector<HTMLElement>("[data-sound-toggle]")?.setAttribute("hidden", "");
        setFailed(true);
        await loader.finish();
        await Promise.all([revealHeroText(document), ink.in()]);
        return;
      }
      cleanups.push(() => engine.dispose());

      const cursor = new Cursor(() => engine.state);
      cleanups.push(() => cursor.dispose());

      // iOS Safari / Android: a long press is the hero's press-and-hold, never a text selection or a context menu
      // (globals.css also turns selection and the callout off; this covers older WebKit).
      const noSelect = (e: Event) => e.preventDefault();
      document.addEventListener("selectstart", noSelect);
      canvas.addEventListener("contextmenu", noSelect);
      cleanups.push(() => {
        document.removeEventListener("selectstart", noSelect);
        canvas.removeEventListener("contextmenu", noSelect);
      });

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
      // User, 19 Nov: every visit, refresh or new tab starts muted (no remembered choice); the Sound button or the
      // first interaction switches it on (22 Nov: any first click / key / tap, below; the hold path stays as a fallback). The press primes the context inside its gesture (silent), so the hold
      // can fade the sound in; an explicit toggle choice wins over later holds.
      let soundChosen = false;
      const onPrime = (e: PointerEvent) => {
        if (!soundChosen && !sound.enabled && e.isPrimary) sound.prime();
      };
      canvas.addEventListener("pointerdown", onPrime, { passive: true });
      cleanups.push(() => canvas.removeEventListener("pointerdown", onPrime));
      holdSound = (on) => {
        if (!on || soundChosen || sound.enabled) return;
        soundChosen = true;
        const pending = sound.setEnabled(true);
        syncSound();
        void pending.then(syncSound);
      };
      const onToggle = async () => {
        soundChosen = true;
        // setEnabled has to run inside the gesture, before any await.
        const pending = sound.setEnabled(!sound.enabled);
        syncSound();
        await pending;
        syncSound();
      };
      toggle?.addEventListener("click", onToggle);
      cleanups.push(() => toggle?.removeEventListener("click", onToggle));
      // Client, 22 Nov (desktop): "user pertama kali click dimana pun, click link or not ... or any interaction, itu trigger
      // sound on": the first mouse press anywhere (links included) or the first key press switches sound on inside that
      // gesture. Browsers only let audio start from a press, a key or a tap, so hover and scroll cannot. The Sound toggle
      // handles its own clicks (an explicit choice wins); every visit still starts muted.
      const isToggle = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("[data-sound-toggle]");
      const autoOn = () => {
        soundChosen = true;
        const pending = sound.setEnabled(true);
        syncSound();
        void pending.then(syncSound);
      };
      const onFirstPress = (e: PointerEvent) => {
        // Touch presses are handled on the finger lift below (iOS only starts audio there).
        if (soundChosen || sound.enabled || e.pointerType === "touch" || isToggle(e.target)) return;
        autoOn();
      };
      const NOT_INTERACTION = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "Escape", "Fn"]);
      const onFirstKey = (e: KeyboardEvent) => {
        if (soundChosen || sound.enabled || e.metaKey || e.ctrlKey || e.altKey || NOT_INTERACTION.has(e.key)) return;
        if (isToggle(e.target)) return;
        autoOn();
      };
      document.addEventListener("pointerdown", onFirstPress, { capture: true, passive: true });
      document.addEventListener("keydown", onFirstKey, { capture: true });
      cleanups.push(() => {
        document.removeEventListener("pointerdown", onFirstPress, { capture: true });
        document.removeEventListener("keydown", onFirstKey, { capture: true });
      });
      // Touch screens (client, 22 Nov: "pas press and hold or tap anywhere akan nyalain sound"): iOS only lets audio start on a
      // finger lift, so the first tap anywhere (or the lift that ends the first press-and-hold) switches sound on inside that
      // gesture; later lifts re-unlock it if iOS suspended it. Taps on links count too (same as desktop, 22 Nov); the Sound
      // toggle handles its own taps; a drag is not a tap. Every visit still starts muted.
      if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
        let tx = 0;
        let ty = 0;
        const onTouchStart = (e: TouchEvent) => {
          const t = e.changedTouches[0];
          if (t) {
            tx = t.clientX;
            ty = t.clientY;
          }
        };
        const onTouchEnd = (e: TouchEvent) => {
          if (isToggle(e.target)) return;
          const t = e.changedTouches[0];
          const moved = t ? Math.hypot(t.clientX - tx, t.clientY - ty) : 0;
          if (!soundChosen && !sound.enabled) {
            if (moved > 14) return;
            soundChosen = true;
            const pending = sound.setEnabled(true);
            syncSound();
            void pending.then(syncSound);
          } else {
            sound.gesture();
          }
        };
        document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
        document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
        cleanups.push(() => {
          document.removeEventListener("touchstart", onTouchStart, { capture: true });
          document.removeEventListener("touchend", onTouchEnd, { capture: true });
        });
      }
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
        // User, 19 Nov: the text appears as the camera's entrance move settles, never with it ("jangan barengan"),
        // then "agak lebih awal dikit": it starts at 90 % of the eased move (~0.35 s before the end, the camera is
        // nearly still there). The loader dissolves first (12 s safety cap).
        // Phones / tablets ("di mobile kemunculannya kelamaan, majuin sedikit dari desktop"): at 72 % of the move.
        const mobile = typeof matchMedia === "function" && matchMedia("(max-width: 767px), (pointer: coarse)").matches;
        const introAt = mobile ? 0.72 : 0.9;
        const introDone = new Promise<void>((resolve) => {
          const t0 = performance.now();
          const poll = () => {
            if (disposed || engine.state.intro >= introAt || performance.now() - t0 > 12000) resolve();
            else requestAnimationFrame(poll);
          };
          poll();
        });
        await Promise.all([loader.finish(), introDone]);
        if (disposed) return;
        await Promise.all([revealHeroText(document, { delay: 0.05 }), ink.in(0.05)]);
      } catch (err) {
        console.error(err);
        if (!disposed) {
          setFailed(true);
          await loader.finish();
          await Promise.all([revealHeroText(document), ink.in()]);
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
