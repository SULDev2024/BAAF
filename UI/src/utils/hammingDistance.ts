import { CharacterMatrix, DistanceMatrix } from "../types";

export function computeHammingDistances(matrix: CharacterMatrix): DistanceMatrix {
  const { taxa, characters } = matrix;
  const n = taxa.length;
  const numChars = characters[0].length;
  const data: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let diffCount = 0;
      for (let k = 0; k < numChars; k++) {
        if (characters[i][k] !== characters[j][k]) {
          diffCount++;
        }
      }
      data[i][j] = diffCount;
      data[j][i] = diffCount;
    }
  }

  return { taxa, data };
}
