# Final Control Report (Topic 15)
## UPGMA, Neighbor Joining, and Maximum Parsimony

**Discipline:** Bioinformatics  
**Theme:** Distance-based reconstruction (UPGMA, Neighbor Joining) and character-based maximum parsimony (Fitch), including minimum and maximum frugality on candidate topologies.

---

## Abstract

This report presents Topic 15 work centered on **three phylogenetic methods**: **UPGMA**, **Neighbor Joining (NJ)**, and **maximum parsimony** implemented with the **Fitch** algorithm for unrooted quartet topologies. Distance methods take a symmetric dissimilarity matrix and produce a tree; maximum parsimony scores aligned sequences on each of three competing four-taxon topologies and compares **minimum frugality** (best parsimony score) with **maximum frugality** (worst among the three).

Implementation has two parts: a **Python console program** (`simple-algorithm/topic15_simple.py`) that implements only these three methods, and a **Django web application** with an algorithm lab where users can run analyses, inspect tables and figures, and save runs to a database with authentication and validation.

---

## Table of Contents

1. Introduction  
2. Chapter 1 — Theoretical background (UPGMA, NJ, maximum parsimony)  
3. Chapter 2 — Algorithm and Python program  
4. Chapter 3 — System / website implementation  
5. Discussion  
6. Conclusion  
7. References  

---

## 1. Introduction

Phylogenetic reconstruction asks how observed taxa relate evolutionarily when the true history is unknown [1], [2]. This report narrows the topic to three classical, complementary tools:

- **UPGMA** — agglomerative clustering from a distance matrix; fast and interpretable but assumes roughly clock-like evolution [6], [11].  
- **Neighbor Joining** — also matrix-based, but uses the **Q** criterion so the next join need not be the smallest raw distance [12], [13].  
- **Maximum parsimony** — evaluates explicit topologies on **character** (sequence) data by minimizing implied changes; here the **Fitch** algorithm supplies the score [9], [10].

The Python script `topic15_simple.py` is intentionally limited to these three methods so the report, code, and demos stay aligned. The web lab exposes the same ideas with richer visualization and saved runs.

---

## 2. Chapter 1 — Theoretical background

### 2.1 Phylogenetic trees

A phylogenetic tree connects taxa (leaves) through inferred ancestors (internal nodes). Branches may carry lengths (distances) or be unscaled for parsimony-only comparison [1], [2].

### 2.2 Distance matrix

Input is an `n × n` matrix `D` with `D(i,i)=0`, symmetry `D(i,j)=D(j,i)`, and non-negative entries [5], [6]. Algorithms in this report **validate** these properties before running.

### 2.3 UPGMA

UPGMA repeatedly merges the **closest** pair of clusters and sets the new cluster’s height to half their inter-cluster distance; distances to other clusters are updated by **arithmetic mean** over member pairs [6], [7]. The result is a **rooted** ultrametric-style tree when the data match the model; violations can mislead the topology [6], [11].

### 2.4 Neighbor Joining

For each active set of labels, NJ computes `r(i)` = sum of distances from `i` to all other active taxa, then

`Q(i,j) = (n−2)·d(i,j) − r(i) − r(j)`.

The pair with **minimum Q** is joined; branch lengths to the new node follow the standard Saitou–Nei formulas [12], [13]. NJ is still distance-based but is often less sensitive than UPGMA to rate heterogeneity among lineages.

### 2.5 Maximum parsimony (Fitch)

Given a **fixed** tree topology and aligned sequences, parsimony counts the minimum number of **state changes** needed along the tree [9], [10]. The **Fitch** algorithm processes one site at a time: leaves carry singleton state sets; at an internal node, if the child sets **intersect**, that intersection is kept with cost **0**; otherwise the **union** is kept and cost **+1** is added. The topology’s score is the sum over all sites.

For **four taxa**, there are **three** unrooted bifurcating topologies (three ways to pair the four leaves). Comparing their Fitch scores identifies the **most parsimonious** topology (minimum frugality). Reporting the **maximum** score among the same three highlights how strongly the data distinguish topologies (maximum frugality as a contrast, not “best biology”).

### 2.6 How the three methods fit together

| Input | Method | Output emphasis |
|--------|--------|------------------|
| Distance matrix | UPGMA | Single hierarchical tree, ultrametric assumption |
| Distance matrix | NJ | Single tree, Q-based joins |
| Aligned characters | Maximum parsimony (Fitch) | Scores + best/worst of three quartet topologies |

---

## 3. Chapter 2 — Algorithm and Python program

### 3.1 Scope of `topic15_simple.py`

The program implements **only**:

1. **UPGMA** — `upgma(taxa, matrix)` with printed steps and SVG dendrogram snapshots under `simple-algorithm-output/`.  
2. **Neighbor Joining** — `neighbor_joining(taxa, matrix)` using the same merge logic as the web lab’s NJ module; prints Q/D-style trace, saves SVG and optional PNG figures.  
3. **Maximum parsimony** — `run_character_mode()` reads four `Taxon:SEQUENCE` lines, builds three quartet topologies, computes **`fitch_score`**, prints site-wise detail and **minimum / maximum frugality** trees.

There are **no** four-point tests, hierarchical linkage variants, Sankoff costs, perfect phylogeny checks, or likelihood routines in this file.

### 3.2 User flow

1. Run `python topic15_simple.py`.  
2. Choose **1** — distance mode: enter taxa, square matrix, then **UPGMA** or **NJ**.  
3. Choose **2** — maximum parsimony: enter four aligned sequences in `Name:SEQ` format.

### 3.3 Core logic (excerpt)

Parsimony scoring (Fitch) over all sites:

```python
def fitch_score(topology, chars):
    def walk(node, site):
        if isinstance(node, str):
            return {site[node]}, 0
        lset, lscore = walk(node[0], site)
        rset, rscore = walk(node[1], site)
        inter = lset & rset
        if inter:
            return inter, lscore + rscore
        return lset | rset, lscore + rscore + 1

    taxa = list(chars.keys())
    length = len(next(iter(chars.values())))
    total = 0
    for i in range(length):
        site = {t: chars[t][i] for t in taxa}
        _, s = walk(topology, site)
        total += s
    return total
```

### 3.4 Example cases

**UPGMA / NJ (four taxa)** — symmetric matrix with rows  
`0,5,9,9` / `5,0,10,10` / `9,10,0,8` / `9,10,8,0`  
UPGMA merges close pairs first; NJ follows Q matrices at each iteration.

**Maximum parsimony** —  
`A:ATGC`, `B:ATGT`, `C:CTGC`, `D:CTGT`  
Typical outcome: two topologies tie at the minimum score and the third is less parsimonious; the script prints all three scores and min/max frugality labels.

**Validation** — non-symmetric or invalid diagonal triggers a clear `ValueError`.

---

## 4. Chapter 3 — System / website implementation

### 4.1 Role of the web app relative to this report

The Django **algorithm lab** includes interactive sections for **UPGMA**, **Neighbor Joining**, and **maximum parsimony**, consistent with the three methods documented here and with the simple Python program. Users enter matrices or sequences, run the chosen section, view tables and tree-style graphics, and may **save** analyses via `/api/runs/save/` and reload them from `/api/runs/<id>/` [17].

### 4.2 Stack and persistence

- Templates plus JavaScript for the lab UI.  
- Django views and APIs.  
- SQLite (via ORM) storing `AnalysisRun` (`analysis_type`, `input_payload`, `result_payload`, timestamps).

### 4.3 Security (summary)

Authentication for protected routes, CSRF on writes, and server-side checks so users only access their own saved runs [17].

---

## 5. Discussion

**Strengths:** The three-method scope keeps theory, the console script, and the written report aligned. UPGMA and NJ share one input type (matrix), which makes classroom comparison easy. Maximum parsimony makes **frugality** concrete via Fitch totals on three topologies.

**Limits:** UPGMA assumes approximate ultrametricity [6], [11]. Parsimony can be inconsistent under some simulation models and here is restricted to **four taxa** and three trees in the simple script. The website can present richer cases but the pedagogical core remains the same trio of methods.

**Possible extensions:** More taxa under parsimony heuristics, bootstrap support, or export to standard Newick tools—outside the minimal script but natural for a larger project.

---

## 6. Conclusion

The project satisfies Topic 15 goals **as focused in this document**: theoretical explanation and working implementations of **UPGMA**, **Neighbor Joining**, and **maximum parsimony (Fitch)**, plus minimum/maximum frugality on quartet topologies, with a matching Python module and a web system for interactive use and saved reproducible runs.

---

## 7. References

[1] J. Felsenstein, *Inferring Phylogenies*. Sinauer Associates, 2004.  
[2] C. Semple and M. Steel, *Phylogenetics*. Oxford University Press, 2003.  
[3] M. Nei and S. Kumar, *Molecular Evolution and Phylogenetics*. Oxford University Press, 2000.  
[4] D. Gusfield, *Algorithms on Strings, Trees, and Sequences*. Cambridge University Press, 1997.  
[5] "Distance-matrix method," Wikipedia. https://en.wikipedia.org/wiki/Distance-matrix_method  
[6] "UPGMA," Wikipedia. https://en.wikipedia.org/wiki/UPGMA  
[7] "Hierarchical clustering," Wikipedia. https://en.wikipedia.org/wiki/Hierarchical_clustering (context for UPGMA as average-linkage-style updating)  
[8] "Phylogenetic inference," Wikipedia. https://en.wikipedia.org/wiki/Phylogenetic_inference  
[9] "Maximum parsimony (phylogenetics)," Wikipedia. https://en.wikipedia.org/wiki/Maximum_parsimony_(phylogenetics)  
[10] W. M. Fitch, "Toward Defining the Course of Evolution: Minimum Change for a Specific Tree Topology," *Systematic Zoology*, 1971.  
[11] "Ultrametric space — applications in phylogenetics," Wikipedia. https://en.wikipedia.org/wiki/Ultrametric_space#Applications_in_phylogenetics  
[12] N. Saitou and M. Nei, "The Neighbor-Joining Method," *Molecular Biology and Evolution*, 1987.  
[13] "Neighbor joining," Wikipedia. https://en.wikipedia.org/wiki/Neighbor_joining  
[17] Django Documentation (Security, Auth, CSRF). https://docs.djangoproject.com/
