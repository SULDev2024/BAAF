import { BioTreeNode, CharacterMatrix } from "../types";

export function runFitch(tree: BioTreeNode, charMatrix: CharacterMatrix): { 
  totalScore: number, 
  tree: BioTreeNode,
  charScores: number[]
} {
  const numChars = charMatrix.characters[0].length;
  const taxaMap = new Map(charMatrix.taxa.map((name, i) => [name, charMatrix.characters[i]]));
  
  let totalScore = 0;
  let charScores: number[] = new Array(numChars).fill(0);

  // Deep clone tree to avoid modifying original
  const treeClone = JSON.parse(JSON.stringify(tree)) as BioTreeNode;

  for (let charIdx = 0; charIdx < numChars; charIdx++) {
    let currentScore = 0;

    // Pass 1: Bottom-up
    function pass1(node: BioTreeNode): Set<string> {
      if (node.isLeaf) {
        const char = taxaMap.get(node.name)![charIdx];
        const set = new Set([char]);
        (node as any).tempSets = (node as any).tempSets || [];
        (node as any).tempSets[charIdx] = set;
        return set;
      }

      const childSets = node.children.map(c => pass1(c));
      let intersection = new Set<string>();
      for (let s of childSets[0]) {
        if (childSets[1].has(s)) intersection.add(s);
      }

      if (intersection.size > 0) {
        (node as any).tempSets = (node as any).tempSets || [];
        (node as any).tempSets[charIdx] = intersection;
        return intersection;
      } else {
        const union = new Set([...childSets[0], ...childSets[1]]);
        (node as any).tempSets = (node as any).tempSets || [];
        (node as any).tempSets[charIdx] = union;
        currentScore++;
        return union;
      }
    }

    pass1(treeClone);
    charScores[charIdx] = currentScore;
    totalScore += currentScore;

    // Pass 2: Top-down
    function pass2(node: BioTreeNode, parentState?: string) {
      const set = (node as any).tempSets[charIdx] as Set<string>;
      let assigned: string;
      if (!parentState) {
        assigned = Array.from(set)[0];
      } else {
        if (set.has(parentState)) {
          assigned = parentState;
        } else {
          assigned = Array.from(set)[0];
        }
      }
      (node as any).assignedStates = (node as any).assignedStates || [];
      (node as any).assignedStates[charIdx] = assigned;
      
      for (let child of node.children) {
        pass2(child, assigned);
      }
    }

    pass2(treeClone);
  }

  // After processing all characters, we might want to attach visible state sets for one selected character or summary
  // For the UI, we'll store the results
  return { totalScore, tree: treeClone, charScores };
}
