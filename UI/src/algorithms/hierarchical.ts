import { BioTreeNode, DistanceMatrix, MergeStep } from "../types";
import { cloneMatrix } from "../utils/matrixUtils";

export type LinkageMethod = 'single' | 'complete' | 'average';

export function runHierarchical(matrix: DistanceMatrix, method: LinkageMethod): { tree: BioTreeNode, history: MergeStep[] } {
  let currMatrix = cloneMatrix(matrix);
  let n = currMatrix.taxa.length;
  let clusters: BioTreeNode[] = matrix.taxa.map(name => ({
    name,
    isLeaf: true,
    branchLength: 0,
    children: [],
    mergeHeight: 0
  }));

  let clusterSizes = new Array(n).fill(1);
  let history: MergeStep[] = [];

  while (clusters.length > 1) {
    let minD = Infinity;
    let minI = -1, minJ = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (currMatrix.data[i][j] < minD) {
          minD = currMatrix.data[i][j];
          minI = i;
          minJ = j;
        }
      }
    }

    const distAtMerge = currMatrix.data[minI][minJ];
    const height = distAtMerge / 2; // Dendrogram height
    const nodeA = clusters[minI];
    const nodeB = clusters[minJ];
    const sizeA = clusterSizes[minI];
    const sizeB = clusterSizes[minJ];

    const newNode: BioTreeNode = {
      name: `(${nodeA.name},${nodeB.name})`,
      isLeaf: false,
      branchLength: 0,
      children: [nodeA, nodeB],
      mergeHeight: height
    };
    
    nodeA.branchLength = height - (nodeA.mergeHeight || 0);
    nodeB.branchLength = height - (nodeB.mergeHeight || 0);

    history.push({
      step: history.length + 1,
      clusters: [nodeA.name, nodeB.name],
      height: distAtMerge,
      newSize: sizeA + sizeB
    });

    let newClusters: BioTreeNode[] = [];
    let newClusterSizes: number[] = [];
    for (let k = 0; k < clusters.length; k++) {
      if (k !== minI && k !== minJ) {
        newClusters.push(clusters[k]);
        newClusterSizes.push(clusterSizes[k]);
      }
    }
    newClusters.push(newNode);
    newClusterSizes.push(sizeA + sizeB);

    const nextN = newClusters.length;
    let newData: number[][] = Array.from({ length: nextN }, () => new Array(nextN).fill(0));

    for (let i = 0; i < nextN; i++) {
      for (let j = 0; j < nextN; j++) {
        if (i === j) newData[i][j] = 0;
        else if (i < nextN - 1 && j < nextN - 1) {
          const idxI = clusters.indexOf(newClusters[i]);
          const idxJ = clusters.indexOf(newClusters[j]);
          newData[i][j] = currMatrix.data[idxI][idxJ];
        } else {
          const k = (i === nextN - 1) ? j : i;
          const otherNode = newClusters[k];
          const idxK = clusters.indexOf(otherNode);
          
          const d_i_k = currMatrix.data[minI][idxK];
          const d_j_k = currMatrix.data[minJ][idxK];

          if (method === 'single') newData[i][j] = Math.min(d_i_k, d_j_k);
          else if (method === 'complete') newData[i][j] = Math.max(d_i_k, d_j_k);
          else { // average
            newData[i][j] = (sizeA * d_i_k + sizeB * d_j_k) / (sizeA + sizeB);
          }
          newData[j][i] = newData[i][j];
        }
      }
    }

    currMatrix = { taxa: newClusters.map(c => c.name), data: newData };
    clusters = newClusters;
    clusterSizes = newClusterSizes;
  }

  return { tree: clusters[0], history };
}
