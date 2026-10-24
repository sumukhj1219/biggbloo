import { Howl, Howler } from "howler";

type SoundConfig = { src: string; volume: number; loop?: boolean; html5?: boolean };

const SOUNDS = {
  gear: { src: "/sounds/gear.wav", volume: 0.6 },
  crank: { src: "/sounds/crank.wav", volume: 0.6 },
  // Long track, so stream it through an <audio> element instead of decoding it all up front.
  cozyBg: { src: "/sounds/cozy-bg.mp3", volume: 0.12, loop: true, html5: true },
} satisfies Record<string, SoundConfig>;

export type SoundName = keyof typeof SOUNDS;

const cache = new Map<SoundName, Howl>();

// Howls are created on first use so nothing touches audio during SSR or before a user gesture.
export const getSound = (name: SoundName) => {
  let sound = cache.get(name);
  if (!sound) {
    const { src, volume, loop = false, html5 = false }: SoundConfig = SOUNDS[name];
    sound = new Howl({ src: [src], volume, loop, html5, preload: true });
    cache.set(name, sound);
  }
  return sound;
};

// Fades a playing instance to silence and then stops it; a zero fade cuts it off immediately.
export const fadeOutSound = (name: SoundName, id: number, ms: number) => {
  const sound = getSound(name);
  if (!sound.playing(id) || ms === 0) {
    sound.stop(id);
    return;
  }
  sound.once("fade", () => sound.stop(id), id);
  sound.fade(sound.volume(id) as number, 0, ms, id);
};

export const soundVolume = (name: SoundName) => SOUNDS[name].volume;

// Plays a sound after `delay` seconds; the returned function fades it out (or cancels it if not started yet).
export const playSoundAfter = (name: SoundName, delay: number) => {
  let id: number | null = null;
  const timer = window.setTimeout(() => (id = getSound(name).play()), delay * 1000);
  return (fadeMs: number) => {
    window.clearTimeout(timer);
    if (id !== null) fadeOutSound(name, id, fadeMs);
    id = null;
  };
};

// Global mute for every sound on the site; it holds across scene opens.
let muted = false;

export const isMuted = () => muted;

export const setMuted = (value: boolean) => {
  muted = value;
  Howler.mute(value);
};

// Synthesized 8-bit blips (chained oscillator notes), so they need no audio files.
let toneCtx: AudioContext | null = null;

type Note = { freq: number; dur: number };

const playTones = (notes: Note[], type: OscillatorType, volume = 0.05, tail = 0.3) => {
  if (muted) return;
  toneCtx ??= new AudioContext();
  const ctx = toneCtx;
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  let at = t;
  for (const { freq, dur } of notes) {
    osc.frequency.setValueAtTime(freq, at);
    at += dur;
  }
  gain.gain.setValueAtTime(volume, t);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + tail);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(at + tail);
};

export const playCoin = () =>
  playTones([{ freq: 988, dur: 0.07 }, { freq: 1319, dur: 0 }], "square", 0.05, 0.33);
