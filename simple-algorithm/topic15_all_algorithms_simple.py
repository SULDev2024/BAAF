from __future__ import annotations

import os
from itertools import combinations
from pathlib import Path

from topic15_simple import run_nj_algorithm

try:
    import matplotlib.pyplot as plt
except Exception:
    plt = None

OUT_DIR = Path("simple-algorithm-output")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def prompt(msg: str) -> str:
    return input(msg).strip()


def parse_taxa() -> list[str]:
    raw = prompt("Taxa (comma-separated, e.g. A,B,C,D): ")
    taxa = [x.strip() for x in raw.split(",") if x.strip()]
    if len(taxa) < 2:
        raise ValueError("Need at least 2 taxa.")
    return taxa


def parse_distance_matrix(taxa: list[str]) -> list[list[float]]:
    n = len(taxa)
    print(f"Enter {n} matrix rows (comma-separated):")
    m: list[list[float]] = []
    for i in range(n):
        row = [float(x.strip()) for x in prompt(f"Row {i+1}: ").split(",")]
        m.append(row)
    validate_distance_matrix(taxa, m)
    return m


def validate_distance_matrix(taxa: list[str], m: list[list[float]]) -> None:
    n = len(taxa)
    if len(m) != n or any(len(r) != n for r in m):
        raise ValueError("Matrix must be square and match taxa count.")
    for i in range(n):
        if abs(m[i][i]) > 1e-9:
            raise ValueError("Diagonal values must be 0.")
        for j in range(n):
            if m[i][j] < 0:
                raise ValueError("Distances must be non-negative.")
            if abs(m[i][j] - m[j][i]) > 1e-9:
                raise ValueError("Matrix must be symmetric.")


def print_matrix(labels: list[str], m: list[list[float]]) -> None:
    print("      " + "  ".join(f"{x:>8}" for x in labels))
    for i, row in enumerate(m):
        cells = []
        for c in row:
            if c is None:
                cells.append(f"{'-':>8}")
            else:
                cells.append(f"{c:>8.3f}")
        print(f"{labels[i]:>6}  " + "  ".join(cells))


def matrix_snapshot(keys: list[str], get_d) -> list[list[float | None]]:
    out = []
    for a in keys:
        row = []
        for b in keys:
            row.append(None if a == b else float(get_d(a, b)))
        out.append(row)
    return out


def build_ascii_tree(node: dict, indent: str = "", edge_label: str = "") -> list[str]:
    label = node["name"]
    head = f"{indent}{edge_label}{label}"
    if node.get("isLeaf", False):
        return [head]
    lines = [head]
    children = node.get("children", [])
    for idx, ch in enumerate(children):
        bl = ch.get("branchLength", 0.0)
        connector = "└─ " if idx == len(children) - 1 else "├─ "
        next_indent = indent + ("   " if idx == len(children) - 1 else "│  ")
        lines.extend(build_ascii_tree(ch, next_indent, f"{connector}[{bl:.3f}] "))
    return lines


def save_ascii_graph(name: str, tree: dict) -> Path:
    p = OUT_DIR / f"{name}.txt"
    p.write_text("\n".join(build_ascii_tree(tree)), encoding="utf-8")
    return p


def open_file(path: Path) -> None:
    try:
        if os.name == "nt":
            os.startfile(path)  # type: ignore[attr-defined]
    except Exception:
        pass


def _collect_leaf_order(node: dict, out: list[str]) -> None:
    if node.get("isLeaf", False):
        out.append(node["name"])
        return
    for ch in node.get("children", []):
        _collect_leaf_order(ch, out)


def save_tree_png(name: str, tree: dict, title: str) -> Path | None:
    if plt is None:
        return None

    leaves: list[str] = []
    _collect_leaf_order(tree, leaves)
    if not leaves:
        return None
    y_pos = {leaf: float(i) for i, leaf in enumerate(leaves)}

    node_xy: dict[int, tuple[float, float]] = {}

    def walk(node: dict, x: float) -> tuple[float, float]:
        node_id = id(node)
        if node.get("isLeaf", False):
            y = y_pos[node["name"]]
            node_xy[node_id] = (x, y)
            return x, y
        child_points = []
        for ch in node.get("children", []):
            cx = x + float(ch.get("branchLength", 0.0))
            child_points.append(walk(ch, cx))
        y = sum(p[1] for p in child_points) / len(child_points)
        node_xy[node_id] = (x, y)
        return x, y

    walk(tree, 0.0)

    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_title(title)
    y_span = max(1.0, float(len(leaves) - 1))
    y_offset = max(0.14, y_span * 0.03)

    def draw(node: dict) -> None:
        px, py = node_xy[id(node)]
        for ch in node.get("children", []):
            cx, cy = node_xy[id(ch)]
            ax.plot([px, cx], [py, py], color="black", linewidth=1.8)
            ax.plot([cx, cx], [py, cy], color="black", linewidth=1.8)
            bl = float(ch.get("branchLength", 0.0))
            ax.text(
                (px + cx) / 2,
                py + y_offset,
                f"{bl:.2f}",
                fontsize=14,
                ha="center",
                va="bottom",
                bbox={"facecolor": "white", "edgecolor": "none", "pad": 0.6, "alpha": 0.8},
            )
            draw(ch)

    draw(tree)

    leaf_nodes = {}

    def collect_leaf_nodes(node: dict) -> None:
        if node.get("isLeaf", False):
            leaf_nodes[node["name"]] = node
            return
        for ch in node.get("children", []):
            collect_leaf_nodes(ch)

    collect_leaf_nodes(tree)
    x_max = max(x for x, _ in node_xy.values())
    x_pad = max(0.05, x_max * 0.03)
    for leaf in leaves:
        leaf_node = leaf_nodes.get(leaf)
        if not leaf_node:
            continue
        lx, ly = node_xy[id(leaf_node)]
        ax.text(lx + x_pad, ly, leaf, va="center", fontsize=14, fontweight="semibold")

    ax.set_yticks([])
    ax.set_xlabel("Branch length")
    ax.set_xlim(left=0.0, right=x_max + x_pad * 3.5)
    ax.margins(y=0.15)
    ax.invert_yaxis()
    fig.tight_layout()
    out = OUT_DIR / f"{name}.png"
    fig.savefig(out, dpi=160)
    plt.close(fig)
    return out


def save_bar_chart(name: str, scores: dict[str, float], title: str) -> Path | None:
    if plt is None:
        return None
    labels = list(scores.keys())
    values = [scores[k] for k in labels]
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(labels, values, color=["#2563EB", "#059669", "#DC2626"][: len(labels)])
    ax.set_title(title)
    ax.set_ylabel("Score")
    ax.tick_params(axis="x", labelrotation=20, labelsize=13)
    for i, v in enumerate(values):
        ax.text(i, v + (max(values) * 0.02 if max(values) > 0 else 0.05), f"{v:.3f}", ha="center", va="bottom", fontsize=14, fontweight="bold")
    ax.margins(y=0.15)
    fig.tight_layout()
    out = OUT_DIR / f"{name}.png"
    fig.savefig(out, dpi=160)
    plt.close(fig)
    return out


def to_newick(node: dict, is_root: bool = True) -> str:
    if node.get("isLeaf", False):
        return f"{node['name']}:{node.get('branchLength', 0.0):.3f}"
    inner = ",".join(to_newick(c, False) for c in node["children"])
    if is_root:
        return f"({inner})"
    return f"({inner}){node.get('name','')}:{node.get('branchLength',0.0):.3f}"


def run_upgma(taxa: list[str], m: list[list[float]]) -> dict:
    idx = {t: i for i, t in enumerate(taxa)}
    clusters = {t: {"members": [t], "height": 0.0, "tree": {"name": t, "isLeaf": True, "branchLength": 0.0, "children": []}} for t in taxa}
    dist: dict[frozenset[str], float] = {}
    for i, j in combinations(taxa, 2):
        dist[frozenset((i, j))] = m[idx[i]][idx[j]]

    def get_d(a: str, b: str) -> float:
        if a == b:
            return 0.0
        return dist[frozenset((a, b))]

    step = 1
    while len(clusters) > 1:
        keys = list(clusters.keys())
        print(f"\n[UPGMA] Step {step}")
        print_matrix(keys, matrix_snapshot(keys, get_d))

        a, b = min(combinations(keys, 2), key=lambda p: get_d(p[0], p[1]))
        dab = get_d(a, b)
        h = dab / 2.0
        ca, cb = clusters[a], clusters[b]
        ba = max(h - ca["height"], 0.0)
        bb = max(h - cb["height"], 0.0)
        print(f"Merge {a} + {b} at d={dab:.3f}, branch lengths=({ba:.3f},{bb:.3f})")

        new_name = f"U{step}"
        new_members = ca["members"] + cb["members"]
        new_tree = {
            "name": new_name,
            "isLeaf": False,
            "branchLength": 0.0,
            "children": [
                {**ca["tree"], "branchLength": ba},
                {**cb["tree"], "branchLength": bb},
            ],
        }

        for k in list(dist.keys()):
            if a in k or b in k:
                dist.pop(k, None)
        others = [x for x in keys if x not in (a, b)]
        for o in others:
            co = clusters[o]
            s = 0.0
            c = 0
            for x in new_members:
                for y in co["members"]:
                    s += m[idx[x]][idx[y]]
                    c += 1
            dist[frozenset((new_name, o))] = s / c

        del clusters[a]
        del clusters[b]
        clusters[new_name] = {"members": new_members, "height": h, "tree": new_tree}
        step += 1

    root = next(iter(clusters.values()))["tree"]
    newick = to_newick(root) + ";"
    return {"tree": root, "newick": newick}


def run_neighbor_joining(taxa: list[str], m: list[list[float]]) -> dict:
    """Same NJ as the Django algo-lab (neighborJoining.js) via topic15_simple.run_nj_algorithm."""
    r = run_nj_algorithm(taxa, m)
    return {
        "tree": r["tree"],
        "newick": r["newick"],
        "mergeTable": r["mergeTable"],
        "stepSnapshots": r["stepSnapshots"],
    }


def run_four_point(taxa: list[str], m: list[list[float]]) -> dict:
    if len(taxa) < 4:
        raise ValueError("Need at least 4 taxa for four-point checks.")
    idx = {t: i for i, t in enumerate(taxa)}
    rows = []
    ok = True
    for a, b, c, d in combinations(taxa, 4):
        s1 = m[idx[a]][idx[b]] + m[idx[c]][idx[d]]
        s2 = m[idx[a]][idx[c]] + m[idx[b]][idx[d]]
        s3 = m[idx[a]][idx[d]] + m[idx[b]][idx[c]]
        maxv = max(s1, s2, s3)
        cnt = sum(abs(x - maxv) < 1e-9 for x in (s1, s2, s3))
        passed = cnt == 2
        ok = ok and passed
        rows.append((f"{a},{b},{c},{d}", s1, s2, s3, passed))
    return {"additive": ok, "rows": rows}


def run_hierarchical(taxa: list[str], m: list[list[float]], linkage: str) -> dict:
    idx = {t: i for i, t in enumerate(taxa)}
    clusters = {t: {"members": [t], "size": 1, "tree": {"name": t, "isLeaf": True, "branchLength": 0.0, "children": []}} for t in taxa}
    dist: dict[frozenset[str], float] = {}
    for i, j in combinations(taxa, 2):
        dist[frozenset((i, j))] = m[idx[i]][idx[j]]

    def get_d(a: str, b: str) -> float:
        if a == b:
            return 0.0
        return dist[frozenset((a, b))]

    step = 1
    history = []
    while len(clusters) > 1:
        keys = list(clusters.keys())
        a, b = min(combinations(keys, 2), key=lambda p: get_d(p[0], p[1]))
        dab = get_d(a, b)
        ca, cb = clusters[a], clusters[b]
        name = f"H{step}"
        new_tree = {
            "name": name,
            "isLeaf": False,
            "branchLength": 0.0,
            "children": [{**ca["tree"], "branchLength": dab / 2.0}, {**cb["tree"], "branchLength": dab / 2.0}],
        }
        print(f"[HC] Step {step}: merge {a}+{b} at {dab:.3f} ({linkage})")

        for k in list(dist.keys()):
            if a in k or b in k:
                dist.pop(k, None)
        remaining = [x for x in keys if x not in (a, b)]
        for x in remaining:
            if linkage == "single":
                v = min(
                    min(m[idx[u]][idx[vv]] for u in ca["members"] for vv in clusters[x]["members"]),
                    min(m[idx[u]][idx[vv]] for u in cb["members"] for vv in clusters[x]["members"]),
                )
            elif linkage == "complete":
                v = max(
                    max(m[idx[u]][idx[vv]] for u in ca["members"] for vv in clusters[x]["members"]),
                    max(m[idx[u]][idx[vv]] for u in cb["members"] for vv in clusters[x]["members"]),
                )
            else:
                num = 0.0
                den = 0
                for u in ca["members"] + cb["members"]:
                    for vv in clusters[x]["members"]:
                        num += m[idx[u]][idx[vv]]
                        den += 1
                v = num / den
            dist[frozenset((name, x))] = v

        new_members = ca["members"] + cb["members"]
        del clusters[a]
        del clusters[b]
        clusters[name] = {"members": new_members, "size": len(new_members), "tree": new_tree}
        history.append((step, a, b, dab))
        step += 1

    root = next(iter(clusters.values()))["tree"]
    return {"tree": root, "history": history}


def parse_character_block() -> dict[str, str]:
    print("Enter character lines as Taxon:SEQUENCE")
    print("Press Enter on empty line to finish.")
    chars: dict[str, str] = {}
    while True:
        line = input("> ").strip()
        if not line:
            break
        if ":" not in line:
            raise ValueError("Format must be Taxon:SEQUENCE")
        t, s = line.split(":", 1)
        t = t.strip()
        s = s.strip().upper()
        if not t or not s:
            raise ValueError("Taxon and sequence must be non-empty.")
        chars[t] = s
    if len(chars) < 2:
        raise ValueError("Need at least 2 taxa.")
    lengths = {len(v) for v in chars.values()}
    if len(lengths) != 1:
        raise ValueError("All sequences must have equal length.")
    return chars


def fitch_score(topology, chars: dict[str, str]) -> int:
    def walk(node, site):
        if isinstance(node, str):
            return {site[node]}, 0
        lset, lscore = walk(node[0], site)
        rset, rscore = walk(node[1], site)
        inter = lset & rset
        if inter:
            return inter, lscore + rscore
        return lset | rset, lscore + rscore + 1

    L = len(next(iter(chars.values())))
    total = 0
    for i in range(L):
        site = {t: chars[t][i] for t in chars}
        _, s = walk(topology, site)
        total += s
    return total


def run_fitch(chars: dict[str, str]) -> dict:
    taxa = list(chars.keys())
    if len(taxa) != 4:
        raise ValueError("Simple Fitch mode expects exactly 4 taxa.")
    a, b, c, d = taxa
    tops = {
        f"(({a},{b}),({c},{d}))": ((a, b), (c, d)),
        f"(({a},{c}),({b},{d}))": ((a, c), (b, d)),
        f"(({a},{d}),({b},{c}))": ((a, d), (b, c)),
    }
    scores = {k: fitch_score(v, chars) for k, v in tops.items()}
    return {
        "scores": scores,
        "min_tree": min(scores, key=scores.get),
        "max_tree": max(scores, key=scores.get),
    }


def default_cost_matrix(states: list[str]) -> dict[str, dict[str, float]]:
    out = {}
    for a in states:
        out[a] = {}
        for b in states:
            out[a][b] = 0.0 if a == b else 1.0
    return out


def run_sankoff(chars: dict[str, str], mode: str) -> dict:
    taxa = list(chars.keys())
    if len(taxa) != 4:
        raise ValueError("Simple Sankoff mode expects exactly 4 taxa.")
    a, b, c, d = taxa
    tops = {
        f"(({a},{b}),({c},{d}))": ((a, b), (c, d)),
        f"(({a},{c}),({b},{d}))": ((a, c), (b, d)),
        f"(({a},{d}),({b},{c}))": ((a, d), (b, c)),
    }
    states = ["0", "1"] if mode == "binary" else ["A", "C", "G", "T"]
    cost = default_cost_matrix(states)
    L = len(next(iter(chars.values())))

    def site_score(topology, site):
        INF = 10**9

        def post(node):
            if isinstance(node, str):
                obs = site[node]
                return {s: (0.0 if s == obs else INF) for s in states}
            left = post(node[0])
            right = post(node[1])
            row = {}
            for s in states:
                row[s] = min(cost[s][x] + left[x] for x in states) + min(cost[s][x] + right[x] for x in states)
            return row

        root_cost = post(topology)
        return min(root_cost.values())

    totals = {}
    for name, top in tops.items():
        s = 0.0
        for i in range(L):
            site = {t: chars[t][i] for t in taxa}
            s += site_score(top, site)
        totals[name] = s

    return {
        "scores": totals,
        "min_tree": min(totals, key=totals.get),
        "max_tree": max(totals, key=totals.get),
    }


def run_perfect_phylogeny(chars: dict[str, str]) -> dict:
    taxa = list(chars.keys())
    L = len(next(iter(chars.values())))
    pairs = []
    perfect = True
    for i in range(L):
        for j in range(i + 1, L):
            gam = {f"{chars[t][i]}{chars[t][j]}" for t in taxa}
            ok = len(gam) <= 3
            perfect = perfect and ok
            pairs.append((i + 1, j + 1, sorted(gam), ok))
    return {"perfect": perfect, "pairs": pairs}


def run_distance_menu() -> None:
    taxa = parse_taxa()
    m = parse_distance_matrix(taxa)
    print("\nDistance algorithms:")
    print("1 - UPGMA")
    print("2 - Neighbor Joining")
    print("3 - Four-Point Additivity")
    print("4 - Hierarchical (single/complete/average)")
    ch = prompt("Choose: ")

    if ch == "1":
        r = run_upgma(taxa, m)
        print("\nUPGMA Newick:", r["newick"])
        p = save_ascii_graph("upgma_graph", r["tree"])
        print("Graph saved:", p)
        png = save_tree_png("upgma_graph", r["tree"], "UPGMA Tree")
        if png:
            print("PNG graph saved:", png)
            open_file(png)
        else:
            print("Matplotlib not available; PNG graph was not created.")
    elif ch == "2":
        r = run_neighbor_joining(taxa, m)
        print("\nNJ Newick:", r["newick"])
        p = save_ascii_graph("nj_graph", r["tree"])
        print("Graph saved:", p)
        png = save_tree_png("nj_graph", r["tree"], "Neighbor Joining Tree")
        if png:
            print("PNG graph saved:", png)
            open_file(png)
        else:
            print("Matplotlib not available; PNG graph was not created.")
    elif ch == "3":
        r = run_four_point(taxa, m)
        print("\nFour-point rows:")
        for q, s1, s2, s3, ok in r["rows"]:
            print(f"{q} | s1={s1:.3f} s2={s2:.3f} s3={s3:.3f} | pass={ok}")
        print("Additive matrix:", r["additive"])
    elif ch == "4":
        linkage = prompt("Linkage (single/complete/average): ").lower() or "average"
        if linkage not in {"single", "complete", "average"}:
            raise ValueError("Invalid linkage.")
        r = run_hierarchical(taxa, m, linkage)
        print("\nMerge history:")
        for s, a, b, d in r["history"]:
            print(f"Step {s}: {a}+{b} at {d:.3f}")
        p = save_ascii_graph(f"hierarchical_{linkage}_graph", r["tree"])
        print("Graph saved:", p)
        png = save_tree_png(f"hierarchical_{linkage}_graph", r["tree"], f"Hierarchical ({linkage}) Tree")
        if png:
            print("PNG graph saved:", png)
            open_file(png)
        else:
            print("Matplotlib not available; PNG graph was not created.")
    else:
        print("Invalid choice.")


def run_character_menu() -> None:
    chars = parse_character_block()
    print("\nCharacter algorithms:")
    print("1 - Fitch (4 taxa)")
    print("2 - Sankoff (4 taxa)")
    print("3 - Perfect Phylogeny check")
    ch = prompt("Choose: ")

    if ch == "1":
        r = run_fitch(chars)
        print("\nFitch scores:")
        for k, v in r["scores"].items():
            print(f"{k} -> {v}")
        print("Minimum frugality:", r["min_tree"], f"(score {r['scores'][r['min_tree']]})")
        print("Maximum frugality:", r["max_tree"], f"(score {r['scores'][r['max_tree']]})")
        chart = save_bar_chart("fitch_scores", r["scores"], "Fitch Parsimony Scores")
        if chart:
            print("Score chart saved:", chart)
            open_file(chart)
        else:
            print("Matplotlib not available; score chart was not created.")
    elif ch == "2":
        mode = prompt("Mode (binary/dna): ").lower() or "binary"
        if mode not in {"binary", "dna"}:
            raise ValueError("Mode must be binary or dna.")
        r = run_sankoff(chars, mode)
        print("\nSankoff scores:")
        for k, v in r["scores"].items():
            print(f"{k} -> {v:.3f}")
        print("Minimum weighted frugality:", r["min_tree"], f"(score {r['scores'][r['min_tree']]:.3f})")
        print("Maximum weighted frugality:", r["max_tree"], f"(score {r['scores'][r['max_tree']]:.3f})")
        chart = save_bar_chart("sankoff_scores", r["scores"], f"Sankoff Scores ({mode.upper()})")
        if chart:
            print("Score chart saved:", chart)
            open_file(chart)
        else:
            print("Matplotlib not available; score chart was not created.")
    elif ch == "3":
        r = run_perfect_phylogeny(chars)
        print("\nPerfect phylogeny compatible:", r["perfect"])
        for i, j, gam, ok in r["pairs"]:
            print(f"Chars ({i},{j}) gametes={gam} pass={ok}")
    else:
        print("Invalid choice.")


def main() -> None:
    print("Topic 15 - All Algorithms (Simple CLI)")
    print("Output files will be saved in: simple-algorithm-output/")
    print("1 - Distance-based menu")
    print("2 - Character-based menu")
    mode = prompt("Select mode: ")
    try:
        if mode == "1":
            run_distance_menu()
        elif mode == "2":
            run_character_menu()
        else:
            print("Invalid mode.")
    except ValueError as e:
        print("Input error:", e)


if __name__ == "__main__":
    main()

