import { CharacterMatrix, BioTreeNode } from "../types";

export function checkPerfectPhylogeny(matrix: CharacterMatrix): {
  exists: boolean;
  tree?: BioTreeNode;
  incompatiblePairs: [number, number][];
} {
  const { taxa, characters } = matrix;
  const numChars = characters[0].length;
  const incompatiblePairs: [number, number][] = [];

  for (let i = 0; i < numChars; i++) {
    for (let j = i + 1; j < numChars; j++) {
      const gametes = new Set<string>();
      for (let k = 0; k < taxa.length; k++) {
        gametes.add(`${characters[k][i]}${characters[k][j]}`);
      }
      if (gametes.has('11') && gametes.has('01') && gametes.has('10') && gametes.has('00')) {
        incompatiblePairs.push([i, j]);
      }
    }
  }

  const exists = incompatiblePairs.length === 0;

  // Tree building for perfect phylogeny:
  // 1. Sort characters by number of 1s.
  // 2. Successively partition taxa.
  
  return { exists, incompatiblePairs };
}
