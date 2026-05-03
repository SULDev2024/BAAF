import { BioTreeNode, DistanceMatrix, NJStep } from "../types";
import { cloneMatrix } from "../utils/matrixUtils";

export function runNJ(matrix: DistanceMatrix): { tree: BioTreeNode, history: NJStep[] } {
  let currMatrix = cloneMatrix(matrix);
  let taxaNodes: BioTreeNode[] = matrix.taxa.map(name => ({
    name,
    isLeaf: true,
    branchLength: 0,
    children: []
  }));

  let history: NJStep[] = [];
  let internalNodeCounter = 1;

  while (taxaNodes.length > 2) {
    const n = taxaNodes.length;
    const r = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        r[i] += currMatrix.data[i][j];
      }
    }

    let minQ = Infinity;
    let minI = -1, minJ = -1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const q = (n - 2) * currMatrix.data[i][j] - r[i] - r[j];
        if (q < minQ) {
          minQ = q;
          minI = i;
          minJ = j;
        }
      }
    }

    const d_ij = currMatrix.data[minI][minJ];
    const bLenI = 0.5 * d_ij + (r[minI] - r[minJ]) / (2 * (n - 2));
    const bLenJ = d_ij - bLenI;

    const nodeI = taxaNodes[minI];
    const nodeJ = taxaNodes[minJ];
    nodeI.branchLength = bLenI;
    nodeJ.branchLength = bLenJ;

    const newNode: BioTreeNode = {
      name: `U${internalNodeCounter++}`,
      isLeaf: false,
      branchLength: 0,
      children: [nodeI, nodeJ]
    };

    history.push({
      iteration: history.length + 1,
      pair: [nodeI.name, nodeJ.name],
      qValue: minQ,
      branchLengths: [bLenI, bLenJ]
    });

    // Update matrix
    const nextTaxaNodes: BioTreeNode[] = [];
    for (let k = 0; k < n; k++) {
      if (k !== minI && k !== minJ) nextTaxaNodes.push(taxaNodes[k]);
    }
    nextTaxaNodes.push(newNode);

    const nextN = nextTaxaNodes.length;
    const nextData: number[][] = Array.from({ length: nextN }, () => new Array(nextN).fill(0));
    for (let i = 0; i < nextN; i++) {
      for (let j = 0; j < nextN; j++) {
        if (i === j) continue;
        if (i < nextN - 1 && j < nextN - 1) {
          const idxI = taxaNodes.indexOf(nextTaxaNodes[i]);
          const idxJ = taxaNodes.indexOf(nextTaxaNodes[j]);
          nextData[i][j] = currMatrix.data[idxI][idxJ];
        } else {
          const k = (i === nextN - 1) ? j : i;
          const otherNode = nextTaxaNodes[k];
          const idxK = taxaNodes.indexOf(otherNode);
          nextData[i][j] = 0.5 * (currMatrix.data[minI][idxK] + currMatrix.data[minJ][idxK] - d_ij);
          nextData[j][i] = nextData[i][j];
        }
      }
    }

    taxaNodes = nextTaxaNodes;
    currMatrix = { taxa: taxaNodes.map(t => t.name), data: nextData };
  }

  // Last 2 nodes
  const node1 = taxaNodes[0];
  const node2 = taxaNodes[1];
  const dist = currMatrix.data[0][1];
  
  // We need to return a rooted representation for the renderer or handle unrooted specially.
  // The request says "unrooted phylogenetic tree using D3.js force-directed layout".
  // To keep consistent object format, we can root it arbitrarily or add a flag.
  node1.branchLength = dist / 2;
  node2.branchLength = dist / 2;
  const root: BioTreeNode = {
    name: "ROOT",
    isLeaf: false,
    branchLength: 0,
    children: [node1, node2]
  };

  return { tree: root, history };
}
