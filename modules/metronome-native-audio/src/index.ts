import {
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  NativeModule,
} from "react-native";

interface NativeMetronome extends NativeModule {
  init: (p?: { sampleRate?: number; bufferFrames?: number }) => void;
  setBpm: (bpm: number) => void;
  setPattern: (p: ReadonlyArray<any>) => void;
  setVolume?: (v: number) => void;
  play: () => void;
  stop: () => void;
  // Requeridos por NativeEventEmitter:
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
}

const { Metronome } = NativeModules as { Metronome: NativeMetronome };
const emitter = new NativeEventEmitter(Metronome);

/**
 * Roles soportados:
 * - Nuevos: cajon_grave | cajon_relleno | cajon_agudo | cencerro | click | silence
 * - Compat: normal | accent | clave
 */
export type Role =
  | "cajon_grave"
  | "cajon_relleno"
  | "cajon_agudo"
  | "cencerro"
  | "click"
  | "silence"
  | "normal"
  | "accent"
  | "clave";

export type Pulse = {
  durEighths: number;
  subdiv: number;
  role: Role;
  pan: number; // -1..1
  sectionIdx?: number;
  k?: number;
};

export type InitParams = { sampleRate?: number; bufferFrames?: number };

type NewRole =
  | "cajon_grave"
  | "cajon_relleno"
  | "cajon_agudo"
  | "cencerro"
  | "click"
  | "silence";

/** Compat → nuevos samples */
function normalizeRoleForNative(role: Role): NewRole {
  switch (role) {
    case "cajon_grave":
    case "cajon_relleno":
    case "cajon_agudo":
    case "cencerro":
    case "click":
    case "silence":
      return role;
    case "normal":
      return "cajon_relleno";
    case "accent":
      return "cajon_agudo";
    case "clave":
      return "click";
    default:
      return "cajon_relleno";
  }
}

export const init = (p: InitParams = {}) => Metronome.init(p);
export const setBpm = (bpm: number) => Metronome.setBpm(bpm);
export const setVolume = (vol: number) => Metronome.setVolume?.(vol);
export const play = () => Metronome.play();
export const stop = () => Metronome.stop();

/** Adaptamos roles antes de enviar al nativo */
export const setPattern = (pulses: ReadonlyArray<Pulse>) => {
  const adapted = pulses.map((p) => ({
    ...p,
    role: normalizeRoleForNative(p.role),
  }));
  return Metronome.setPattern(adapted);
};

/** onTick expone (bar, section, k, tMs); fallback a (pulse, sub) para compat */
export const onTick = (
  cb: (bar: number, section: number, k: number, tMs?: number) => void
): EmitterSubscription =>
  emitter.addListener("PulsoTick", (e: any) => {
    cb(e.bar ?? 0, e.section ?? e.pulse ?? 0, e.k ?? e.sub ?? 0, e.tMs);
  });

export const onTransport = (
  cb: (playing: boolean) => void
): EmitterSubscription =>
  emitter.addListener("PulsoTransport", (e: any) => cb(!!e.playing));

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
