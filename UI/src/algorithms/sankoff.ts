import { BioTreeNode, CharacterMatrix } from "../types";

export function runSankoff(
  tree: BioTreeNode, 
  charMatrix: CharacterMatrix, 
  costMatrix: number[][] // states x states
): {
  totalCost: number;
  tree: BioTreeNode;
} {
  const states = charMatrix.type === 'binary' ? ['0', '1'] : ['A', 'C', 'G', 'T'];
  const stateToIndex = new Map(states.map((s, i) => [s, i]));
  const numChars = charMatrix.characters[0].length;
  const taxaMap = new Map(charMatrix.taxa.map((name, i) => [name, charMatrix.characters[i]]));
  
  const treeClone = JSON.parse(JSON.stringify(tree)) as BioTreeNode;
  let totalCost = 0;

  for (let charIdx = 0; charIdx < numChars; charIdx++) {
    // Pass 1: Bottom-up
    function pass1(node: BioTreeNode): number[] {
      const costs = new Array(states.length).fill(Infinity);
      if (node.isLeaf) {
        const char = taxaMap.get(node.name)![charIdx];
        const idx = stateToIndex.get(char)!;
        costs[idx] = 0;
        (node as any).sankoffCosts = (node as any).sankoffCosts || [];
        (node as any).sankoffCosts[charIdx] = costs;
        return costs;
      }

      const childCosts = node.children.map(c => pass1(c));
      
      for (let sIdx = 0; sIdx < states.length; sIdx++) {
        let sum = 0;
        for (let childIdx = 0; childIdx < childCosts.length; childIdx++) {
          let minChildCost = Infinity;
          for (let tIdx = 0; tIdx < states.length; tIdx++) {
            const cost = costMatrix[sIdx][tIdx] + childCosts[childIdx][tIdx];
            if (cost < minChildCost) minChildCost = cost;
          }
          sum += minChildCost;
        }
        costs[sIdx] = sum;
      }

      (node as any).sankoffCosts = (node as any).sankoffCosts || [];
      (node as any).sankoffCosts[charIdx] = costs;
      return costs;
    }

    const rootCosts = pass1(treeClone);
    let minCost = Math.min(...rootCosts);
    totalCost += minCost;

    // Pass 2: Top-down
    function pass2(node: BioTreeNode, parentStateIdx?: number) {
      const costs = (node as any).sankoffCosts[charIdx];
      let assignedIdx: number;

      if (parentStateIdx === undefined) {
        assignedIdx = costs.indexOf(minCost);
      } else {
        // Child state that minimized the recurrence
        let bestIdx = -1;
        let bestVal = Infinity;
        for (let tIdx = 0; tIdx < states.length; tIdx++) {
          const val = costMatrix[parentStateIdx][tIdx] + costs[tIdx];
          if (val < bestVal) {
            bestVal = val;
            bestIdx = tIdx;
          }
        }
        assignedIdx = bestIdx;
      }

      (node as any).assignedSankoffStates = (node as any).assignedSankoffStates || [];
      (node as any).assignedSankoffStates[charIdx] = states[assignedIdx];

      for (let child of node.children) {
        pass2(child, assignedIdx);
      }
    }

    pass2(treeClone);
  }

  return { totalCost, tree: treeClone };
}
