"use client";

/** Figma "D/Home - Coming Soon" (2979:1492): the nav's right side holds the Instagram handle and the e-mail. */
// Figma 2979:1515 shows the handle without the "@" (client, 21 Nov: "IG '@' nya ilangin aja").
const INSTAGRAM = { label: "retruxstd", href: "https://www.instagram.com/retruxstd/" };
const EMAIL = { label: "hello@retrux.com", href: "mailto:hello@retrux.com" };

/*
 * Sizes are the Figma frame's (1440 x 766) at that size and scale down fluidly below it:
 * padding 56 px, nav top 40 px, H1 64 px / 614 px wide, subline 20 px / 460.5 px wide.
 */
const PAD = "clamp(20px, 3.889vw, 56px)";

/** wearemasa.com link hover: the label rolls up and an identical copy rolls in from below (globals.css .rx-roll). */
function Roll({ children }: { children: string }) {
  const move = "block transition-transform duration-[550ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none";
  return (
    <span className="relative -my-[0.1em] inline-block overflow-hidden align-top leading-[1.2]">
      <span className={`${move} group-hover:-translate-y-full group-focus-visible:-translate-y-full`}>{children}</span>
      <span aria-hidden className={`${move} absolute inset-0 translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0`}>
        {children}
      </span>
    </span>
  );
}

export function ChromeNav() {
  return (
    <header
      className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center justify-between"
      style={{ paddingLeft: PAD, paddingRight: PAD, paddingTop: "clamp(20px, 2.778vw, 40px)" }}
    >
      {/* Not draggable: a trackpad tap-drag starting here began native drag-and-drop, which swallows
          pointer events until the drop and left the hero's cursor stranded. */}
      <a href="/" aria-label="Retrux home" className="flex items-center" data-reveal="fade" draggable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/retrux-logo.svg"
          alt="Retrux"
          width={33}
          height={38}
          className="h-[38px] w-[32.976px]"
          draggable={false}
        />
      </a>
      <nav
        className="flex items-center text-base font-medium leading-none text-[color:var(--color-w-90)]"
        style={{ gap: "clamp(16px, 2.222vw, 32px)" }}
      >
        <a
          href={INSTAGRAM.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex translate-y-px items-center gap-2"
          data-reveal="fade"
          draggable={false}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/instagram.svg" alt="" aria-hidden width={16} height={16} className="block size-4" draggable={false} />
          <Roll>{INSTAGRAM.label}</Roll>
        </a>
        <a href={EMAIL.href} className="group translate-y-px" data-reveal="fade" draggable={false}>
          <Roll>{EMAIL.label}</Roll>
        </a>
      </nav>
    </header>
  );
}

function HeroGradientOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(64, 95, 137, 0.16) 0%, rgba(64, 95, 137, 0) 15.953%, rgba(64, 95, 137, 0) 74.668%, rgba(64, 95, 137, 0.16) 100%)",
      }}
    />
  );
}

export function HeroSection() {
  return (
    <section
      className="pointer-events-none relative flex h-dvh w-full flex-col"
      style={{ ["--pad" as string]: PAD }}
    >
      <HeroGradientOverlay />

      {/* On narrow screens the copy sits above the bottom row (Sound button). */}
      <div
        data-hero-copy
        className="pointer-events-none absolute bottom-0 left-0 z-10 flex flex-col items-start gap-4 pb-[var(--pad)] pl-[var(--pad)] max-sm:pb-[calc(var(--pad)+40px)]"
      >
        <h1
          className="font-medium leading-none text-[color:var(--color-w-90)]"
          // 64 px at 1440 x 766; smaller on narrow or short (landscape phone) viewports.
          style={{ fontSize: "clamp(32px, min(4.4444vw, 8.36vh), 64px)", width: "min(614px, calc(100vw - 2 * var(--pad)))" }}
          data-reveal="lines"
        >
          Ridiculously innovative studio{" "}
          {/* Phones (< 640 px): no forced break after "studio", the headline wraps naturally (user, 19 Nov). */}
          <br className="max-sm:hidden" />
          for humankind
        </h1>
        <p
          // 460.5 px at the Figma size; never reaches the centred "Scroll to Explore" (hidden < 640 px).
          className="w-[min(460.5px,calc(100vw_-_2_*_var(--pad)))] font-normal leading-none text-[color:var(--color-w-100)] sm:w-[min(460.5px,calc(50vw_-_var(--pad)_-_90px))]"
          style={{ fontSize: "clamp(16px, 1.3889vw, 20px)" }}
          data-reveal="lines"
        >
          Crafting immersive, interactive,{" "}
          {/* Desktop: two lines as in Figma 2979:1498 ("impossibly" starts the second line; client, 21 Nov); phones wrap
              naturally (< 640 px), like the headline. */}
          <br className="max-sm:hidden" />
          impossibly alive digital experiences.
        </p>
      </div>

      {/* Figma 2979:1504: centred at the bottom; on phones it takes the bottom-left slot beside Sound. The ink
          animation takes it away with the copy while the sculpture is held (data-hero-copy). */}
      <div
        data-hero-copy
        className="pointer-events-none absolute bottom-0 left-[var(--pad)] z-10 pb-[var(--pad)] sm:left-1/2 sm:-translate-x-1/2"
      >
        <span className="inline-block translate-y-px whitespace-nowrap text-base font-medium leading-none text-[color:var(--color-w-90)]" data-reveal="fade">
          Coming Soon
        </span>
      </div>

      <button
        type="button"
        aria-label="Toggle sound"
        aria-pressed="false"
        data-sound-toggle
        data-reveal="fade"
        // The hand cursor like the nav links (client, 21 Nov: "hovering the sound ... mirip pas hover link ig sama email").
        className="group pointer-events-auto absolute bottom-0 right-0 z-10 flex cursor-pointer items-center gap-2 pb-[var(--pad)] pr-[var(--pad)]"
      >
        {/* Figma "Wave": a 24x15 window over an animated sine (mounted by ui/SoundWave). */}
        <span data-sound-wave aria-hidden className="block h-[15px] w-[24px] overflow-hidden" />
        {/* 1 px lower than the leading-none box: on Figma's baseline (QC round 1). */}
        <span className="translate-y-px text-base font-medium leading-none text-white">
          <Roll>Sound</Roll>
        </span>
      </button>
    </section>
  );
}

const STATE_SECTIONS = [
  {
    eyebrow: "STATE 02",
    title: "Stillness",
    body: "A quiet center. Symmetric rings hold an inner light steady above the ice.",
  },
  {
    eyebrow: "STATE 03",
    title: "Tilt",
    body: "Geometry leans into a soft orbit. Disc planes catch sunrise off the peaks.",
  },
  {
    eyebrow: "STATE 04",
    title: "Collapse",
    body: "Shells fold inward — the system condenses, the core grows brighter.",
  },
  {
    eyebrow: "STATE 05",
    title: "Expand",
    body: "Rings break outward and shards spin wide. A controlled detonation.",
  },
];

export function StateSections() {
  return (
    <>
      {STATE_SECTIONS.map((s, i) => (
        <section
          key={s.eyebrow}
          className="relative flex h-screen w-full items-end p-6 md:p-10"
        >
          <div className="pointer-events-none max-w-md">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">
              {s.eyebrow}
            </div>
            <h2 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
              {s.title}
            </h2>
            <p className="mt-4 text-sm text-white/70 md:text-base">{s.body}</p>
          </div>
          <div className="pointer-events-none ml-auto self-start text-[11px] uppercase tracking-[0.2em] text-white/40">
            {String(i + 2).padStart(2, "0")} / 05
          </div>
        </section>
      ))}
    </>
  );
}

export function FooterSection() {
  return (
    <section
      id="contact"
      className="relative flex h-screen w-full items-end justify-between p-6 md:p-10"
    >
      <div className="pointer-events-none max-w-md">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">
          Contact
        </div>
        <h2 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          Let&apos;s build
          <br />
          something rare.
        </h2>
        <a
          href="mailto:hello@retrux.studio"
          className="pointer-events-auto mt-4 inline-block text-sm text-white/80 underline-offset-4 hover:text-white"
        >
          <Roll>hello@retrux.studio</Roll>
        </a>
      </div>
      <div className="pointer-events-none text-[11px] uppercase tracking-[0.2em] text-white/40">
        © Retrux 2026
      </div>
    </section>
  );
}
