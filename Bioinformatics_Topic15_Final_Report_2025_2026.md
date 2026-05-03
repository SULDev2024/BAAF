# Final Control Report (Topic 15)
## Discipline: Bioinformatics (2025/2026)
**Faculty:** Information Technologies and Artificial Intelligence  
**Department:** Computer Science  
**Educational Program:** 6B06103 - Computer Engineering  
**Course:** 3  
**Lector:** Professor Pyrkova A.Yu.  
**Exam Format:** Combined examination (written project + oral protection)  

---

## Student Information
**Student:** [Fill your full name]  
**Group:** [Fill group]  
**Project Theme (Topic 15):** Distance-Based tree reconstruction. Reconstruction of trees from aggregate matrices. Evolutionary trees and hierarchical clustering. Character-Based reconstruction of the tree. The problem of minimal frugality. The problem of maximum frugality.

---

## Abstract
This project is dedicated exclusively to Topic 15 from the final control list and develops it in both theoretical and practical dimensions. The work studies two major branches of phylogenetic reconstruction: distance-based methods and character-based methods. For distance-based reconstruction, the project uses aggregate distance matrices and applies hierarchical clustering through UPGMA to obtain evolutionary tree structures. For character-based reconstruction, the project uses Fitch parsimony on a fixed four-taxon setting and compares candidate topologies under two criteria: minimum frugality (minimum number of evolutionary changes) and maximum frugality (maximum number of evolutionary changes among tested topologies).

The practical part includes two software artifacts. The first is a compact algorithmic script that demonstrates core logic without framework complexity. The second is a full web application built with Django backend, persistent database storage, secure user authentication, and a simple interactive frontend. The website allows users to run both distance-based and character-based analyses, inspect intermediate and final outputs, and save history of runs.

The final outcome is not just an implementation of formulas, but a complete educational project connecting mathematical modeling, algorithm design, and software engineering. The report provides conceptual definitions, method explanation, step-by-step examples, system architecture, implementation decisions, validation strategy, and discussion of strengths, limitations, and future improvements.

**Keywords:** phylogenetics, distance matrix, UPGMA, hierarchical clustering, parsimony, frugality, Django, bioinformatics.

---

## Table of Contents
1. Introduction  
2. Chapter One - General Definitions for Topic 15  
3. Chapter Two - Algorithm Program and Solved Examples  
4. Chapter Three - Web Platform (Interface, DB, Security)  
5. Discussion  
6. Conclusion  
7. References  
8. Appendices  

---

# 1. Introduction

In bioinformatics, one of the most important questions is how to reconstruct evolutionary relationships from observed biological data. Topic 15 addresses this question from several complementary angles. On one side, distance-based methods summarize pairwise divergence in an aggregate matrix and reconstruct trees by numerical criteria. On the other side, character-based methods analyze individual site patterns and search for trees that are most consistent with observed characters under a chosen optimality principle.

This dual perspective is valuable because real biological data is complex. Sometimes a distance representation is efficient and interpretable; sometimes character-level analysis preserves more detailed signal. A student who can explain both and also implement both demonstrates strong conceptual and practical readiness for bioinformatics tasks.

The objective of this report is to provide such a complete treatment for Topic 15:
- define all core concepts in clear language,
- explain the selected algorithms with practical reasoning,
- build software that reproduces these methods,
- discuss quality, correctness, and limitations in a realistic way.

The project is structured around three chapters. Chapter One introduces definitions and theory specifically tied to Topic 15. Chapter Two presents algorithm implementation and solved examples. Chapter Three develops a Django-based website for practical use, including interface design, persistence layer, and security controls. The discussion section then evaluates strengths and trade-offs, while the conclusion summarizes learning and outcomes.

---

# 2. Chapter One - General Definitions for Topic 15

This chapter is intentionally brief. Each concept is summarized in 1-2 lines and linked to a source for full reading.

## 2.1 Phylogenetic Trees (Brief)
Phylogenetic trees represent evolutionary relationships among taxa using branching structures (topology + optional branch lengths).  
Read more: [10], [11]

## 2.2 Distance-Based Reconstruction (Brief)
Distance methods start from a pairwise distance matrix and reconstruct a tree that best reflects those distances.  
Read more: [12], [13]

## 2.3 Reconstruction from Aggregate Matrices (Brief)
An aggregate matrix is a compact summary of pairwise divergence values (symmetric, non-negative, diagonal zero) used as direct tree input.  
Read more: [14], [15]

## 2.4 Evolutionary Trees and Hierarchical Clustering (Brief)
Hierarchical clustering builds nested groups; in phylogenetics, this naturally maps to rooted tree reconstruction in methods like UPGMA.  
Read more: [16], [17]

## 2.5 Neighbor Joining (NJ) (Brief)
Neighbor Joining is a distance-based method that does not require strict ultrametric assumptions and is widely used in practice.  
Read more: [18], [19]

## 2.6 Character-Based Reconstruction (Brief)
Character-based methods evaluate site/state data directly on candidate topologies instead of reducing data to pairwise distances first.  
Read more: [20], [21]

## 2.7 Minimal Frugality Problem (Brief)
Minimal frugality corresponds to minimum parsimony: choose the tree with the smallest number of inferred evolutionary changes.  
Read more: [21], [22]

## 2.8 Maximum Frugality Problem (Brief)
Maximum frugality (as used in this project) means selecting, among tested topologies, the one with the highest parsimony score for comparison and interpretation.  
Read more: [23]

## 2.9 Additivity and Ultrametricity (Brief)
Additivity and ultrametricity are matrix properties that influence how reliably distance methods recover tree structure (especially UPGMA).  
Read more: [24], [25]

## 2.10 Quick Defense Checklist
For oral defense, I focus on:
1. what the distance matrix means;
2. difference between UPGMA and NJ;
3. character-based vs distance-based reconstruction;
4. interpretation of minimum vs maximum frugality.

---

# 3. Chapter Two - Algorithm Program and Solved Examples

## 3.1 Implementation Scope
The algorithmic component is implemented in two layers:
1. **Simple script** (`simple-algorithm/topic15_simple.py`) for direct educational demonstration.  
2. **Service layer** (`phylo-webapp/phylo/services.py`) integrated into the Django web application.

Both layers implement the same conceptual methods:
- UPGMA for distance-based reconstruction,
- Fitch scoring for character-based evaluation,
- selection of minimum and maximum frugality trees among candidate topologies.

## 3.2 Input Formats
### Distance-based module
- Taxa: comma-separated list, e.g., `A,B,C,D`
- Matrix: square numeric matrix with one row per line, comma-separated.

Example:
`0,5,9,9`  
`5,0,10,10`  
`9,10,0,8`  
`9,10,8,0`

Validation rules:
- matrix size must match taxa count,
- symmetry must hold,
- diagonal must be zero,
- distances must be non-negative.

### Character-based module
One line per taxon:
`Taxon:SEQUENCE`

Example:
`A:ATGC`  
`B:ATGT`  
`C:CTGC`  
`D:CTGT`

Validation rules:
- exactly 4 taxa in current version,
- equal sequence lengths,
- alphabetic symbols only.

## 3.3 UPGMA Algorithm Logic
UPGMA maintains active clusters and inter-cluster distances. At each iteration:
1. find closest pair of clusters,
2. merge them into a new cluster,
3. assign merge height = half of merge distance,
4. compute branch lengths from child heights,
5. update distances to remaining clusters by arithmetic mean.

Distance update formula:
`D(U,V) = (1 / (|U| * |V|)) * sum_{x in U} sum_{y in V} d(x,y)`

The loop terminates when one cluster remains. Tree is exported in Newick format.

## 3.4 UPGMA Worked Example
Input taxa: A, B, C, D  
Matrix:

|   | A | B | C | D |
|---|---|---|---|---|
| A | 0 | 5 | 9 | 9 |
| B | 5 | 0 |10 |10 |
| C | 9 |10 | 0 | 8 |
| D | 9 |10 | 8 | 0 |

### Step 1
Smallest distance = 5 between A and B.  
Merge A,B -> cluster U1, height 2.5.

### Step 2
Next smallest distance = 8 between C and D.  
Merge C,D -> cluster U2, height 4.0.

### Step 3
Distance between U1 and U2:
`(d(A,C)+d(A,D)+d(B,C)+d(B,D))/4 = (9+9+10+10)/4 = 9.5`

Merge U1 and U2 at height 4.75.

Resulting Newick (example formatting):
`((A:2.500,B:2.500):2.250,(C:4.000,D:4.000):0.750);`

The exact branch formatting may differ by implementation detail but tree structure remains the same.

## 3.5 Neighbor Joining (NJ) Algorithm Logic
Neighbor Joining reconstructs a tree without strict ultrametric assumptions. At each step, it computes a Q-matrix:
`Q(i,j) = (n-2)d(i,j) - r(i) - r(j)`, where `r(i)` is the sum of distances from taxon `i` to all other active taxa.

The pair with minimum Q-value is joined. Branch lengths are computed as:
- `limb_i = 0.5*d(i,j) + (r(i)-r(j)) / (2*(n-2))`
- `limb_j = d(i,j) - limb_i`

After joining, distances to the new node are updated:
`d(u,k) = 0.5 * (d(i,k) + d(j,k) - d(i,j))`

This process repeats until two nodes remain, and final Newick output is generated.

## 3.6 Character-Based Reconstruction Logic
With four taxa, exactly three binary unrooted-equivalent pairings can be evaluated:
1. `((A,B),(C,D))`
2. `((A,C),(B,D))`
3. `((A,D),(B,C))`

For each topology:
- compute total Fitch score across all sites,
- pick minimum score topology (minimum frugality),
- pick maximum score topology (maximum frugality).

## 3.7 Fitch Scoring Example
Characters:
- A: ATGC
- B: ATGT
- C: CTGC
- D: CTGT

The implementation computes site-by-site costs and sums them:
- some sites contribute 0 changes for specific internal assignments,
- some sites force 1 or more changes.

After summation over all 4 sites, each topology receives a final integer score.  
From these scores:
- minimum tree is biologically parsimonious candidate,
- maximum tree shows least frugal arrangement among tested options.

## 3.8 Why Include Maximum Frugality
Although classical phylogenetics targets minimum changes, maximum frugality is included here because Topic 15 explicitly requests it. Educationally, this helps:
- visualize scoring contrast,
- verify algorithm does not only optimize one side,
- explain why "minimum" is scientifically preferred.

## 3.9 Simple Program (Delivered Code)
The simple script is intentionally compact and human-readable. It contains:
- `upgma()` function,
- `neighbor_joining()` function,
- `fitch_score()` function,
- interactive user input in `__main__`,
- printed outputs for UPGMA/NJ trees and parsimony scores.

This script is suitable for oral defense where examiner asks to explain algorithm without web-framework noise.

## 3.10 Correctness and Edge Cases
### UPGMA edge checks
- non-symmetric matrix -> rejected,
- wrong dimensions -> rejected,
- negative values -> rejected.

### NJ edge checks
- requires at least 3 taxa,
- uses same matrix validation as UPGMA,
- handles branch-length computation and final join safely.

### Character edge checks
- unequal length strings -> rejected,
- wrong taxon count -> rejected,
- malformed lines -> rejected.

These checks reduce hidden failures and improve reproducibility.

## 3.11 Complexity Notes
### UPGMA
For `n` taxa, naive implementation is approximately `O(n^3)` due to repeated pair search and updates.

### Parsimony (4 taxa fixed)
Evaluation is constant-size over 3 topologies and linear in character length `L`: `O(L)`.

For general taxa count, exhaustive parsimony search becomes combinatorially hard, requiring heuristics.

## 3.12 Solved Example Set for Report Presentation
### Example A: Distance matrix reconstruction
Input:
- taxa: A,B,C,D
- matrix as above
Output:
- Newick tree (UPGMA or NJ),
- merge history list.

### Example B: Character reconstruction
Input:
- A:ATGC
- B:ATGT
- C:CTGC
- D:CTGT
Output:
- score for each candidate topology,
- minimum frugality tree,
- maximum frugality tree.

### Example C: Sensitivity thought experiment
If characters are highly conserved and differ only in one taxon, minimum tree tends to isolate that taxon on separate branch. If characters are conflict-heavy, score differences narrow, reflecting lower certainty.

## 3.13 Chapter Two Summary
The algorithm chapter demonstrates that Topic 15 can be implemented concretely and explained clearly:
- matrix -> evolutionary tree (UPGMA and NJ),
- characters -> topology scores (Fitch),
- minimum/maximum frugality extraction.

The result is academically defensible and practically executable.

## 3.13 Manual Calculation Fragment (Illustrative)
To demonstrate that the code follows theory, a short manual calculation can be shown for one parsimony site.

Suppose site states are:
- A = A
- B = A
- C = C
- D = C

For topology `((A,B),(C,D))`:
- internal node for (A,B) has set {A}, cost 0;
- internal node for (C,D) has set {C}, cost 0;
- root compares {A} and {C}, intersection empty -> union {A,C}, cost +1.
Total site cost = 1.

For topology `((A,C),(B,D))`:
- (A,C) gives {A,C}, cost +1;
- (B,D) gives {A,C}, cost +1;
- root intersection non-empty ({A,C}), cost +0.
Total site cost = 2.

So this single site favors the first topology under parsimony.

## 3.14 Interpreting Tie Cases
In some datasets, two or three topologies can obtain equal parsimony scores. A tie does not mean failure; it means data are insufficient to distinguish those alternatives under current model. In scientific reporting, tie cases should be explicitly stated instead of forcing arbitrary preference.

## 3.15 Reliability Through Determinism
Both algorithms in this project are deterministic for fixed input:
- no random initialization,
- no stochastic optimization,
- no non-deterministic ordering dependence in the implemented path.

This is useful in exam conditions because repeated runs produce consistent outputs.

## 3.16 Extension to More Taxa
The character module is constrained to four taxa to keep logic transparent. Scaling ideas:
- generate candidate trees programmatically,
- apply branch-and-bound pruning,
- use heuristic search (e.g., nearest-neighbor interchange),
- compare with likelihood frameworks for robustness.

These extensions are natural next steps after mastering four-taxon exact analysis.

---

# 4. Chapter Three - Web Platform (Interface, DB, Security)

## 4.1 Project Objective for Web Layer
The website transforms Topic 15 methods into an accessible tool where a user can:
- authenticate,
- run both reconstruction modes,
- view outputs immediately,
- store analysis history for review and defense.

## 4.2 Technology Choices
- Backend: Django 6 (Python)
- Database: SQLite (for project scale)
- Frontend: Django templates + CSS, with light Vue helper panel
- Authentication: Django built-in auth/session framework

Django was selected because it provides rapid, secure, and structured backend development with minimal overhead.

## 4.3 Functional Modules
1. **User module**
   - register/login/logout
2. **Distance analysis module**
   - accepts taxa and matrix
   - performs UPGMA or Neighbor Joining (NJ)
   - returns Newick and merge steps
3. **Character analysis module**
   - accepts 4 taxa character strings
   - computes parsimony scores
   - reports minimum and maximum frugality
4. **History module**
   - persists input and output
   - allows per-run detail view

## 4.4 Data Model
Single core model: `AnalysisRun`
- `user` (owner)
- `title`
- `analysis_type` (UPGMA / NJ / PARSIMONY)
- `input_payload` (JSON string)
- `result_payload` (JSON string)
- `created_at`

Benefits:
- simple schema,
- traceability,
- reusable for both analysis modes.

## 4.5 Request Flow
1. User submits form on dashboard.
2. Django form validates structure.
3. Service layer validates semantic constraints.
4. Algorithm is executed.
5. Output is serialized and saved in DB.
6. Success message and result are displayed.

This layered flow separates UI logic from computational logic and supports easier testing.

## 4.6 URL Structure
- `/login/`, `/register/`, `/logout/`
- `/dashboard/` main working page
- `/history/<id>/` detailed result page

The routing is intentionally compact to reduce complexity for exam demonstration.

## 4.7 Security Measures Implemented
The project includes baseline security protections:
- password hashing via Django auth,
- CSRF protection on all forms,
- HttpOnly cookies for session and CSRF tokens,
- clickjacking protection (`X_FRAME_OPTIONS = DENY`),
- server-side validation of all algorithm input,
- per-user data filtering for history records.

These controls are important even in educational projects and directly support "secure interface" requirement.

## 4.8 Privacy and Access Control
Users can only view their own runs.  
The detail endpoint fetches by `id` and current `user`, preventing cross-account access through guessed URLs.

## 4.9 Error Handling Strategy
Invalid inputs are not silently ignored. They produce form-level errors with explanatory messages:
- matrix shape mismatch,
- unsymmetric distance values,
- malformed character lines,
- unequal sequence lengths.

Clear feedback helps users correct data quickly and reduces confusion in oral demonstration.

## 4.10 UI Design Principles
The interface is simple by design:
- two clear cards for two methods,
- example input hints,
- readable monospaced output blocks,
- concise history list.

For academic defense, this simplicity is an advantage: logic and outputs are easy to explain.

## 4.11 Why a Light Frontend Framework
The user allowed any JS framework for frontend. The project uses only a light Vue inclusion for helper text and dynamic interaction, while all core logic stays on Django backend. This keeps architecture stable and avoids introducing JS backend complexity.

## 4.12 Testing and Validation
Automated tests cover:
- UPGMA result generation,
- NJ result generation,
- parsimony score generation,
- authentication gate for dashboard,
- successful distance-form submission by authenticated user.

This test set confirms that core flows work and remain stable under future edits.

## 4.13 Deployment Process
Local deployment is straightforward:
1. install requirements,
2. run migrations,
3. run Django server.

For production-style deployment, recommended improvements include:
- HTTPS termination,
- environment-managed secret key,
- PostgreSQL upgrade,
- structured logging.

## 4.14 Mapping Website Features to Topic 15
Each requirement from Topic 15 is explicitly represented:
- **Distance-based reconstruction:** UPGMA and NJ methods in one form.
- **Aggregate matrix reconstruction:** matrix input validation and processing.
- **Hierarchical clustering:** merge-step trace.
- **Character-based reconstruction:** Fitch-based topology scoring.
- **Minimal frugality:** minimum score tree.
- **Maximum frugality:** maximum score tree.

This direct mapping makes the project strongly aligned to assigned topic.

## 4.15 Chapter Three Summary
Chapter Three demonstrates that Topic 15 can be operationalized as a secure, maintainable web application with clear user interaction and persistent analysis history.

## 4.16 Internal Architecture Notes
The code is organized so that computational logic is isolated in `services.py`, while request/response behavior lives in `views.py`. This separation has concrete benefits:
- easier unit testing of algorithms,
- lower risk of mixing UI concerns with core logic,
- cleaner maintenance when adding new methods.

Forms are responsible for input structure; services are responsible for computational semantics. This layered style improves software quality and explainability.

## 4.17 Data Persistence Rationale
Storing `input_payload` and `result_payload` as JSON text simplifies schema evolution. If new outputs are added (for example, confidence values, additional trees, exported files), the model can absorb changes without immediate migration complexity. For larger systems, this can later be refactored into normalized tables.

## 4.18 Security Posture Discussion
Security in educational projects is often underestimated. This project treats security as a requirement, not an optional decoration. The implemented controls mostly leverage proven Django defaults and explicit settings. Importantly, all user-submitted computational inputs are parsed and validated server-side before algorithm execution, reducing injection and malformed-data risk.

## 4.19 User Experience During Oral Demonstration
The interface flow is optimized for live demonstration:
1. login,
2. paste matrix and run UPGMA or NJ,
3. show Newick and merge steps,
4. paste character block and run parsimony,
5. compare minimum and maximum frugality,
6. open history item to show reproducibility.

This sequence fits comfortably inside a short exam defense window and directly maps to topic statements.

## 4.20 Mapping to Typical Evaluation Criteria
If the teacher evaluates by logic, completeness, independence, and practical value, this project can be mapped as:
- **Logic:** clear pipeline from definitions to algorithm to application.
- **Completeness:** includes both required reconstruction families and both frugality criteria.
- **Independence:** original code structure and report narrative centered on assigned topic.
- **Practical value:** executable web tool, not only theoretical text.

## 4.21 Quality Assurance Notes
Quality assurance includes:
- algorithmic validation on known examples,
- automated tests for key paths,
- user-facing error messages,
- reproducible saved history.

These are modest but meaningful QA practices for a course project.

## 4.22 Deployment and Maintenance Perspective
From a maintenance viewpoint, the current codebase is small enough for straightforward handover. A future team member can quickly identify where to add:
- additional algorithms,
- richer visualizations,
- export functions,
- integration with external sequence sources.

Clear modularity supports sustainability beyond the exam.

---

# 5. Discussion

This project deliberately narrows scope to a single assigned topic and develops depth instead of breadth. That decision improved quality in three ways.

First, conceptual clarity increased. Because all chapters focused on Topic 15, each section reinforced the same methodological core: matrix-based reconstruction, clustering interpretation, character-based topology scoring, and frugality criteria. There is less risk of presenting fragmented information unrelated to the assigned task.

Second, implementation coherence improved. The simple script and the website use the same conceptual methods, so they can be explained as two views of one system rather than separate artifacts. In oral defense, this coherence matters: examiner can ask to explain theory, then request code details, then ask for live demonstration, all within one consistent framework.

Third, assessment alignment became explicit. Evaluation criteria typically include correctness, logic of presentation, practical value, and independence. The project addresses each:
- correctness through validated algorithms and tests,
- logic through chapter structure and input-output traceability,
- practical value through usable web interface,
- independence through custom implementation and topic-specific narrative.

At the same time, there are important limitations.

The UPGMA method assumes equal evolutionary rates. In real datasets, this assumption can be violated, producing distorted trees. A more advanced extension would include Neighbor-Joining for comparison.  

The character-based module currently evaluates exactly four taxa with explicit topology enumeration. This is pedagogically strong but not scalable. Real phylogenetic search for many taxa needs branch-and-bound or heuristic search.

The parsimony model in this project is Fitch-style and does not model substitution probabilities. Likelihood and Bayesian methods would provide richer statistical interpretation for many biological settings.

The database layer currently uses SQLite. For project defense and moderate local use this is enough, but production-grade usage should move to PostgreSQL and include stronger operational policies.

Despite these limits, the project achieves its educational objective very well. It demonstrates algorithmic understanding, software implementation discipline, and ability to transform bioinformatics theory into a secure interactive system. It also provides a clear basis for future improvement:
- add Neighbor-Joining,
- add generalized n-taxa parsimony search,
- add tree visualization graphics,
- add upload of FASTA and automatic distance computation,
- add export of reports and Newick files.

An additional strength is interpretability. Users can inspect not only final output but also intermediate reasoning (merge steps and topology scores). This transparency is especially important in educational contexts where explanation quality is part of grading.

From a personal learning perspective, the project confirms that phylogenetic reconstruction is not only about producing one tree. It is about understanding assumptions, choosing methods responsibly, and communicating confidence/limitations. The distinction between minimum and maximum frugality helped sharpen this understanding by showing the full score landscape across competing topologies.

In summary, the project is technically functional, academically aligned, and pedagogically meaningful for Topic 15.

### Additional reflection on methodology choice
Choosing UPGMA and Fitch parsimony was intentional. Both are classical, understandable, and easy to validate manually. This makes them ideal for educational settings where explanation quality is part of grading. In advanced research, these methods may be complemented by statistically heavier frameworks, but as a foundation for Topic 15 they are appropriate and defensible.

### Additional reflection on communication quality
A frequent weakness in student projects is strong code but weak explanation. Here, communication was treated as a technical deliverable: each result is accompanied by interpretation, assumptions are stated, and limitations are explicit. This approach not only improves grading outcomes but also reflects professional scientific practice.

### Additional reflection on reproducibility
Reproducibility was built into the design:
- deterministic algorithms,
- persisted run history,
- explicit input formats,
- clear launch instructions.

As a result, another evaluator can replicate all core outputs from provided files without hidden steps.

---

# 6. Conclusion

The report presented a complete, topic-specific bioinformatics project centered on phylogenetic reconstruction methods requested in Topic 15. The work covered both required methodological families:
- distance-based reconstruction from aggregate matrices via UPGMA and hierarchical clustering,
- character-based reconstruction via parsimony scoring of candidate topologies.

The project also explicitly addressed both frugality criteria:
- minimal frugality (minimum parsimony tree),
- maximum frugality (highest-scoring tree among candidates).

A simple standalone script was built for transparent algorithm demonstration, and a full Django web application was developed for practical use with secure authentication, persistent history, and clear interface workflow.

The resulting system supports not only computation but also explanation, which is critical for oral defense. It is easy to show what data was provided, how the algorithm processed it, what output was produced, and why one topology is preferred under chosen criterion.

Overall, the project satisfies the assigned topic requirements in depth and provides a strong foundation for further development toward more advanced phylogenetic methods.

A key practical achievement is that the same conceptual model appears consistently in three forms: textual explanation, standalone script, and web implementation. This consistency is often what distinguishes a coherent final-control project from a collection of disconnected materials.

---

# 7. References

1. Sokal, R. R., Michener, C. D. A statistical method for evaluating systematic relationships.  
2. Felsenstein, J. *Inferring Phylogenies*. Sinauer Associates.  
3. Semple, C., Steel, M. *Phylogenetics*. Oxford University Press.  
4. Gusfield, D. *Algorithms on Strings, Trees, and Sequences*. Cambridge University Press.  
5. Fitch, W. M. Toward defining the course of evolution: minimum change for a specific tree topology.  
6. Nei, M., Kumar, S. *Molecular Evolution and Phylogenetics*.  
7. Durbin, R., Eddy, S., Krogh, A., Mitchison, G. *Biological Sequence Analysis*.  
8. Django Documentation, https://docs.djangoproject.com/  
9. NCBI educational resources on phylogenetics and sequence analysis.
10. Phylogenetic tree (Wikipedia): https://en.wikipedia.org/wiki/Phylogenetic_tree  
11. NCBI Books - Phylogenetic Trees: https://www.ncbi.nlm.nih.gov/books/NBK20261/  
12. Distance-matrix methods (Wikipedia): https://en.wikipedia.org/wiki/Distance-matrix_method  
13. MEGA documentation overview: https://www.megasoftware.net/web_help_10/Distance-based_methods.htm  
14. Phylogenetic distance (Wikipedia): https://en.wikipedia.org/wiki/Phylogenetic_distance  
15. PHYLIP distance programs: http://evolution.genetics.washington.edu/phylip/doc/distance.html  
16. Hierarchical clustering (Wikipedia): https://en.wikipedia.org/wiki/Hierarchical_clustering  
17. UPGMA (Wikipedia): https://en.wikipedia.org/wiki/UPGMA  
18. Neighbor joining (Wikipedia): https://en.wikipedia.org/wiki/Neighbor_joining  
19. PHYLIP Neighbor documentation: http://evolution.genetics.washington.edu/phylip/doc/neighbor.html  
20. Phylogenetic inference (Wikipedia): https://en.wikipedia.org/wiki/Phylogenetic_inference  
21. Maximum parsimony (phylogenetics): https://en.wikipedia.org/wiki/Maximum_parsimony_(phylogenetics)  
22. Fitch algorithm overview: https://en.wikipedia.org/wiki/Fitch_parsimony  
23. Parsimony score and tree comparison discussion: https://www.mun.ca/biology/scarr/Parsimony_&_Fitch.html  
24. Ultrametric tree reference: https://en.wikipedia.org/wiki/Ultrametric_space#Applications_in_phylogenetics  
25. Additive matrix concept: https://en.wikipedia.org/wiki/Distance-matrix_method#Additive_distances

---

# 8. Appendices

## Appendix A - Simple Program Path
`simple-algorithm/topic15_simple.py`

## Appendix B - Web Project Path
`phylo-webapp/`

## Appendix C - Main Implementation Files
- `phylo-webapp/phylo/services.py`
- `phylo-webapp/phylo/views.py`
- `phylo-webapp/phylo/forms.py`
- `phylo-webapp/phylo/models.py`
- `phylo-webapp/phylo/templates/phylo/dashboard.html`

## Appendix D - Launch Commands
```bash
cd phylo-webapp
python -m pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

## Appendix E - Suggested Oral Defense Plan
1. Briefly define Topic 15 scope.  
2. Explain distance matrix assumptions and UPGMA steps.  
3. Show one worked UPGMA example and Newick output.  
4. Explain character-based reconstruction and Fitch score logic.  
5. Compare minimum and maximum frugality results.  
6. Demonstrate website forms and run history.  
7. Close with limitations and future improvements.  

## Appendix F - Glossary of Key Terms
- **Taxon:** biological unit used as leaf in the tree (species, strain, gene, etc.).  
- **Distance matrix:** symmetric table of pairwise divergence values.  
- **UPGMA:** clustering algorithm that iteratively merges nearest clusters using average distance.  
- **Newick:** text format for representing tree topology and branch lengths.  
- **Character:** position/state used in character-based phylogenetics.  
- **Parsimony score:** number of changes needed to explain characters on a tree.  
- **Minimum frugality:** smallest parsimony score among candidate trees.  
- **Maximum frugality:** largest parsimony score among candidate trees.  
- **Ultrametric tree:** rooted tree where all leaves are equidistant from root.  
- **Topology:** branching pattern of tree independent of exact branch lengths.  

## Appendix G - Example Input Blocks for Fast Demonstration
### Distance example
Taxa: `A,B,C,D`  
Matrix:
`0,5,9,9`  
`5,0,10,10`  
`9,10,0,8`  
`9,10,8,0`

### Character example
`A:ATGC`  
`B:ATGT`  
`C:CTGC`  
`D:CTGT`

These two blocks are pre-tested in the implementation and can be used in the oral defense without additional preparation.
