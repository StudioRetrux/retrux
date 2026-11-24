import { clamp, smoothstep } from "../math";
import type { HeroState } from "../types";

/**
 * Procedural sound for the ice hero, built from plain Web Audio nodes: no audio
 * files, no ScriptProcessor, no worklets. Muted until `setEnabled(true)`; the
 * host calls `update(dt)` every animation frame and the bed follows HeroState.
 *
 * Routing
 *   wind, water lap, creak -> ambience (duck + low-pass) -> bus
 *   hum, shimmer, tension, one-shots ---------------------> bus
 *   bus -> limiter (DynamicsCompressor) -> master -> destination
 *   bus -> wet send -> high-pass 180 Hz -> convolution reverb -> limiter
 *   One-shots also feed the reverb directly; the distant creak is mostly reverb.
 *
 * Mix: approximate levels at the bus in dBFS (noise as RMS, tones as peak). Below
 * its threshold the limiter's automatic make-up adds ~4 dB and the default master
 * (0.8) takes ~2 dB off, so the output sits ~2 dB above these figures.
 *   Bed      wind low      brown noise, BP 230-610 Hz        -38 RMS, gusts +3 / -5 dB
 *            wind high     pink noise, BP 0.9-2 kHz          -40 RMS, gusts +3 / -4 dB
 *            water lap     brown, BP 0.3-0.9 kHz + fizz      -36 RMS at the crest, every 3-7 s
 *            ice creak     FM chirp + crack, mostly reverb   -26 peak into the reverb, dry -36, every 15-40 s
 *            orb hum       110 Hz beating pair + fifth       -32 RMS, -27 hovered, -25 holding
 *            shimmer       pink, BP 2.9-5.8 kHz with spin    -46 RMS when the rings line up (HeroState.alignment), -51 between
 *   Events   press tink    two inharmonic partials           -24 peak
 *            hold tension  rising noise band + glass tones   up to -27 RMS
 *            shatter hit   5 resonators + crunch + sub       about -12 peak (the limiter takes the rest)
 *            reassemble    3-4 FM bells, A-major pentatonic  -24 peak each, 2-3 s decay
 *            UI ticks      hover / click                     -32 / -27 peak
 *   Space    3 s stereo noise reverb (RT60 2.6 s): bus send -11 dB, one-shot send -6 dB.
 *            At full slow-motion the ambience ducks 4 dB behind a 2 kHz low-pass.
 *   Limiter  threshold -10 dB, knee 6 dB, ratio 12, attack 3 ms, release 250 ms.
 *
 * Reduced motion halves the shatter hit (one debris ping, no sub thump) and caps the
 * tension at 70 %. Hover ticks are ignored for touch pointers and (hover: none) devices.
 */

const db = (v: number) => Math.pow(10, v / 20);
const cents = (c: number) => Math.pow(2, c / 1200);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pickIndex = (n: number) => Math.floor(Math.random() * n);
const running = (ctx: BaseAudioContext) => ctx.state === "running";

/** Layer gains in dB re. a unity source: sine peak 1, or the noise buffers at NOISE_RMS. */
const MIX = {
  windLow: db(-18),
  windHigh: db(-18),
  lapLow: db(-15),
  lapFizz: db(-18),
  creak: db(-26),
  crack: db(-16),
  hum: db(-31),
  humFifth: db(-10),
  shimmer: db(-19),
  tink: db(-24),
  tickHover: db(-32),
  tickClick: db(-27),
  tensionNoise: db(0),
  tensionTone: db(-28),
  shatterModes: db(-14),
  shatterCrunch: db(-14),
  debris: db(-30),
  thump: db(-16),
  chime: db(-24),
  wet: db(-11),
  send: db(-6),
};

const NOISE_SECONDS = 2;
const NOISE_RMS = 0.2;
/** One-shots start this far ahead, so their attack ramps are never cut short. */
const LOOKAHEAD = 0.02;
/** Envelope tails run this many time constants (about -60 dB) before their source stops. */
const TAIL = 7;
const CONTROL_DT = 1 / 30;
const MAX_LIVE = 14;
const TICK_GAP = 0.4;
const FADE_IN = 0.6;
const FADE_OUT = 0.45;
const RESUME_TIMEOUT_MS = 500;

const REVERB = { seconds: 3, rt60: 2.6, predelay: 0.018, build: 0.045 };
/** Wind gusts and stereo drift share the first two LFOs; the third is the hum's breath. */
const LFO_HZ = [0.071, 0.113, 0.089];
const WIND = [
  { hz: 420, q: 0.8, sweep: 190, gust: 0.45, pan: -0.45, level: MIX.windLow },
  { hz: 1450, q: 1.5, sweep: 520, gust: 0.35, pan: 0.45, level: MIX.windHigh },
];
const WIND_DRIFT = 0.25;
const AMB_OPEN_HZ = 18000;
const AMB_SHUT_HZ = 2000;
const HUM = { hz: 110, beatCents: 12, fifthCents: 2, breath: 0.28, slowCents: -40 };
/** Near-sine: faint 2nd-4th harmonics so laptop and phone speakers still carry the 110 Hz pitch. */
const HUM_HARMONICS = [0, 1, 0.22, 0.1, 0.045];
const TENSION_HZ = 880;
/** Inharmonic ice spectrum (ratios to the lowest mode) and mode weights. */
const ICE_MODES = [1, 1.531, 2.087, 2.756, 3.394];
const ICE_WEIGHTS = [1, 0.85, 0.7, 0.55, 0.45];
const BURST_SECONDS = 0.3;
/** A-major pentatonic over the A2 / E3 hum. */
const CHIME_HZ = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760, 1975.53];
const TINK_HZ = [1760, 1975.53, 2217.46];
type Tick = readonly [hz: number, ratio: number, tau: number];
/** UI ticks, [hover, click], three variants each: glints, and lower taps with a droplet bend. */
const TICKS: readonly (readonly Tick[])[] = [
  [[2637.02, 2.76, 0.035], [2959.96, 2.32, 0.03], [3520, 2.53, 0.026]],
  [[1318.51, 2.76, 0.07], [1479.98, 2.41, 0.06], [1760, 3.01, 0.055]],
];
const LISTEN: AddEventListenerOptions = { capture: true, passive: true };
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "keydown", "touchend"] as const;

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  bus: GainNode;
  /** Ambience sub-bus: ducked and low-passed while the hold slows the rings. */
  amb: GainNode;
  /** Extra reverb send for the one-shots. */
  send: GainNode;
  /** Reverb input without a dry path, for distant sounds. */
  verbIn: AudioNode;
  pink: AudioBuffer;
  bursts: Float32Array[];
  ambOpenHz: number;
  water: { src: AudioBufferSourceNode; band: BiquadFilterNode; low: GainNode; fizz: GainNode; pan: AudioParam | null };
  humLevel: Ctl;
  humFifth: Ctl;
  humPitch: Ctl;
  shimmer: Ctl;
  shimmerHz: Ctl;
  ambLevel: Ctl;
  ambHz: Ctl;
};

type Tension = {
  voice: Voice;
  sources: AudioScheduledSourceNode[];
  gains: GainNode[];
  noise: Ctl;
  noiseHz: Ctl;
  tone: Ctl;
  hz: Ctl;
  beat: Ctl;
  glass: Ctl;
};

/** AudioParams steered from the control loop; redundant automation events are skipped. */
class Ctl {
  private last = Number.NaN;
  private params: AudioParam[];

  constructor(
    private tau: number,
    private eps: number,
    ...params: AudioParam[]
  ) {
    this.params = params;
  }

  to(v: number, t: number) {
    if (Math.abs(v - this.last) < this.eps) return;
    this.last = v;
    for (let i = 0; i < this.params.length; i++) this.params[i].setTargetAtTime(v, t, this.tau);
  }
}

/** A one-shot's nodes; all are disconnected once the source that stops last has ended. */
class Voice {
  private nodes: AudioNode[] = [];
  private last: AudioScheduledSourceNode | null = null;
  private end = -Infinity;

  add<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  /** Schedules the stop of a started source. */
  until(src: AudioScheduledSourceNode, stop: number) {
    src.stop(stop);
    this.nodes.push(src);
    if (stop > this.end) {
      this.end = stop;
      this.last = src;
    }
  }

  finish(done: () => void) {
    const release = () => {
      for (const n of this.nodes) n.disconnect();
      done();
    };
    if (this.last) this.last.onended = release;
    else release();
  }
}

function gainNode(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/** Note: Web Audio reads Q in dB for low-pass / high-pass (-3 = Butterworth), linearly for band-pass. */
function filterNode(ctx: BaseAudioContext, type: BiquadFilterType, hz: number, q: number) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  return f;
}

function oscNode(ctx: BaseAudioContext, hz: number, wave?: PeriodicWave) {
  const o = ctx.createOscillator();
  if (wave) o.setPeriodicWave(wave);
  o.frequency.value = hz;
  return o;
}

/** Looping noise from a random point of the buffer, started at `t`. */
function loopSource(ctx: BaseAudioContext, buffer: AudioBuffer, rate: number, t: number) {
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.playbackRate.value = rate;
  s.start(t, Math.random() * buffer.duration);
  return s;
}

/** StereoPannerNode, or a pass-through gain on legacy webkitAudioContext. */
function pannerNode(ctx: BaseAudioContext, pan: number): StereoPannerNode | GainNode {
  if (typeof ctx.createStereoPanner !== "function") return ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(pan, -1, 1);
  kRate(p.pan);
  return p;
}

const panOf = (node: StereoPannerNode | GainNode) => ("pan" in node ? node.pan : null);

/** Block-rate automation: filters and panners recompute once per 128 frames, not per sample. */
function kRate(p: AudioParam) {
  try {
    if ("automationRate" in p) p.automationRate = "k-rate";
  } catch {
    // Some params have a fixed rate; the default is fine there.
  }
}

/** Adds `depth` x lfo to a param. */
function modulate(ctx: BaseAudioContext, lfo: AudioNode, param: AudioParam, depth: number) {
  const d = gainNode(ctx, depth);
  lfo.connect(d);
  d.connect(param);
}

/** 0 -> peak in `attack` s, then an exponential tail with time constant `tau`. */
function envelope(p: AudioParam, t: number, attack: number, peak: number, tau: number) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setTargetAtTime(0, t + attack, tau);
}

/** Retargets a param smoothly from wherever it is now. */
function glide(p: AudioParam, v: number, t: number, tau: number) {
  p.cancelScheduledValues(t);
  p.setTargetAtTime(v, t, tau);
}

/** Rises towards `peak` over ~`rise` s, then relaxes to `rest`; setTarget only, so overlapping swells never jump. */
function swell(p: AudioParam, peak: number, t: number, rise: number, fall: number, rest = 0) {
  glide(p, peak, t, rise / 3);
  p.setTargetAtTime(rest, t + rise, fall);
}

/** 2 s of looping stereo noise at NOISE_RMS; the overhang is crossfaded into the head, so the loop has no seam. */
function noiseBuffer(ctx: BaseAudioContext, color: "pink" | "brown"): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * NOISE_SECONDS);
  const fade = Math.floor(sr * 0.08);
  const buf = ctx.createBuffer(2, n, sr);
  const raw = new Float32Array(n + fade);
  for (let ch = 0; ch < 2; ch++) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (color === "pink") {
        // Paul Kellet's refined pink filter.
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
      } else {
        // Leaky integrator: -6 dB / octave above ~150 Hz.
        b0 = (b0 + 0.02 * w) / 1.02;
        raw[i] = b0;
      }
    }
    const out = buf.getChannelData(ch);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = (i / fade) * Math.PI * 0.5;
      const v = i < fade ? raw[i] * Math.sin(x) + raw[n + i] * Math.cos(x) : raw[i];
      out[i] = v;
      sum += v * v;
    }
    const k = NOISE_RMS / Math.sqrt(sum / n || 1);
    for (let i = 0; i < n; i++) out[i] *= k;
  }
  return buf;
}

/** Stereo reverb impulse: decorrelated noise with pre-delay, a soft build-up and a decay that darkens; unit energy per channel. */
function impulseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * REVERB.seconds);
  const pre = Math.floor(sr * REVERB.predelay);
  const buf = ctx.createBuffer(2, n, sr);
  const decay = Math.exp(-6.9078 / (REVERB.rt60 * sr)); // -60 dB after rt60
  const build = Math.exp(-1 / (REVERB.build * sr));
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let env = 1, rise = 1, lp = 0, a = 0, energy = 0;
    for (let i = pre; i < n; i++) {
      // Air absorption: a one-pole low-pass sliding from ~11 kHz towards 2 kHz.
      if ((i - pre) % 256 === 0) a = Math.exp((-2 * Math.PI * (2000 + 9000 * Math.exp(((pre - i) / sr) * 1.2))) / sr);
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      const v = lp * env * (1 - rise);
      d[i] = v;
      energy += v * v;
      env *= decay;
      rise *= build;
    }
    const k = 1 / Math.sqrt(energy || 1);
    for (let i = pre; i < n; i++) d[i] *= k;
  }
  return buf;
}

/** Shatter excitation envelope: a loud first crack and 2-4 smaller ones, 0..1, starting and ending at 0. */
function burstCurve(points = 600): Float32Array {
  const c = new Float32Array(points);
  const dt = BURST_SECONDS / (points - 1);
  const bursts = 3 + pickIndex(3);
  let at = 0;
  let amp = 1;
  for (let b = 0; b < bursts; b++) {
    const tau = b === 0 ? rand(0.012, 0.02) : rand(0.004, 0.01);
    for (let i = Math.ceil(at / dt); i < points; i++) {
      const x = i * dt - at;
      c[i] += amp * (x < 0.0012 ? x / 0.0012 : Math.exp(-(x - 0.0012) / tau));
    }
    at += rand(0.012, 0.055);
    amp *= rand(0.35, 0.7);
  }
  let peak = 0;
  for (let i = 0; i < points; i++) peak = Math.max(peak, c[i]);
  const fade = Math.floor(points * 0.1);
  for (let i = 0; i < points; i++) c[i] = (c[i] / peak) * Math.min(1, (points - 1 - i) / fade);
  c[0] = 0;
  return c;
}

/** AudioContext, or webkitAudioContext on old Safari; null without Web Audio. */
function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor({ latencyHint: "balanced" });
  } catch {
    try {
      return new Ctor();
    } catch {
      return null;
    }
  }
}

function closeContext(ctx: AudioContext) {
  try {
    ctx.close().catch(() => undefined);
  } catch {
    // Legacy contexts without close() go away with the page.
  }
}

/** The persistent graph: buses, reverb, limiter and the always-on bed. */
function buildGraph(ctx: AudioContext): Graph {
  const t = ctx.currentTime;
  const pink = noiseBuffer(ctx, "pink");
  const brown = noiseBuffer(ctx, "brown");

  const master = gainNode(ctx, 0);
  master.connect(ctx.destination);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  limiter.connect(master);

  const reverb = ctx.createConvolver();
  reverb.normalize = false; // the impulse is generated at unit energy
  reverb.buffer = impulseBuffer(ctx);
  reverb.connect(limiter);
  // Keeps the hum and the thump out of the tail.
  const verbIn = filterNode(ctx, "highpass", 180, -3);
  verbIn.connect(reverb);

  const bus = gainNode(ctx, 1);
  bus.connect(limiter);
  const wet = gainNode(ctx, MIX.wet);
  bus.connect(wet);
  wet.connect(verbIn);
  const send = gainNode(ctx, MIX.send);
  send.connect(verbIn);

  const ambOpenHz = Math.min(AMB_OPEN_HZ, ctx.sampleRate * 0.45);
  const ambLow = filterNode(ctx, "lowpass", ambOpenHz, -3);
  kRate(ambLow.frequency);
  ambLow.connect(bus);
  const amb = gainNode(ctx, 1);
  amb.connect(ambLow);

  const lfo = LFO_HZ.map((hz) => oscNode(ctx, hz));
  const pinkLoop = loopSource(ctx, pink, 1, t);
  const brownLoop = loopSource(ctx, brown, 0.94, t);
  const waterLoop = loopSource(ctx, brown, 0.85, t);
  // A slow +-3 % speed wobble keeps the 2 s loops from ever repeating audibly (water re-pitches per lap).
  modulate(ctx, lfo[2], pinkLoop.playbackRate, 0.03);
  modulate(ctx, lfo[1], brownLoop.playbackRate, 0.03);

  // Wind: each layer gusts (band centre and level) on its own LFO and drifts in stereo on the other.
  WIND.forEach((w, i) => {
    const band = filterNode(ctx, "bandpass", w.hz, w.q);
    kRate(band.frequency);
    const level = gainNode(ctx, w.level);
    const pan = pannerNode(ctx, w.pan);
    (i === 0 ? brownLoop : pinkLoop).connect(band);
    band.connect(level);
    level.connect(pan);
    pan.connect(amb);
    modulate(ctx, lfo[i], band.frequency, w.sweep);
    modulate(ctx, lfo[i], level.gain, w.level * w.gust);
    const p = panOf(pan);
    if (p) modulate(ctx, lfo[1 - i], p, WIND_DRIFT * Math.sign(w.pan));
  });

  // Water lap: one persistent voice, re-enveloped by SoundEngine.lap().
  const lapBand = filterNode(ctx, "bandpass", 280, 0.9);
  kRate(lapBand.frequency);
  const lapLow = gainNode(ctx, 0);
  const fizzBand = filterNode(ctx, "bandpass", 2200, 1.2);
  const lapFizz = gainNode(ctx, 0);
  const lapPan = pannerNode(ctx, 0);
  waterLoop.connect(lapBand);
  lapBand.connect(lapLow);
  lapLow.connect(lapPan);
  waterLoop.connect(fizzBand);
  fizzBand.connect(lapFizz);
  lapFizz.connect(lapPan);
  lapPan.connect(amb);

  // Orb hum: a beating pair around 110 Hz and a quiet fifth, breathing on the third LFO.
  const wave = ctx.createPeriodicWave(new Float32Array(HUM_HARMONICS.length), Float32Array.from(HUM_HARMONICS));
  const hum1 = oscNode(ctx, HUM.hz * cents(-HUM.beatCents / 2), wave);
  const hum2 = oscNode(ctx, HUM.hz * cents(HUM.beatCents / 2), wave);
  const fifth = oscNode(ctx, HUM.hz * 1.5 * cents(HUM.fifthCents));
  const fifthGain = gainNode(ctx, MIX.humFifth);
  const breath = gainNode(ctx, 1);
  const humLevel = gainNode(ctx, 0);
  hum1.connect(breath);
  hum2.connect(breath);
  fifth.connect(fifthGain);
  fifthGain.connect(breath);
  breath.connect(humLevel);
  humLevel.connect(bus);
  modulate(ctx, lfo[2], breath.gain, HUM.breath);

  // Gyroscope shimmer: shares the pink loop with the high wind (the bands barely overlap).
  const shimmerBand = filterNode(ctx, "bandpass", 5800, 4);
  kRate(shimmerBand.frequency);
  const shimmer = gainNode(ctx, 0);
  pinkLoop.connect(shimmerBand);
  shimmerBand.connect(shimmer);
  shimmer.connect(bus);

  for (const o of [...lfo, hum1, hum2, fifth]) o.start(t);

  return {
    ctx,
    master,
    bus,
    amb,
    send,
    verbIn,
    pink,
    bursts: [burstCurve(), burstCurve(), burstCurve()],
    ambOpenHz,
    water: { src: waterLoop, band: lapBand, low: lapLow, fizz: lapFizz, pan: panOf(lapPan) },
    humLevel: new Ctl(0.25, 2e-4, humLevel.gain),
    humFifth: new Ctl(0.25, 2e-3, fifthGain.gain),
    humPitch: new Ctl(0.2, 0.5, hum1.detune, hum2.detune, fifth.detune),
    shimmer: new Ctl(0.08, MIX.shimmer * 0.004, shimmer.gain),
    shimmerHz: new Ctl(0.12, 5, shimmerBand.frequency),
    ambLevel: new Ctl(0.2, 2e-3, amb.gain),
    ambHz: new Ctl(0.2, 20, ambLow.frequency),
  };
}

/** A decaying sine partial into `out`; `bend` > 1 starts it slightly sharp (a droplet). */
function partial(ctx: BaseAudioContext, v: Voice, t: number, hz: number, peak: number, attack: number, tau: number, out: AudioNode, bend = 1) {
  const osc = oscNode(ctx, hz);
  if (bend !== 1) {
    osc.frequency.setValueAtTime(hz * bend, t);
    osc.frequency.setTargetAtTime(hz, t, 0.012);
  }
  const amp = v.add(ctx.createGain());
  envelope(amp.gain, t, attack, peak, tau);
  osc.connect(amp);
  amp.connect(out);
  osc.start(t);
  v.until(osc, t + attack + tau * TAIL);
}

/** FM bell: a bright inharmonic strike (modulator at 2.76x) settling into a pure tone. */
function bell(ctx: BaseAudioContext, v: Voice, t: number, hz: number, peak: number, tau: number, out: AudioNode) {
  const carrier = oscNode(ctx, hz);
  const mod = oscNode(ctx, hz * 2.76);
  const depth = v.add(gainNode(ctx, hz * 2.76 * 1.1));
  depth.gain.setTargetAtTime(hz * 2.76 * 0.05, t, 0.18);
  const amp = v.add(ctx.createGain());
  envelope(amp.gain, t, 0.004, peak, tau);
  mod.connect(depth);
  depth.connect(carrier.frequency);
  carrier.connect(amp);
  amp.connect(out);
  carrier.start(t);
  mod.start(t);
  const stop = t + 0.004 + tau * TAIL;
  v.until(carrier, stop);
  v.until(mod, stop);
}

/** "Singing" lake ice: an FM tone gliding fast downwards behind a short resonant crack. */
function chirp(g: Graph, v: Voice, t: number, amp: number, out: AudioNode) {
  const { ctx } = g;
  const f0 = rand(1500, 3000);
  const f1 = rand(170, 380);
  const fall = rand(0.08, 0.2);
  const ratio = rand(1.38, 1.52);
  const decay = rand(0.15, 0.3);
  const carrier = oscNode(ctx, f0);
  const mod = oscNode(ctx, f0 * ratio);
  carrier.frequency.setTargetAtTime(f1, t, fall);
  mod.frequency.setTargetAtTime(f1 * ratio, t, fall);
  const depth = v.add(gainNode(ctx, f0 * ratio * 0.9));
  depth.gain.setTargetAtTime(f1 * ratio * 0.2, t, fall * 0.7);
  const env = v.add(ctx.createGain());
  envelope(env.gain, t, 0.004, MIX.creak * amp, decay);
  mod.connect(depth);
  depth.connect(carrier.frequency);
  carrier.connect(env);
  env.connect(out);
  carrier.start(t);
  mod.start(t);
  const end = t + 0.004 + decay * TAIL;
  v.until(carrier, end);
  v.until(mod, end);

  const noise = loopSource(ctx, g.pink, 1, t);
  const band = v.add(filterNode(ctx, "bandpass", f0 * 0.55, 9));
  const crack = v.add(ctx.createGain());
  envelope(crack.gain, t, 0.001, MIX.crack * amp, 0.006);
  noise.connect(band);
  band.connect(crack);
  crack.connect(out);
  v.until(noise, t + 0.08);
}

/** The hold voice: a rising noise band and three glassy partials, one beating against the root. */
function startTension(g: Graph, t: number): Tension {
  const { ctx } = g;
  const voice = new Voice();
  const src = loopSource(ctx, g.pink, 1, t);
  const band = voice.add(filterNode(ctx, "bandpass", 700, 7));
  kRate(band.frequency);
  const noise = voice.add(gainNode(ctx, 0));
  const tone = voice.add(gainNode(ctx, 0));
  src.connect(band);
  band.connect(noise);
  noise.connect(g.bus);
  tone.connect(g.bus);
  const root = oscNode(ctx, TENSION_HZ);
  const beat = oscNode(ctx, TENSION_HZ + 1.5);
  const glass = oscNode(ctx, TENSION_HZ * 2.756);
  const beatGain = voice.add(gainNode(ctx, 0.8));
  const glassGain = voice.add(gainNode(ctx, 0.3));
  root.connect(tone);
  beat.connect(beatGain);
  beatGain.connect(tone);
  glass.connect(glassGain);
  glassGain.connect(tone);
  root.start(t);
  beat.start(t);
  glass.start(t);
  return {
    voice,
    sources: [src, root, beat, glass],
    gains: [noise, tone],
    noise: new Ctl(0.08, 1e-4, noise.gain),
    noiseHz: new Ctl(0.1, 5, band.frequency),
    tone: new Ctl(0.08, 1e-5, tone.gain),
    hz: new Ctl(0.1, 0.5, root.frequency),
    beat: new Ctl(0.1, 0.5, beat.frequency),
    glass: new Ctl(0.1, 0.5, glass.frequency),
  };
}

/** A random index in [0, n), never `prev` twice in a row. */
function nextVariant(prev: number, n: number) {
  if (prev < 0) return pickIndex(n);
  const k = pickIndex(n - 1);
  return k >= prev ? k + 1 : k;
}

/**
 * Procedural, reactive sound bed for the hero. Construct it with the engine's state
 * getter, call `update(dt)` every animation frame, `setEnabled()` from the sound
 * toggle's click and `tick()` from UI hovers / clicks; `dispose()` closes everything.
 */
export class SoundEngine {
  private on = false;
  private hidden = false;
  private wasAudible = false;
  private disposed = false;
  private volume = 0.8;
  private g: Graph | null = null;
  private tension: Tension | null = null;
  /** One-shots still sounding: a cap against runaway clicking. */
  private live = 0;
  private suspendTimer = 0;
  private unlockArmed = false;
  private reducedMq: MediaQueryList | null = null;
  private noHoverMq: MediaQueryList | null = null;
  private pointerKind = "mouse";
  private lastTime = -1;
  private wasPressed = false;
  private pressTime = 0;
  private broken = false;
  private lastShatter = 0;
  private ctlAcc = 0;
  private tensionIdle = 0;
  private nextLap = 0;
  private nextCreak = 0;
  private tickAt = [-Infinity, -Infinity];
  private tickVariant = [-1, -1];

  constructor(private getState: () => HeroState) {
    if (typeof window === "undefined") return;
    this.hidden = document.visibilityState === "hidden";
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pointerover", this.onPointerKind, LISTEN);
    window.addEventListener("pointerdown", this.onPointerKind, LISTEN);
    if (typeof matchMedia === "function") {
      this.reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
      this.noHoverMq = matchMedia("(hover: none)");
    }
  }

  /** True while sound is switched on (it may still be fading in or waiting for a gesture). */
  get enabled(): boolean {
    return this.on;
  }

  private get audible() {
    return this.on && !this.hidden && !this.disposed;
  }

  /**
   * On: creates / resumes the AudioContext and fades the master in over ~0.6 s. Off: fades
   * out, then suspends the context. Call it synchronously inside the click handler (autoplay
   * rules). Resolves once the context runs (at most ~0.5 s), or at once when switching off;
   * `enabled` stays false if Web Audio is unavailable.
   */
  async setEnabled(on: boolean): Promise<void> {
    if (this.disposed) return;
    this.on = on;
    if (on && !this.g && !this.build()) {
      this.on = false;
      return;
    }
    await this.applyMaster();
  }

  /** Master volume, 0..1 (default 0.8), applied with a short ramp. */
  setVolume(v: number) {
    if (!Number.isFinite(v)) return;
    this.volume = clamp(v);
    if (this.audible) void this.applyMaster(0.08);
  }

  /** Follows HeroState and schedules the ambience; call once per animation frame. Allocation-free unless a one-shot fires. */
  update(dt: number) {
    if (this.disposed) return;
    const s = this.getState();
    if (this.lastTime < 0) this.lastTime = s.time;
    const step = s.time - this.lastTime;
    this.lastTime = s.time;

    // Edges are tracked while muted too, so switching on mid-gesture never fires stale one-shots.
    // A click does nothing, so the press sound waits until the press has become a hold.
    const pressEdge = s.holding && !this.wasPressed;
    this.wasPressed = s.holding;
    if (pressEdge) this.pressTime = 0;
    else if (s.holding) this.pressTime += dt;
    const rate = (s.shatter - this.lastShatter) / Math.max(dt, 1e-3);
    this.lastShatter = s.shatter;
    let hit = false;
    let mend = false;
    if (!this.broken && s.shatter >= 0.6) {
      this.broken = true;
      hit = true;
    } else if (this.broken && s.shatter < 0.15) {
      this.broken = false;
      mend = true;
    }

    const g = this.g;
    if (!g || !this.audible || g.ctx.state !== "running") return;
    const now = g.ctx.currentTime;
    const t = now + LOOKAHEAD;
    if (pressEdge) this.tink(g, t, s.pointer.nx);
    // The one-frame pop of a hold hits harder than the slow split of a click.
    if (hit) this.shatterHit(g, t, clamp(0.6 + rate / 8, 0.6, 1), s.pointer.nx);
    if (mend) this.chime(g, t);
    if (t >= this.nextLap) {
      this.lap(g, t);
      this.nextLap = t + rand(3, 7);
    }
    if (t >= this.nextCreak) {
      this.creak(g, t);
      this.nextCreak = t + rand(15, 40);
    }
    this.ctlAcc += dt;
    if (this.ctlAcc >= CONTROL_DT) {
      this.control(g, s, now, this.ctlAcc);
      this.ctlAcc = 0;
    }
  }

  /** UI one-shot: three variants per kind, at least 0.4 s apart per kind; hover is ignored for touch. */
  tick(kind: "hover" | "click") {
    const g = this.g;
    if (!g || !this.audible || g.ctx.state !== "running" || this.live >= MAX_LIVE) return;
    const i = kind === "hover" ? 0 : 1;
    // A tap's synthetic enter would double the click.
    if (i === 0 && (this.pointerKind === "touch" || this.noHoverMq?.matches)) return;
    const now = g.ctx.currentTime;
    if (now - this.tickAt[i] < TICK_GAP) return;
    this.tickAt[i] = now;
    const table = TICKS[i];
    const k = nextVariant(this.tickVariant[i], table.length);
    this.tickVariant[i] = k;
    const [hz, ratio, tau] = table[k];
    const level = i === 0 ? MIX.tickHover : MIX.tickClick;
    const bend = i === 0 ? 1 : 1.035;
    const t = now + LOOKAHEAD;
    const v = new Voice();
    partial(g.ctx, v, t, hz, level, 0.0015, tau, g.bus, bend);
    partial(g.ctx, v, t, hz * ratio, level * db(-10), 0.001, tau * 0.45, g.bus, bend);
    this.track(v);
  }

  /** Fades out quickly, closes the AudioContext and removes every listener. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.on = false;
    if (typeof window === "undefined") return;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointerover", this.onPointerKind, LISTEN);
    window.removeEventListener("pointerdown", this.onPointerKind, LISTEN);
    this.disarmUnlock();
    window.clearTimeout(this.suspendTimer);
    const g = this.g;
    this.g = null;
    this.tension = null;
    if (!g) return;
    g.ctx.removeEventListener("statechange", this.onState);
    if (g.ctx.state !== "running") return closeContext(g.ctx);
    // A short fade first, so unmounting never cuts the sound mid-waveform.
    glide(g.master.gain, 0, g.ctx.currentTime, 0.02);
    window.setTimeout(() => closeContext(g.ctx), 150);
  }

  private build(): boolean {
    const ctx = createContext();
    if (!ctx) return false;
    try {
      this.g = buildGraph(ctx);
    } catch (err) {
      console.warn("[hero] sound unavailable", err);
      closeContext(ctx);
      return false;
    }
    ctx.addEventListener("statechange", this.onState);
    const now = ctx.currentTime;
    this.nextLap = now + rand(1.5, 4);
    this.nextCreak = now + rand(8, 18);
    return true;
  }

  /** Fades the master to volume (on and visible) or to silence, then suspends; returns the resume. */
  private applyMaster(tau?: number): Promise<void> {
    const g = this.g;
    if (!g) return Promise.resolve();
    const audible = this.audible;
    const now = g.ctx.currentTime;
    glide(g.master.gain, audible ? this.volume : 0, now, tau ?? (audible ? FADE_IN / 3 : FADE_OUT / 4));
    window.clearTimeout(this.suspendTimer);
    if (audible && !this.wasAudible) {
      // Ambience timers that lapsed while muted restart gently instead of all firing at once.
      this.nextLap = Math.max(this.nextLap, now + rand(1, 3));
      this.nextCreak = Math.max(this.nextCreak, now + rand(6, 14));
    }
    this.wasAudible = audible;
    if (audible) return this.resume();
    // Once the fade is inaudible the context sleeps: no audio CPU while muted or hidden.
    this.suspendTimer = window.setTimeout(() => {
      if (!this.audible && this.g === g && running(g.ctx)) g.ctx.suspend().catch(() => undefined);
    }, (FADE_OUT + 0.35) * 1000);
    return Promise.resolve();
  }

  /** Starts the context; settles within RESUME_TIMEOUT_MS even while autoplay rules hold it back. */
  private resume(): Promise<void> {
    const ctx = this.g?.ctx;
    if (!ctx || ctx.state === "running" || ctx.state === "closed") return Promise.resolve();
    return new Promise<void>((done) => {
      const settle = () => {
        window.clearTimeout(timer);
        // Still blocked (no user activation yet, or an iOS interruption): retry on the next gesture.
        if (this.g?.ctx === ctx && !running(ctx) && this.audible) this.armUnlock();
        done();
      };
      const timer = window.setTimeout(settle, RESUME_TIMEOUT_MS);
      try {
        ctx.resume().then(settle, settle);
      } catch {
        settle();
      }
    });
  }

  private armUnlock() {
    if (this.unlockArmed || this.disposed) return;
    this.unlockArmed = true;
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, this.onUnlock, LISTEN);
  }

  private disarmUnlock() {
    if (!this.unlockArmed) return;
    this.unlockArmed = false;
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, this.onUnlock, LISTEN);
  }

  private onUnlock = () => {
    const ctx = this.g?.ctx;
    if (!ctx || !this.audible || ctx.state === "running" || ctx.state === "closed") {
      this.disarmUnlock();
      return;
    }
    ctx.resume().then(
      () => {
        if (running(ctx)) this.disarmUnlock();
      },
      () => undefined,
    );
  };

  /** Recovers from outside suspensions (iOS "interrupted", device changes) while sound should play. */
  private onState = () => {
    const ctx = this.g?.ctx;
    if (ctx && this.audible && ctx.state !== "running" && ctx.state !== "closed") void this.resume();
  };

  private onVisibility = () => {
    const hidden = document.visibilityState === "hidden";
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    void this.applyMaster();
  };

  private onPointerKind = (e: PointerEvent) => {
    this.pointerKind = e.pointerType;
  };

  /** Counts a one-shot as live until it has ended and released its nodes. */
  private track(v: Voice) {
    this.live++;
    v.finish(() => {
      this.live--;
    });
  }

  /** State-driven layers at 30 Hz: hum, shimmer, ambience focus and the tension voice. */
  private control(g: Graph, s: HeroState, t: number, step: number) {
    const hero = smoothstep(0, 0.5, s.intro);
    const spin = clamp(s.spin);
    // 0 at rest, 1 once the hold has slowed the rings to slow motion.
    const focus = clamp((1 - s.spin) / 0.85);
    // Swells as the rings line up face-on (the eye, partial alignments, pointer dwells): Rings.ts
    // reports it as HeroState.alignment, so the sound follows the actual pose.
    const eye = 0.55 + 0.45 * clamp(s.alignment);

    g.humLevel.to(MIX.hum * hero * (1 + 0.9 * s.hover + 1.3 * s.hold), t);
    g.humFifth.to(MIX.humFifth * (1 + 1.2 * s.hover + 1.6 * s.hold), t);
    g.humPitch.to(HUM.slowCents * focus, t);
    g.shimmer.to(MIX.shimmer * hero * (0.2 + 0.8 * spin) * eye * (1 + 0.6 * s.impulse), t);
    g.shimmerHz.to(2400 + 3400 * spin, t);
    g.ambLevel.to(1 - 0.4 * focus, t);
    g.ambHz.to(g.ambOpenHz * Math.pow(AMB_SHUT_HZ / g.ambOpenHz, focus), t);

    // Tension: the press fill starts it, the break (shatter) carries it the rest of the way.
    let ten = clamp(Math.max(s.hold * (0.45 + 0.55 * s.shatter), 0.8 * s.shatter));
    if (this.reducedMq?.matches) ten *= 0.7;
    if (ten > 0.01) {
      this.tensionIdle = 0;
      if (!this.tension) this.tension = startTension(g, t);
    } else if (this.tension) {
      this.tensionIdle += step;
      if (this.tensionIdle > 1) this.stopTension(t);
    }
    const v = this.tension;
    if (!v) return;
    // Long holds let the noise settle back, so the sustain never gets tiring.
    const settle = 0.5 + 0.5 * Math.exp(-Math.max(0, this.pressTime - 2.5) / 2.5);
    v.noise.to(MIX.tensionNoise * Math.pow(ten, 1.5) * settle, t);
    v.noiseHz.to(700 * Math.pow(2, 2.5 * ten), t);
    v.tone.to(MIX.tensionTone * ten * ten, t);
    const hz = TENSION_HZ * Math.pow(2, 0.585 * ten); // A5 rising to E6
    v.hz.to(hz, t);
    v.beat.to(hz + 1.5 + 6 * ten, t);
    v.glass.to(hz * 2.756, t);
  }

  private stopTension(t: number) {
    const v = this.tension;
    if (!v) return;
    this.tension = null;
    for (const gain of v.gains) glide(gain.gain, 0, t, 0.04);
    for (const src of v.sources) v.voice.until(src, t + 0.35);
    this.track(v.voice);
  }

  private lap(g: Graph, t: number) {
    const w = g.water;
    const crest = rand(0.45, 1);
    const rise = rand(0.6, 1.3);
    const fall = rand(0.45, 0.8);
    swell(w.low.gain, MIX.lapLow * crest, t, rise, fall);
    swell(w.band.frequency, rand(520, 900), t, rise, fall * 1.5, 280);
    // The fizz breaks just after the crest and retreats faster.
    swell(w.fizz.gain, MIX.lapFizz * crest, t + rise * 0.6, rise * 0.5, fall * 0.6);
    if (w.pan) glide(w.pan, rand(-0.65, 0.65), t, 0.35);
    glide(w.src.playbackRate, rand(0.72, 1.05), t, 0.5);
  }

  private creak(g: Graph, t: number) {
    if (this.live >= MAX_LIVE) return;
    const v = new Voice();
    const out = v.add(pannerNode(g.ctx, rand(0.4, 0.85) * (Math.random() < 0.5 ? -1 : 1)));
    const dry = v.add(gainNode(g.ctx, db(-10)));
    // Far away: mostly reverb, a little dry signal through the ambience bus.
    out.connect(g.verbIn);
    out.connect(dry);
    dry.connect(g.amb);
    chirp(g, v, t, 1, out);
    // Lake ice often answers itself.
    if (Math.random() < 0.35) chirp(g, v, t + rand(0.09, 0.22), rand(0.35, 0.6), out);
    this.track(v);
  }

  private tink(g: Graph, t: number, nx: number) {
    if (this.live >= MAX_LIVE) return;
    const v = new Voice();
    const out = v.add(pannerNode(g.ctx, clamp(nx * 0.35, -0.6, 0.6)));
    out.connect(g.bus);
    out.connect(g.send);
    const hz = TINK_HZ[pickIndex(TINK_HZ.length)] * rand(0.996, 1.004);
    partial(g.ctx, v, t, hz, MIX.tink, 0.003, 0.16, out);
    partial(g.ctx, v, t, hz * rand(2.62, 2.9), MIX.tink * db(-9), 0.002, 0.05, out);
    this.track(v);
  }

  private shatterHit(g: Graph, t: number, energy: number, nx: number) {
    if (this.live >= MAX_LIVE) return;
    const { ctx } = g;
    const calm = this.reducedMq?.matches === true;
    const level = energy * (calm ? 0.5 : 1);
    const sr = ctx.sampleRate;
    const v = new Voice();
    const out = v.add(pannerNode(ctx, clamp(nx * 0.3 + rand(-0.15, 0.15), -0.7, 0.7)));
    out.connect(g.bus);
    out.connect(g.send);

    // Excitation: one of the precomputed burst clusters, stretched at random.
    const len = BURST_SECONDS * rand(0.85, 1.2);
    const src = loopSource(ctx, g.pink, rand(1.2, 1.6), t);
    const exc = v.add(ctx.createGain());
    exc.gain.setValueCurveAtTime(g.bursts[pickIndex(g.bursts.length)], t, len);
    src.connect(exc);
    v.until(src, t + len + 0.02);

    // Resonators on an inharmonic ice spectrum; each gain undoes its band-pass's noise loss
    // (white noise keeps sqrt(pi f / (Q sr)) of its RMS), so every mode lands near its weight.
    const f0 = rand(1150, 1750);
    for (let k = 0; k < ICE_MODES.length; k++) {
      const hz = f0 * ICE_MODES[k] * rand(0.975, 1.025);
      const q = rand(70, 140) * (1 - 0.12 * k);
      const band = v.add(filterNode(ctx, "bandpass", hz, q));
      const gain = v.add(gainNode(ctx, MIX.shatterModes * level * ICE_WEIGHTS[k] * Math.sqrt((q * sr) / (Math.PI * hz))));
      exc.connect(band);
      band.connect(gain);
      gain.connect(out);
    }
    const air = v.add(filterNode(ctx, "highpass", 3200, -3));
    const crunch = v.add(gainNode(ctx, MIX.shatterCrunch * level));
    exc.connect(air);
    air.connect(crunch);
    crunch.connect(out);

    // Debris: tiny high pings scattered after the hit.
    for (let i = calm ? 2 : 0; i < 3; i++) {
      const hz = Math.min(f0 * rand(2.6, 4.8), sr * 0.4);
      partial(ctx, v, t + rand(0.03, 0.45), hz, MIX.debris * level * rand(0.4, 1), 0.001, rand(0.03, 0.08), out);
    }

    if (!calm) {
      const sub = oscNode(ctx, rand(64, 80));
      sub.frequency.setTargetAtTime(38, t, 0.07);
      const thump = v.add(ctx.createGain());
      envelope(thump.gain, t, 0.006, MIX.thump * energy, 0.1);
      sub.connect(thump);
      thump.connect(g.bus);
      sub.start(t);
      v.until(sub, t + 0.006 + 0.1 * TAIL);
    }
    this.track(v);
  }

  private chime(g: Graph, t: number) {
    if (this.live >= MAX_LIVE) return;
    const v = new Voice();
    const count = 3 + pickIndex(2);
    const side = Math.random() < 0.5 ? -1 : 1;
    let note = pickIndex(3);
    let at = t;
    // A quick rising arpeggio, the pieces clicking back into place.
    for (let i = 0; i < count && note < CHIME_HZ.length; i++) {
      const out = v.add(pannerNode(g.ctx, side * (i / (count - 1) - 0.5) * 0.8));
      out.connect(g.bus);
      out.connect(g.send);
      bell(g.ctx, v, at, CHIME_HZ[note] * rand(0.998, 1.002), MIX.chime * rand(0.7, 1), rand(0.55, 0.75), out);
      at += rand(0.05, 0.09);
      note += Math.random() < 0.3 ? 2 : 1;
    }
    this.track(v);
  }
}
