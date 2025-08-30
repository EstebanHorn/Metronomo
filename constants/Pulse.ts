// REGLA #1: La estructura de duraciones es FIJA y nunca cambia.
export const STRUCTURAL_PATTERN = [3, 3, 4, 2, 4] as const;

// REGLA #3: Las subdivisiones iniciales que ve el usuario.
export const INITIAL_SUBDIVISIONS = [3, 3, 4, 2, 4] as const;

export const SECTION_NAMES = ["A", "Á", "B", "C", "B́"];

// Esta función calcula los arcos del círculo y sigue siendo necesaria.
export function sectionsFromPattern({
  cycleMs,
  pattern,
}: {
  cycleMs: number;
  pattern: readonly number[] | number[];
}) {
  const total = pattern.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const unit = cycleMs / total;
  let acc = 0;
  return pattern.map((len) => {
    const startMs = acc * unit;
    const durMs = len * unit;
    acc += len;
    return { startMs, durMs };
  });
}
