export const SECTION_NAMES = ["A", "Á", "B", "C", "B́"] as const;

export type Mode = "binary" | "ternary";

// Estructuras fijas por modo (arcos del círculo / relación temporal entre secciones)
export const BINARY_STRUCTURAL_PATTERN = [3, 3, 4, 2, 4] as const; // 16 unidades (octavos)
export const TERNARY_STRUCTURAL_PATTERN = [2, 3, 2, 2, 3] as const; // 12 unidades (octavos)

// Subdivisiones iniciales (lo que ve el usuario al cargar)
export const BINARY_INITIAL_SUBDIVISIONS = [3, 3, 4, 2, 4] as const;
export const TERNARY_INITIAL_SUBDIVISIONS = [2, 3, 2, 2, 3] as const;

export const DEFAULTS = {
  binary: {
    STRUCTURAL_PATTERN: BINARY_STRUCTURAL_PATTERN as readonly number[],
    INITIAL_SUBDIVISIONS: BINARY_INITIAL_SUBDIVISIONS as readonly number[],
  },
  ternary: {
    STRUCTURAL_PATTERN: TERNARY_STRUCTURAL_PATTERN as readonly number[],
    INITIAL_SUBDIVISIONS: TERNARY_INITIAL_SUBDIVISIONS as readonly number[],
  },
} as const satisfies Record<
  Mode,
  {
    STRUCTURAL_PATTERN: readonly number[];
    INITIAL_SUBDIVISIONS: readonly number[];
  }
>;

// Cálculo de arcos del círculo para dibujar secciones en función del patrón estructural
export function sectionsFromPattern({
  cycleMs,
  pattern,
}: {
  cycleMs: number;
  pattern: readonly number[] | number[];
}) {
  const total = pattern.reduce((a, b) => a + b, 0);
  if (total === 0) return [] as { startMs: number; durMs: number }[];
  const unit = cycleMs / total;
  let acc = 0;
  return pattern.map((len) => {
    const startMs = acc * unit;
    const durMs = len * unit;
    acc += len;
    return { startMs, durMs };
  });
}
