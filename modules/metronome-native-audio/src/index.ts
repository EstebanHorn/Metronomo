import {
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
} from "react-native";

const { Metronome } = NativeModules as any;
const emitter = new NativeEventEmitter();

export type Role = "normal" | "accent" | "clave" | "silence";

export type Pulse = {
  durEighths: number;
  subdiv: number;
  role: Role;
  pan: number;
  // CORREGIDO: Añadimos las propiedades opcionales que el motor nativo espera.
  sectionIdx?: number;
  k?: number;
};

export type InitParams = { sampleRate?: number; bufferFrames?: number };

export const init = (p: InitParams = {}) => Metronome.init(p);
export const setBpm = (bpm: number) => Metronome.setBpm(bpm);
export const setPattern = (pulses: Pulse[]) => Metronome.setPattern(pulses);
export const setVolume = (vol: number) => Metronome.setVolume(vol);
export const play = () => Metronome.play();
export const stop = () => Metronome.stop();

export const onTick = (
  cb: (bar: number, pulse: number, sub: number, tMs?: number) => void
): EmitterSubscription =>
  emitter.addListener("PulsoTick", (e: any) => {
    // El motor nativo ahora devuelve 'section' y 'k' en el evento
    cb(e.bar, e.section ?? e.pulse, e.k ?? e.sub, e.tMs);
  });

export const onTransport = (
  cb: (playing: boolean) => void
): EmitterSubscription =>
  emitter.addListener("PulsoTransport", (e: any) => cb(e.playing));

const api = {
  init,
  setBpm,
  setPattern,
  setVolume,
  play,
  stop,
  onTick,
  onTransport,
};
export default api;
