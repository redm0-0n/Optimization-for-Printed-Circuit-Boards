/** Scalar proxy for instance size: grid cells × net count */
export function boardComplexity(board) {
  if (!board?.grid_width || !board?.grid_height || board.nets_count == null) return null;
  return board.grid_width * board.grid_height * board.nets_count;
}

export function formatComplexity(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}
