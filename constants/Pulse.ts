// constants/pulse.ts
export const PATTERN = [3, 3, 4, 2, 4] as const; // 5 secciones = 16 corcheas
export const SECTION_NAMES = ["A", "Á", "B", "C", "B́"];

/** Dado un ciclo total en ms y el patrón [3,3,4,2,4], retorna las 5 secciones con start/dur en ms */
export function sectionsFromPattern({
  cycleMs,
  pattern = PATTERN,
}: {
  cycleMs: number;
  pattern?: readonly number[];
}) {
  const total = pattern.reduce((a, b) => a + b, 0); // 16
  const unit = cycleMs / total; // ms por "corchea" del patrón
  let acc = 0;
  return pattern.map((len) => {
    const startMs = acc * unit;
    const durMs = len * unit;
    acc += len;
    return { startMs, durMs };
  });
}

/** Crea un silenceMap por sección: false = suena, true = silenciado */
export function makeSilenceMap(subdivs: number[]) {
  return subdivs.map((n) => Array(Math.max(1, n)).fill(false));
}

export type EventType = "clave" | "pulse";
export type ActiveEvent = {
  tMs: number; // tiempo en el ciclo
  section: number; // índice de sección 0..4
  k: number; // golpe dentro de la sección
  type: EventType; // "clave" si k===0
  tick: number; // opcional: tMs / tickMs
};

/**
 * Construye los eventos (clave+pulso) en ms para un ciclo, según subdivs por sección.
 * - k=0 => "clave" (golpe fuerte)
 * - k>0 => "pulse" (golpe normal)
 */
export function buildEventsMs({
  cycleMs,
  subdivs,
  pattern = PATTERN,
}: {
  cycleMs: number;
  subdivs: number[];
  pattern?: readonly number[];
}) {
  const sections = sectionsFromPattern({ cycleMs, pattern });
  const events: { t: number; section: number; k: number; type: EventType }[] =
    [];
  for (let i = 0; i < sections.length; i++) {
    const { startMs, durMs } = sections[i];
    const n = clamp(subdivs[i] ?? 1, 1, 32);
    for (let k = 0; k < n; k++) {
      const t = startMs + durMs * (n === 1 ? 0 : k / n);
      events.push({ t, section: i, k, type: k === 0 ? "clave" : "pulse" });
    }
  }
  // “tick” útil si querés discretizar el círculo (opcional)
  const tickMs = cycleMs / 256;
  return { events, sections, tickMs };
}

export const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
