import { BioTreeNode, DistanceMatrix } from "../types";

export function checkFourPoint(matrix: DistanceMatrix): {
  isAdditive: boolean;
  results: { quadruple: string[], s1: number, s2: number, s3: number, pass: boolean }[]
} {
  const { taxa, data } = matrix;
  const n = taxa.length;
  const results = [];
  let isAdditive = true;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const s1 = data[i][j] + data[k][l];
          const s2 = data[i][k] + data[j][l];
          const s3 = data[i][l] + data[j][k];

          const sums = [s1, s2, s3].sort((a, b) => b - a);
          // Two largest must be equal
          const pass = Math.abs(sums[0] - sums[1]) < 1e-9;
          
          if (!pass) isAdditive = false;

          results.push({
            quadruple: [taxa[i], taxa[j], taxa[k], taxa[l]],
            s1, s2, s3,
            pass
          });
        }
      }
    }
  }

  return { isAdditive, results };
}
