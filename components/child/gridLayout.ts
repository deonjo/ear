export const MIN_CELL = 120;
export const MAX_CELL = 300;

/** Picks the column count that makes square cells as large as possible in a w×h box. */
export function bestGrid(count: number, width: number, height: number): { cols: number; cell: number } {
  let best = { cols: 1, cell: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cell = Math.min(width / cols, height / rows);
    if (cell > best.cell + 0.5) best = { cols, cell };
  }
  return { cols: best.cols, cell: Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(best.cell))) };
}
