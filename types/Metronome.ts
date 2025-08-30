export type EventType = "clave" | "pulse";

export type ActiveEvent = {
  /** Tiempo (ms) relativo dentro del ciclo actual del metrónomo */
  tMs: number;
  /** Índice de sección (0..N según subdivisiones) */
  section: number;
  /** Índice del golpe dentro de la sección (0..subdiv-1); 0 = clave */
  k: number;
  /** Tipo del golpe: "clave" para k===0, "pulse" para el resto */
  type: EventType;
  /** Tick opcional (útil si discretizás UI): tMs / tickMs o contador */
  tick: number;
};
