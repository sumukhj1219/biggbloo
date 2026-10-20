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
