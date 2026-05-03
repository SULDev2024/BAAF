import { BioTreeNode, DistanceMatrix, MergeStep } from "../types";
import { cloneMatrix } from "../utils/matrixUtils";

export function runUPGMA(matrix: DistanceMatrix): { tree: BioTreeNode, history: MergeStep[] } {
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

    const height = minD / 2;
    const nodeA = clusters[minI];
    const nodeB = clusters[minJ];
    const sizeA = clusterSizes[minI];
    const sizeB = clusterSizes[minJ];
    const newClusterName = `(${nodeA.name},${nodeB.name})`;

    const newNode: BioTreeNode = {
      name: newClusterName,
      isLeaf: false,
      branchLength: 0, // Root or internal
      children: [nodeA, nodeB],
      mergeHeight: height
    };
    
    // Set branch lengths for children
    nodeA.branchLength = height - (nodeA.mergeHeight || 0);
    nodeB.branchLength = height - (nodeB.mergeHeight || 0);

    history.push({
      step: history.length + 1,
      clusters: [nodeA.name, nodeB.name],
      height: height,
      newSize: sizeA + sizeB
    });

    // Update distance matrix
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
    let newTaxa: string[] = [];

    for (let i = 0; i < nextN; i++) {
        for (let j = 0; j < nextN; j++) {
            if (i === j) continue;
            if (i < nextN - 1 && j < nextN - 1) {
                // Find original indices
                let origI = clusters.indexOf(newClusters[i]);
                let origJ = clusters.indexOf(newClusters[j]);
                newData[i][j] = currMatrix.data[origI][origJ];
            } else {
                // Distance to new cluster
                let k = (i === nextN - 1) ? j : i;
                let otherCluster = newClusters[k];
                let otherIdx = clusters.indexOf(otherCluster);
                
                newData[i][j] = (sizeA * currMatrix.data[minI][otherIdx] + sizeB * currMatrix.data[minJ][otherIdx]) / (sizeA + sizeB);
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
