export interface BioTreeNode {
  name: string;
  isLeaf: boolean;
  branchLength: number;
  children: BioTreeNode[];
  mergeHeight?: number; // For dendrograms
  stateSet?: Set<string>; // For parsimony bottom-up
  assignedState?: string; // For parsimony final assignment
  id?: string; // For D3 indexing
}

export interface DistanceMatrix {
  taxa: string[];
  data: number[][];
}

export interface CharacterMatrix {
  taxa: string[];
  characters: string[][]; // taxa x characters
  type: 'binary' | 'dna';
}

export interface MergeStep {
  step: number;
  clusters: [string, string];
  height: number;
  newSize: number;
}

export interface NJStep {
  iteration: number;
  pair: [string, string];
  qValue: number;
  branchLengths: [number, number];
}

export interface NNIResult {
  step: number;
  edgeSwapped: string;
  scoreBefore: number;
  scoreAfter: number;
}
