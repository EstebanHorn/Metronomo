import {
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
} from "react-native";

const { Metronome } = NativeModules as any;

// Usamos DeviceEventEmitter por debajo; los stubs nativos evitan los warnings.
const emitter = new NativeEventEmitter();

export type Role = "normal" | "accent" | "clave" | "silence";
export type Pulse = {
  durEighths: number;
  subdiv: 2 | 3 | 4 | 5 | 6;
  role: Role;
  pan: number; // -1..1
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
  emitter.addListener("PulsoTick", (e: any) =>
    cb(e.bar, e.pulse, e.sub, e.tMs)
  );

export const onTransport = (
  cb: (playing: boolean) => void
): EmitterSubscription =>
  emitter.addListener("PulsoTransport", (e: any) => cb(e.playing));
