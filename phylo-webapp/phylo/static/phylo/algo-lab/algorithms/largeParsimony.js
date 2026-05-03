import { hammingDistanceMatrix } from '../utils/hammingDistance.js';
import { runNJ } from './neighborJoining.js';
import { runFitch } from './fitch.js';

/** Greedy NNI using Fitch score on binary/DNA (simplified: try swaps on Newick string level not exhaustive). */
export function runNNI(charMatrix, taxa, mode) {
  const M = hammingDistanceMatrix(charMatrix, taxa);
  const startNj = runNJ(M, taxa);
  let bestTree = JSON.parse(JSON.stringify(startNj.tree));
  let bestScore = runFitch(bestTree, charMatrix, mode).totalScore;
  const log = [{ step: 0, score: bestScore, note: 'Starting NJ tree on Hamming distances' }];
  let step = 1;
  let improved = true;
  while (improved && step < 30) {
    improved = false;
    const cand = tryOneNNI(bestTree);
    if (cand) {
      const sc = runFitch(cand, charMatrix, mode).totalScore;
      if (sc < bestScore) {
        log.push({ step, scoreBefore: bestScore, scoreAfter: sc, note: 'NNI rearrangement accepted' });
        bestScore = sc;
        bestTree = cand;
        improved = true;
      }
    }
    step++;
  }
  log.push({ summary: `Parsimony ${log[0].score} → ${bestScore} (${step - 1} rounds)` });
  return { startTree: startNj.tree, optimizedTree: bestTree, log, bestScore };
}

/** Rotate at root children — trivial NNI proxy for demo */
function tryOneNNI(tree) {
  if (!tree.children || tree.children.length !== 2) return null;
  const t = JSON.parse(JSON.stringify(tree));
  const a = t.children[0];
  const b = t.children[1];
  if (a.children && a.children.length === 2) {
    t.children[0] = { ...a, children: [a.children[1], a.children[0]] };
    return t;
  }
  return null;
}
