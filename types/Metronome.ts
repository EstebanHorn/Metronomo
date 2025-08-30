// types/Metronome.ts
export type EventType = "clave" | "pulse" | "accent" | "silence";

export type ActiveEvent = {
  tMs: number;
  section: number;
  k: number;
  type: EventType;
  tick: number;
};
