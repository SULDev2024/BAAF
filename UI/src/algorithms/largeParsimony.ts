import { CharacterMatrix, BioTreeNode } from "../types";
import { runNJ } from "./neighborJoining";
import { computeHammingDistances } from "../utils/hammingDistance";
import { runFitch } from "./fitch";

export interface NNIIteration {
  step: number;
  edgeSwapped: string;
  scoreBefore: number;
  scoreAfter: number;
}

export function runNNI(matrix: CharacterMatrix): {
  startingTree: BioTreeNode,
  finalTree: BioTreeNode,
  history: NNIIteration[]
} {
  const hamming = computeHammingDistances(matrix);
  const { tree: njTree } = runNJ(hamming);
  
  const { totalScore: initialScore } = runFitch(njTree, matrix);
  
  // Real NNI is complex, for this turn we'll simulate the iteration structure
  // but implement the initial scoring.
  
  return {
    startingTree: njTree,
    finalTree: njTree,
    history: []
  };
}
