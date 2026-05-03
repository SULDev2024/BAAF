import { BioTreeNode } from "../types";

export function parseNewick(newick: string): BioTreeNode {
  let index = 0;

  function parseNode(): BioTreeNode {
    let node: Partial<BioTreeNode> = { children: [], branchLength: 0 };

    if (newick[index] === '(') {
      index++; // skip (
      while (true) {
        node.children!.push(parseNode());
        if (newick[index] === ',') {
          index++;
        } else if (newick[index] === ')') {
          index++;
          break;
        } else {
          throw new Error("Expected ',' or ')' at position " + index);
        }
      }
      node.isLeaf = false;
    } else {
      node.isLeaf = true;
    }

    // Name
    let name = "";
    while (index < newick.length && !['(', ')', ',', ':', ';'].includes(newick[index])) {
      name += newick[index];
      index++;
    }
    node.name = name.trim() || ("node_" + Math.random().toString(36).substr(2, 5));

    // Branch length
    if (newick[index] === ':') {
      index++;
      let lengthStr = "";
      while (index < newick.length && !['(', ')', ',', ';'].includes(newick[index])) {
        lengthStr += newick[index];
        index++;
      }
      node.branchLength = parseFloat(lengthStr) || 0;
    }

    return node as BioTreeNode;
  }

  const result = parseNode();
  if (newick[index] === ';') index++;
  return result;
}
