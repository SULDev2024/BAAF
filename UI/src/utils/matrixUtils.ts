import { DistanceMatrix } from "../types";

export function validateMatrix(matrix: DistanceMatrix): string | null {
  const { taxa, data } = matrix;
  const n = taxa.length;

  if (n < 3) return "At least 3 taxa are required.";
  if (data.length !== n) return "Matrix dimensions do not match taxa count.";

  for (let i = 0; i < n; i++) {
    if (data[i].length !== n) return `Row ${i} length mismatch.`;
    if (data[i][i] !== 0) return `Diagonal element [${i},${i}] must be zero.`;
    for (let j = 0; j < n; j++) {
      if (data[i][j] < 0) return "Matrix cannot contain negative distances.";
      if (Math.abs(data[i][j] - data[j][i]) > 1e-9) return `Matrix must be symmetric (error at [${i},${j}]).`;
    }
  }
  return null;
}

export function cloneMatrix(matrix: DistanceMatrix): DistanceMatrix {
  return {
    taxa: [...matrix.taxa],
    data: matrix.data.map(row => [...row])
  };
}
