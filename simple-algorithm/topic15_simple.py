"""
Topic 15 — simple console implementations of three methods only:

  1. UPGMA            — distance matrix -> agglomerative tree (+ SVG steps)
  2. Neighbor Joining  — distance matrix -> NJ tree (trace + SVG/PNG outputs)
  3. Maximum parsimony — Fitch scoring on three four-taxon topologies (min/max frugality)

No other phylogenetic algorithms are included in this file.

Raster output: each method writes final figures under ``simple-algorithm-output/`` as
``.png`` and ``.jpeg`` (JPEG may be skipped if the matplotlib backend lacks JPEG support).
"""
import copy
import io
from itertools import combinations
from pathlib import Path

OUTPUT_DIR = Path("simple-algorithm-output")

try:
    from Bio import Phylo
except ImportError:
    Phylo = None

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import networkx as nx
except ImportError:
    plt = None
    nx = None


def print_matrix(labels, matrix):
    print("      " + "  ".join(f"{x:>8}" for x in labels))
    for i, row in enumerate(matrix):
        row_label = labels[i]
        cells = []
        for cell in row:
            if cell is None:
                cells.append(f"{'-':>8}")
            else:
                cells.append(f"{cell:>8.3f}")
        print(f"{row_label:>6}  " + "  ".join(cells))


def matrix_snapshot(active, distance_lookup):
    table = []
    for i in active:
        row = []
        for j in active:
            row.append(None if i == j else float(distance_lookup(i, j)))
        table.append(row)
    return table


def _leaf(name):
    return {"name": name, "height": 0.0}


def _internal(left, right, left_len, right_len, node_height=None, node_label=None):
    inferred_height = max(left.get("height", 0.0) + left_len, right.get("height", 0.0) + right_len)
    node = {
        "left": left,
        "right": right,
        "left_len": max(left_len, 0.0),
        "right_len": max(right_len, 0.0),
        "height": node_height if node_height is not None else inferred_height,
    }
    if node_label:
        node["label"] = node_label
    return node


def _collect_leaves(node):
    if "name" in node:
        return [node["name"]]
    return _collect_leaves(node["left"]) + _collect_leaves(node["right"])


def render_upgma_svg(components, title):
    """Horizontal dendrogram style (similar to reference UPGMA image)."""
    if not components:
        return ""
    left_margin = 62.0
    right_margin = 26.0
    top_margin = 38.0
    row_gap = 52.0
    cluster_gap = 18.0

    def max_merge_distance(node):
        if "name" in node:
            return 0.0
        here = float(node.get("height", 0.0)) * 2.0
        return max(here, max_merge_distance(node["left"]), max_merge_distance(node["right"]))

    max_distance = max(max_merge_distance(tree) for tree in components)
    max_distance = max(max_distance, 1.0)
    x_scale = max(5.5, min(8.5, 560.0 / max_distance))
    root_tail = 26.0 if len(components) == 1 else 0.0
    axis_right = left_margin + max_distance * x_scale + root_tail
    width = int(axis_right + right_margin)

    lines = []
    labels = []
    y_cursor = top_margin

    for tree in components:
        local_leaves = _collect_leaves(tree)
        leaf_positions = {}
        for leaf_name in local_leaves:
            leaf_positions[leaf_name] = y_cursor
            y_cursor += row_gap
        y_cursor += cluster_gap

        def draw(node):
            if "name" in node:
                y = leaf_positions[node["name"]]
                labels.append(
                    f'<text x="{left_margin - 14:.1f}" y="{y + 6:.1f}" fill="#111827" font-size="13" text-anchor="end" font-weight="600">{node["name"]}</text>'
                )
                return left_margin, y

            lx, ly = draw(node["left"])
            rx, ry = draw(node["right"])
            x = left_margin + float(node.get("height", 0.0)) * 2.0 * x_scale
            y_min, y_max = min(ly, ry), max(ly, ry)
            y_mid = (ly + ry) / 2.0

            lines.append(f'<line x1="{lx:.1f}" y1="{ly:.1f}" x2="{x:.1f}" y2="{ly:.1f}" stroke="#111111" stroke-width="2.2" />')
            lines.append(f'<line x1="{rx:.1f}" y1="{ry:.1f}" x2="{x:.1f}" y2="{ry:.1f}" stroke="#111111" stroke-width="2.2" />')
            lines.append(f'<line x1="{x:.1f}" y1="{y_min:.1f}" x2="{x:.1f}" y2="{y_max:.1f}" stroke="#111111" stroke-width="2.2" />')

            merge_value = float(node.get("height", 0.0)) * 2.0
            value_label = f"{merge_value:.1f}".rstrip("0").rstrip(".")
            labels.append(
                f'<text x="{x - 6:.1f}" y="{y_min - 8:.1f}" fill="#111111" font-size="12" text-anchor="end" font-weight="600">{value_label}</text>'
            )
            return x, y_mid

        root_x, root_y = draw(tree)
        if len(components) == 1:
            tail_x = root_x + root_tail
            lines.append(
                f'<line x1="{root_x:.1f}" y1="{root_y:.1f}" x2="{tail_x:.1f}" y2="{root_y:.1f}" stroke="#111111" stroke-width="2.2" />'
            )
            lines.append(f'<circle cx="{tail_x:.1f}" cy="{root_y:.1f}" r="3.0" fill="#111111" />')
            labels.append(
                f'<text x="{tail_x + 8:.1f}" y="{root_y + 4:.1f}" fill="#111111" font-size="12" text-anchor="start" font-weight="600">Root</text>'
            )

    height = int(y_cursor + 18.0)
    return "".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
            f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff" rx="8" />',
            f'<text x="{width/2:.1f}" y="20" fill="#111111" font-size="14" text-anchor="middle" font-weight="600">{title}</text>',
            *lines,
            *labels,
            "</svg>",
        ]
    )


def render_nj_svg(components, title):
    """Dark node-link style (similar to reference NJ image)."""
    if not components:
        return ""

    left_margin = 24.0
    right_margin = 26.0
    top_margin = 40.0
    bottom_margin = 18.0
    leaf_gap = 54.0
    component_gap = 42.0

    def max_dist(node, acc=0.0):
        if "name" in node:
            return acc
        return max(
            max_dist(node["left"], acc + float(node["left_len"])),
            max_dist(node["right"], acc + float(node["right_len"])),
        )

    layouts = []
    total_width = left_margin
    max_height = 0.0
    for tree in components:
        leaves = _collect_leaves(tree)
        dist = max(max_dist(tree), 1.0)
        scale = max(58.0, min(95.0, 360.0 / dist))
        box_width = dist * scale + 120.0
        box_height = max(len(leaves), 1) * leaf_gap
        layouts.append((tree, leaves, scale, box_width, box_height))
        total_width += box_width + component_gap
        max_height = max(max_height, box_height)
    total_width = int(total_width + right_margin)
    height = int(top_margin + max_height + bottom_margin)

    lines = []
    labels = []
    nodes = []
    x_cursor = left_margin

    for tree, leaves, scale, box_width, box_height in layouts:
        right_x = x_cursor + box_width - 36.0
        y_top = top_margin + (max_height - box_height) / 2.0
        leaf_y = {name: y_top + i * leaf_gap + leaf_gap / 2.0 for i, name in enumerate(leaves)}

        def draw(node, acc=0.0):
            x = right_x - acc * scale
            if "name" in node:
                y = leaf_y[node["name"]]
                labels.append(
                    f'<text x="{x - 12:.1f}" y="{y + 6:.1f}" fill="#d1d5db" font-size="13" text-anchor="end" font-weight="600">{node["name"]}</text>'
                )
                return x, y

            lx, ly = draw(node["left"], acc + float(node["left_len"]))
            rx, ry = draw(node["right"], acc + float(node["right_len"]))
            y = (ly + ry) / 2.0
            lines.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{lx:.1f}" y2="{ly:.1f}" stroke="#9ca3af" stroke-width="2.1" />')
            lines.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{rx:.1f}" y2="{ry:.1f}" stroke="#9ca3af" stroke-width="2.1" />')

            left_mid_x, left_mid_y = (x + lx) / 2.0, (y + ly) / 2.0
            right_mid_x, right_mid_y = (x + rx) / 2.0, (y + ry) / 2.0
            labels.append(
                f'<text x="{left_mid_x + 5:.1f}" y="{left_mid_y - 5:.1f}" fill="#9ca3af" font-size="12">{float(node["left_len"]):.2f}</text>'
            )
            labels.append(
                f'<text x="{right_mid_x + 5:.1f}" y="{right_mid_y - 5:.1f}" fill="#9ca3af" font-size="12">{float(node["right_len"]):.2f}</text>'
            )
            if node.get("label"):
                labels.append(
                    f'<text x="{x + 6:.1f}" y="{y + 4:.1f}" fill="#9ca3af" font-size="12" font-weight="600">{node["label"]}</text>'
                )
            nodes.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.4" fill="#9ca3af" />')
            return x, y

        draw(tree, 0.0)
        x_cursor += box_width + component_gap

    return "".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{height}" viewBox="0 0 {total_width} {height}">',
            f'<rect x="0" y="0" width="{total_width}" height="{height}" fill="#050608" rx="9" />',
            f'<text x="{total_width/2:.1f}" y="22" fill="#d1d5db" font-size="13" text-anchor="middle">{title}</text>',
            *lines,
            *nodes,
            *labels,
            "</svg>",
        ]
    )


def save_svg(svg_text, output_path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(svg_text, encoding="utf-8")


def _save_figure_png_jpeg(fig, base_path_no_suffix: Path, facecolor=None):
    """Save matplotlib figure as PNG and JPEG (same stem). Closes the figure."""
    if plt is None:
        return
    base_path_no_suffix.parent.mkdir(parents=True, exist_ok=True)
    fc = facecolor if facecolor is not None else fig.get_facecolor()
    png_path = base_path_no_suffix.with_suffix(".png")
    fig.savefig(png_path, dpi=160, bbox_inches="tight", facecolor=fc)
    jpg_path = base_path_no_suffix.with_suffix(".jpeg")
    try:
        fig.savefig(jpg_path, format="jpeg", dpi=160, bbox_inches="tight", facecolor=fc, pil_kwargs={"quality": 90})
    except Exception:
        try:
            fig.savefig(jpg_path.with_suffix(".jpg"), format="jpeg", dpi=160, bbox_inches="tight", facecolor=fc)
        except Exception:
            print(f"  (JPEG skipped for {png_path.name}; PNG saved.)")
    plt.close(fig)


def mp_quartet_entries(t0, t1, t2, t3):
    """Three unrooted topologies; topology_id matches phylo-webapp renderUnrootedQuartet."""
    return [
        (f"(({t0},{t1}),({t2},{t3}))", 0, ((t0, t1), (t2, t3))),
        (f"(({t0},{t2}),({t1},{t3}))", 1, ((t0, t2), (t1, t3))),
        (f"(({t0},{t3}),({t1},{t2}))", 2, ((t0, t3), (t1, t2))),
    ]


def _mp_quartet_layout(topology_id: int, taxa_four: list[str]):
    """Same geometry as algo-lab treeRenderer.js renderUnrootedQuartet."""
    t0, t1, t2, t3 = taxa_four
    layouts = [
        {
            "i1": (100, 100),
            "i2": (220, 100),
            "l1": [(40, 55, t0), (40, 145, t1)],
            "l2": [(280, 55, t2), (280, 145, t3)],
        },
        {
            "i1": (100, 100),
            "i2": (220, 100),
            "l1": [(40, 55, t0), (40, 145, t2)],
            "l2": [(280, 55, t1), (280, 145, t3)],
        },
        {
            "i1": (100, 100),
            "i2": (220, 100),
            "l1": [(40, 55, t0), (40, 145, t3)],
            "l2": [(280, 55, t1), (280, 145, t2)],
        },
    ]
    return layouts[topology_id % 3]


def render_mp_quartet_svg(topology_id: int, taxa_four: list[str], title: str = "") -> str:
    """Unrooted quartet SVG (terminal branches blue, internal quartet edge gold) — matches website."""
    geo = _mp_quartet_layout(topology_id, taxa_four)
    blue = "#2563eb"
    gold = "#ca8a04"
    W, H = 360, 200
    pad = (W - 320) / 2
    ix1, iy1 = geo["i1"]
    ix2, iy2 = geo["i2"]
    lines = []
    for lx, ly, _ in geo["l1"]:
        lines.append(
            f'<line x1="{lx + pad:.1f}" y1="{ly:.1f}" x2="{ix1 + pad:.1f}" y2="{iy1:.1f}" stroke="{blue}" stroke-width="3.5" stroke-linecap="round"/>'
        )
    for lx, ly, _ in geo["l2"]:
        lines.append(
            f'<line x1="{lx + pad:.1f}" y1="{ly:.1f}" x2="{ix2 + pad:.1f}" y2="{iy2:.1f}" stroke="{blue}" stroke-width="3.5" stroke-linecap="round"/>'
        )
    lines.append(
        f'<line x1="{ix1 + pad:.1f}" y1="{iy1:.1f}" x2="{ix2 + pad:.1f}" y2="{iy2:.1f}" stroke="{gold}" stroke-width="4" stroke-linecap="round"/>'
    )
    texts = []
    for lx, ly, name in geo["l1"] + geo["l2"]:
        anchor = "end" if lx < ix1 else "start"
        tx = lx + pad + (-6 if lx < ix1 else 6)
        texts.append(
            f'<text x="{tx:.1f}" y="{ly + 4:.1f}" text-anchor="{anchor}" font-size="14" font-weight="700" fill="#0f172a">{name}</text>'
        )
    title_el = f'<text x="{W/2:.1f}" y="16" text-anchor="middle" font-size="11" fill="#334155">{title}</text>' if title else ""
    return "".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
            '<rect width="100%" height="100%" fill="#f8fafc"/>',
            title_el,
            *lines,
            *texts,
            "</svg>",
        ]
    )


def draw_mp_quartet_matplotlib(ax, topology_id: int, taxa_four: list[str]):
    """Draw quartet on matplotlib axes (website colors)."""
    geo = _mp_quartet_layout(topology_id, taxa_four)
    blue = "#2563eb"
    gold = "#ca8a04"
    ix1, iy1 = geo["i1"]
    ix2, iy2 = geo["i2"]
    for lx, ly, _ in geo["l1"]:
        ax.plot([lx, ix1], [ly, iy1], color=blue, linewidth=3.5, solid_capstyle="round")
    for lx, ly, _ in geo["l2"]:
        ax.plot([lx, ix2], [ly, iy2], color=blue, linewidth=3.5, solid_capstyle="round")
    ax.plot([ix1, ix2], [iy1, iy2], color=gold, linewidth=4.0, solid_capstyle="round")
    for lx, ly, nm in geo["l1"] + geo["l2"]:
        ha = "right" if lx < ix1 else "left"
        off = -6 if lx < ix1 else 6
        ax.text(lx + off, ly + 2, nm, ha=ha, va="center", fontsize=12, fontweight="bold", color="#0f172a")
    ax.set_facecolor("#f8fafc")
    ax.set_aspect("equal", adjustable="box")
    ax.axis("off")
    ax.set_xlim(15, 305)
    ax.set_ylim(180, 20)


def save_upgma_final_raster(tree, base_path_no_suffix: Path, title="UPGMA — final tree"):
    """PNG + JPEG dendrogram (same layout style as upgma_final.svg)."""
    if plt is None:
        print("(Skip upgma_final raster: pip install matplotlib.)")
        return
    components = [tree]
    left_margin = 62.0
    right_margin = 26.0
    top_margin = 38.0
    row_gap = 52.0
    cluster_gap = 18.0

    def max_merge_distance(node):
        if "name" in node:
            return 0.0
        here = float(node.get("height", 0.0)) * 2.0
        return max(here, max_merge_distance(node["left"]), max_merge_distance(node["right"]))

    max_distance = max(max_merge_distance(t) for t in components)
    max_distance = max(max_distance, 1.0)
    x_scale = max(5.5, min(8.5, 560.0 / max_distance))
    root_tail = 26.0 if len(components) == 1 else 0.0
    axis_right = left_margin + max_distance * x_scale + root_tail
    width = axis_right + right_margin
    y_cursor = top_margin
    fig, ax = plt.subplots(figsize=(max(width / 90.0, 5.0), 4.2), dpi=120)
    ax.set_facecolor("#ffffff")

    for tree_c in components:
        local_leaves = _collect_leaves(tree_c)
        leaf_positions = {}
        for leaf_name in local_leaves:
            leaf_positions[leaf_name] = y_cursor
            y_cursor += row_gap
        y_cursor += cluster_gap

        def draw(node):
            if "name" in node:
                y = leaf_positions[node["name"]]
                ax.text(
                    left_margin - 10,
                    y,
                    node["name"],
                    ha="right",
                    va="center",
                    fontsize=11,
                    fontweight="bold",
                    color="#111827",
                )
                return left_margin, y

            lx, ly = draw(node["left"])
            rx, ry = draw(node["right"])
            x = left_margin + float(node.get("height", 0.0)) * 2.0 * x_scale
            y_min, y_max = min(ly, ry), max(ly, ry)
            y_mid = (ly + ry) / 2.0
            ax.plot([lx, x], [ly, ly], color="#111111", linewidth=2.2)
            ax.plot([rx, x], [ry, ry], color="#111111", linewidth=2.2)
            ax.plot([x, x], [y_min, y_max], color="#111111", linewidth=2.2)
            merge_value = float(node.get("height", 0.0)) * 2.0
            value_label = f"{merge_value:.1f}".rstrip("0").rstrip(".")
            ax.text(x - 4, y_min - 6, value_label, ha="right", va="top", fontsize=9, fontweight="bold", color="#111111")
            return x, y_mid

        root_x, root_y = draw(tree_c)
        if len(components) == 1:
            tail_x = root_x + root_tail
            ax.plot([root_x, tail_x], [root_y, root_y], color="#111111", linewidth=2.2)
            ax.scatter([tail_x], [root_y], s=22, color="#111111", zorder=5)
            ax.text(tail_x + 6, root_y, "Root", fontsize=10, fontweight="bold", va="center", color="#111111")

    height = y_cursor + 18.0
    ax.set_xlim(0, width + 4)
    ax.set_ylim(height + 8, top_margin - 12)
    ax.set_title(title, fontsize=12, fontweight="bold", color="#111111")
    ax.axis("off")
    fig.patch.set_facecolor("#ffffff")
    fig.tight_layout()
    _save_figure_png_jpeg(fig, base_path_no_suffix, facecolor="#ffffff")


def run_nj_algorithm(taxa, matrix):
    """
    Neighbor-Joining identical to phylo-webapp neighborJoining.js (Saitou–Nei style).
    Returns newick, mergeTable, stepSnapshots, tree (nested dicts like the browser lab).
    """
    if len(taxa) < 3:
        raise ValueError("Neighbor Joining requires at least 3 taxa.")

    dist: dict[frozenset, float] = {}
    for i in range(len(taxa)):
        for j in range(i + 1, len(taxa)):
            dist[frozenset((taxa[i], taxa[j]))] = matrix[i][j]

    def get_d(a, b):
        if a == b:
            return 0.0
        return dist[frozenset((a, b))]

    active = list(taxa)
    newick_map = {t: t for t in taxa}
    trees = {t: {"name": t, "isLeaf": True, "branchLength": 0.0, "children": []} for t in taxa}
    merge_table = []
    step_snapshots = []
    node_count = 0

    while len(active) > 2:
        n = len(active)
        labels = list(active)
        matrix_before = [
            [None if ri == cj else round(get_d(ri, cj), 3) for cj in labels] for ri in labels
        ]
        r = {i: sum(get_d(i, k) for k in active if k != i) for i in active}
        best_pair = None
        best_q = float("inf")
        for i, j in combinations(active, 2):
            q = (n - 2) * get_d(i, j) - r[i] - r[j]
            if q < best_q:
                best_q, best_pair = q, (i, j)
        i, j = best_pair
        q_matrix = [
            [None if ri == cj else round((n - 2) * get_d(ri, cj) - r[ri] - r[cj], 3) for cj in labels]
            for ri in labels
        ]
        step_snapshots.append(
            {
                "iteration": node_count + 1,
                "labels": labels,
                "matrixBefore": matrix_before,
                "qMatrix": q_matrix,
                "r": {k: round(v, 3) for k, v in r.items()},
                "selectedPair": [i, j],
                "bestQ": round(best_q, 3),
            }
        )
        dij = get_d(i, j)
        limb_i = max(0.0, 0.5 * dij + (r[i] - r[j]) / (2 * (n - 2)))
        limb_j = max(0.0, dij - limb_i)
        node_count += 1
        u = f"NJ{node_count}"
        newick_map[u] = f"({newick_map[i]}:{limb_i:.3f},{newick_map[j]}:{limb_j:.3f})"
        trees[u] = {
            "name": u,
            "isLeaf": False,
            "branchLength": 0.0,
            "children": [
                {**copy.deepcopy(trees[i]), "branchLength": limb_i},
                {**copy.deepcopy(trees[j]), "branchLength": limb_j},
            ],
        }
        merge_table.append(
            {
                "iteration": node_count,
                "pair": [i, j],
                "q": round(best_q, 3),
                "limbI": round(limb_i, 3),
                "limbJ": round(limb_j, 3),
            }
        )
        remaining = [k for k in active if k not in (i, j)]
        new_dists = {k: max(0.0, 0.5 * (get_d(i, k) + get_d(j, k) - dij)) for k in remaining}
        for k in list(dist.keys()):
            if i in k or j in k:
                dist.pop(k, None)
        del trees[i]
        del trees[j]
        for k in remaining:
            dist[frozenset((u, k))] = new_dists[k]
        active = remaining + [u]

    a, b = active
    dab = get_d(a, b)
    fa = dab / 2.0
    fb = dab / 2.0
    merge_table.append(
        {"iteration": node_count + 1, "pair": [a, b], "final": True, "limbI": fa, "limbJ": fb}
    )
    labels_f = list(active)
    step_snapshots.append(
        {
            "iteration": node_count + 1,
            "labels": labels_f,
            "matrixBefore": [
                [None if ri == cj else round(get_d(ri, cj), 3) for cj in labels_f] for ri in labels_f
            ],
            "qMatrix": None,
            "r": None,
            "selectedPair": [a, b],
            "final": True,
        }
    )
    final_tree = {
        "name": "root",
        "isLeaf": False,
        "branchLength": 0.0,
        "children": [
            {**copy.deepcopy(trees[a]), "branchLength": fa},
            {**copy.deepcopy(trees[b]), "branchLength": fb},
        ],
    }
    newick = f"({newick_map[a]}:{fa:.3f},{newick_map[b]}:{fb:.3f});"
    return {
        "newick": newick,
        "mergeTable": merge_table,
        "stepSnapshots": step_snapshots,
        "tree": final_tree,
    }


def print_labeled_matrix(labels, mat, title):
    print(f"\n{title}")
    print("       " + "  ".join(f"{x:>9}" for x in labels))
    for i, row_label in enumerate(labels):
        cells = []
        for cell in mat[i]:
            if cell is None:
                cells.append(f"{'-':>9}")
            else:
                cells.append(f"{cell:>9.3f}" if isinstance(cell, float) else f"{cell:>9}")
        print(f"{row_label:>6}  " + "  ".join(cells))


def print_nj_web_style_trace(result):
    """Print Q / D matrices and merge table like the algorithm lab UI."""
    print("\n=== Neighbor Joining (same logic & numbering as web app) ===\n")
    for snap in result["stepSnapshots"]:
        if snap.get("final"):
            print(f"\n--- Final join (iteration {snap['iteration']}) ---")
            print(f"Selected pair: {snap['selectedPair'][0]}, {snap['selectedPair'][1]}")
            print("(Web UI: Q-matrix panel shows this message; only D matrix applies.)")
            print_labeled_matrix(snap["labels"], snap["matrixBefore"], "Distance matrix (active nodes)")
            continue
        print(f"\n--- Iteration {snap['iteration']} ---")
        print(f"Active labels: {snap['labels']}")
        print("R (sum of distances to other active nodes):")
        for k, v in snap["r"].items():
            print(f"  {k}: {v}")
        print_labeled_matrix(snap["labels"], snap["matrixBefore"], "Distance matrix D")
        print_labeled_matrix(snap["labels"], snap["qMatrix"], "Q matrix")
        pair = snap["selectedPair"]
        print(f"Minimum Q = {snap['bestQ']} at pair ({pair[0]}, {pair[1]})")

    print("\n--- Merge table (as in web 'nj-merge-table') ---")
    print(f"{'iter':>5}  {'pair (i,j)':^14}  {'Q':>8}  {'branch i':>10}  {'branch j':>10}")
    for row in result["mergeTable"]:
        p0, p1 = row["pair"][0], row["pair"][1]
        pair_s = f"{p0}, {p1}"
        if row.get("final"):
            print(
                f"{row['iteration']:>5}  {pair_s:^14}  {'final':>8}  {row['limbI']:>10.3f}  {row['limbJ']:>10.3f}"
            )
        else:
            print(
                f"{row['iteration']:>5}  {pair_s:^14}  {row['q']:>8.3f}  {row['limbI']:>10.3f}  {row['limbJ']:>10.3f}"
            )
    print(f"\nNewick: {result['newick']}")


def js_tree_to_render_dict(node):
    """Convert browser-style NJ tree to internal left/right dict for render_nj_svg."""
    if node.get("isLeaf"):
        return {"name": node["name"]}
    ch = node["children"]
    out = {
        "left": js_tree_to_render_dict(ch[0]),
        "right": js_tree_to_render_dict(ch[1]),
        "left_len": float(ch[0].get("branchLength") or 0),
        "right_len": float(ch[1].get("branchLength") or 0),
    }
    if node.get("name") and not node.get("isLeaf"):
        out["label"] = node["name"]
    return out


def save_nj_force_style_png(tree_js, out_path: Path):
    """
    Approximate the web app's D3 force tree: dark background, blue leaves, grey edges.
    Layout uses NetworkX spring (same topology as the NJ tree).
    """
    if plt is None or nx is None:
        print("(Skip nj_force_style.png: install matplotlib and networkx.)")
        return
    G = nx.Graph()

    def add_edges(n, parent=None):
        name = n["name"]
        G.add_node(name, is_leaf=bool(n.get("isLeaf")))
        if parent is not None:
            bl = float(n.get("branchLength") or 0.0)
            G.add_edge(parent, name, weight=max(bl, 1e-6))
        for c in n.get("children") or []:
            add_edges(c, name)

    add_edges(tree_js)
    n_nodes = max(G.number_of_nodes(), 1)
    pos = nx.spring_layout(G, seed=42, k=2.2 / (n_nodes**0.5), iterations=80)
    fig, ax = plt.subplots(figsize=(9.5, 5.2))
    ax.set_facecolor("#0b1220")
    fig.patch.set_facecolor("#0b1220")
    for u, v in G.edges():
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        ax.plot([x0, x1], [y0, y1], color="#64748b", linewidth=2.2, solid_capstyle="round")
    for name, p in pos.items():
        leaf = G.nodes[name].get("is_leaf", False)
        ax.scatter(
            [p[0]],
            [p[1]],
            s=(120 if leaf else 55),
            c="#3b82f6" if leaf else "none",
            edgecolors="#94a3b8" if not leaf else "none",
            linewidths=1.5,
            zorder=3,
        )
        if leaf:
            ax.text(p[0] + 0.04, p[1], name, color="#e2e8f0", fontsize=12, fontweight="bold", va="center")
    ax.set_axis_off()
    ax.set_title("Neighbor Joining (force-style layout, matches web app topology)", color="#e2e8f0", fontsize=12)
    fig.tight_layout()
    _save_figure_png_jpeg(fig, out_path.parent / out_path.stem, facecolor="#0b1220")


def save_nj_phylogram_png(newick_str: str, out_path: Path):
    """Horizontal phylogram with branch lengths (typical matplotlib / textbook style)."""
    if Phylo is None or plt is None:
        print("(Skip nj_phylogram_matplotlib.png: pip install biopython matplotlib.)")
        return
    tree = Phylo.read(io.StringIO(newick_str), "newick")
    fig = plt.figure(figsize=(10, 4.2))
    ax = fig.add_subplot(1, 1, 1)
    Phylo.draw(tree, axes=ax, do_show=False)
    ax.set_title("Neighbor Joining tree (branch lengths)")
    ax.set_xlabel("Branch length")
    fig.tight_layout()
    _save_figure_png_jpeg(fig, out_path.parent / out_path.stem, facecolor=fig.get_facecolor())


def upgma(taxa, matrix):
    clusters = {t: {"members": [t], "height": 0.0, "newick": t, "tree": _leaf(t)} for t in taxa}
    dist = {}
    for i, j in combinations(taxa, 2):
        dist[frozenset((i, j))] = matrix[taxa.index(i)][taxa.index(j)]

    step = 1
    merge_id = 1
    while len(clusters) > 1:
        keys = list(clusters.keys())
        print(f"\n[UPGMA] Step {step} - active clusters: {keys}")
        before = matrix_snapshot(keys, lambda x, y: dist[frozenset((x, y))])
        print_matrix(keys, before)

        a, b = min(combinations(keys, 2), key=lambda p: dist[frozenset((p[0], p[1]))])
        d_ab = dist[frozenset((a, b))]
        new_h = d_ab / 2.0
        ba = new_h - clusters[a]["height"]
        bb = new_h - clusters[b]["height"]
        print(f"Choose closest pair: ({a}, {b}) with d={d_ab:.3f}")
        print(f"Branch lengths: {a}:{ba:.3f}, {b}:{bb:.3f}")
        new_name = f"U{merge_id}"
        merge_id += 1
        clusters[new_name] = {
            "members": clusters[a]["members"] + clusters[b]["members"],
            "height": new_h,
            "newick": f"({clusters[a]['newick']}:{ba:.3f},{clusters[b]['newick']}:{bb:.3f})",
            "tree": _internal(clusters[a]["tree"], clusters[b]["tree"], ba, bb, node_height=new_h),
        }

        for k in list(dist.keys()):
            if a in k or b in k:
                dist.pop(k, None)
        others = [k for k in keys if k not in (a, b)]
        for o in others:
            s = 0.0
            c = 0
            for x in clusters[new_name]["members"]:
                for y in clusters[o]["members"]:
                    s += matrix[taxa.index(x)][taxa.index(y)]
                    c += 1
            value = s / c
            print(
                f"Update d({new_name},{o}) = avg({clusters[new_name]['members']} x {clusters[o]['members']}) = {value:.3f}"
            )
            dist[frozenset((new_name, o))] = value
        del clusters[a]
        del clusters[b]

        step_svg = render_upgma_svg(
            [clusters[key]["tree"] for key in clusters.keys()],
            f"UPGMA Step {step}",
        )
        save_svg(step_svg, OUTPUT_DIR / f"upgma_step_{step}.svg")
        print(f"Graph saved: {OUTPUT_DIR / f'upgma_step_{step}.svg'}")
        step += 1

    root = next(iter(clusters))
    final_tree = clusters[root]["tree"]
    final_svg = render_upgma_svg([final_tree], "UPGMA Final Tree")
    save_svg(final_svg, OUTPUT_DIR / "upgma_final.svg")
    print(f"Graph saved: {OUTPUT_DIR / 'upgma_final.svg'}")
    save_upgma_final_raster(final_tree, OUTPUT_DIR / "upgma_final", title="UPGMA — final tree")
    if plt is not None:
        print(f"Raster saved: {OUTPUT_DIR / 'upgma_final.png'} (+ .jpeg if available)")
    return clusters[root]["newick"] + ";"


def neighbor_joining(taxa, matrix):
    """
    Neighbor Joining aligned with phylo-webapp algo-lab (neighborJoining.js).
    Prints Q/D step matrices and merge table like the web UI; saves:
      - nj_phylogram_matplotlib.png — branch-length tree (textbook style)
      - nj_force_style.png — dark force-style layout (topology same as web)
      - nj_final.svg — cladogram-style SVG from the same tree object
    """
    out_dir = OUTPUT_DIR
    result = run_nj_algorithm(taxa, matrix)
    print_nj_web_style_trace(result)

    render_tree = js_tree_to_render_dict(result["tree"])
    final_svg = render_nj_svg([render_tree], "NJ Final Tree")
    save_svg(final_svg, out_dir / "nj_final.svg")
    print(f"\nGraph saved: {out_dir / 'nj_final.svg'}")

    save_nj_phylogram_png(result["newick"], out_dir / "nj_phylogram_matplotlib.png")
    if Phylo is not None and plt is not None:
        print(f"Raster saved: {out_dir / 'nj_phylogram_matplotlib.png'} (+ .jpeg if available)")
    else:
        print("(Skip NJ phylogram PNG/JPEG: pip install biopython matplotlib.)")

    save_nj_force_style_png(result["tree"], out_dir / "nj_force_style.png")
    if plt is not None and nx is not None:
        print(f"Raster saved: {out_dir / 'nj_force_style.png'} (+ .jpeg if available)")
    else:
        print("(Skip NJ force-style PNG/JPEG: pip install matplotlib networkx.)")

    return result["newick"]


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


def site_score(topology, chars, idx):
    states = {t: chars[t][idx] for t in chars}

    def walk(node):
        if isinstance(node, str):
            return {states[node]}, 0
        left_set, left_score = walk(node[0])
        right_set, right_score = walk(node[1])
        inter = left_set & right_set
        if inter:
            return inter, left_score + right_score
        return left_set | right_set, left_score + right_score + 1

    _, score = walk(topology)
    return score, states


def read_taxa():
    raw = input("Enter taxa names separated by commas (example: A,B,C,D): ").strip()
    taxa = [t.strip() for t in raw.split(",") if t.strip()]
    if len(taxa) < 2:
        raise ValueError("Please enter at least 2 taxa.")
    return taxa


def read_distance_matrix(n):
    print(f"Enter {n} matrix rows (comma-separated values).")
    matrix = []
    for i in range(n):
        row_raw = input(f"Row {i + 1}: ").strip()
        row = [float(x.strip()) for x in row_raw.split(",")]
        matrix.append(row)
    if any(len(r) != n for r in matrix):
        raise ValueError("Matrix must be square and match taxa count.")
    for i in range(n):
        if matrix[i][i] != 0:
            raise ValueError("Diagonal values must be 0.")
        for j in range(n):
            if matrix[i][j] < 0:
                raise ValueError("Distances cannot be negative.")
            if abs(matrix[i][j] - matrix[j][i]) > 1e-9:
                raise ValueError("Matrix must be symmetric.")
    return matrix


def read_character_data():
    print("Maximum parsimony: enter 4 aligned lines as Taxon:SEQUENCE")
    print("Example: A:ATGC")
    chars = {}
    for i in range(4):
        line = input(f"Line {i + 1}: ").strip()
        if ":" not in line:
            raise ValueError("Each line must contain ':' in Taxon:SEQUENCE format.")
        taxon, seq = line.split(":", 1)
        taxon = taxon.strip()
        seq = seq.strip().upper()
        if not taxon or not seq or not seq.isalpha():
            raise ValueError("Invalid taxon or sequence.")
        chars[taxon] = seq
    lengths = {len(v) for v in chars.values()}
    if len(lengths) != 1:
        raise ValueError("All sequences must have equal length.")
    return chars


def run_distance_mode():
    taxa = read_taxa()
    matrix = read_distance_matrix(len(taxa))
    method = input("Choose method (UPGMA/NJ): ").strip().upper()
    if method == "NJ":
        print("\nNeighbor Joining (NJ) tree:")
        print(neighbor_joining(taxa, matrix))
    else:
        print("\nUPGMA tree:")
        print(upgma(taxa, matrix))


def run_maximum_parsimony_mode():
    chars = read_character_data()
    taxa_ordered = list(chars.keys())
    if len(taxa_ordered) != 4:
        raise ValueError("Maximum parsimony mode requires exactly 4 taxa.")
    t0, t1, t2, t3 = taxa_ordered
    entries = mp_quartet_entries(t0, t1, t2, t3)
    scores = {name: fitch_score(topo, chars) for name, _, topo in entries}
    min_tree = min(scores, key=scores.get)
    max_tree = max(scores, key=scores.get)

    out_dir = OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    for name, tid, _topo in entries:
        title = f"{name}  |  Fitch total = {scores[name]}"
        save_svg(render_mp_quartet_svg(tid, taxa_ordered, title), out_dir / f"mp_topology_{tid}.svg")
        print(f"Graph saved: {out_dir / f'mp_topology_{tid}.svg'}")
        if plt is not None:
            fig, ax = plt.subplots(figsize=(4.6, 2.9), dpi=140)
            draw_mp_quartet_matplotlib(ax, tid, taxa_ordered)
            fig.suptitle(f"{name}\nFitch score = {scores[name]}", fontsize=10, color="#0f172a", y=0.98)
            fig.patch.set_facecolor("#f8fafc")
            _save_figure_png_jpeg(fig, out_dir / f"mp_topology_{tid}", facecolor="#f8fafc")
            print(f"Raster saved: {out_dir / f'mp_topology_{tid}.png'} (+ .jpeg if available)")

    win_tid = next(tid for name, tid, _ in entries if name == min_tree)
    save_svg(
        render_mp_quartet_svg(
            win_tid,
            taxa_ordered,
            f"Most parsimonious — {min_tree}  (score {scores[min_tree]})",
        ),
        out_dir / "mp_best_topology.svg",
    )
    print(f"Graph saved: {out_dir / 'mp_best_topology.svg'}")
    if plt is not None:
        fig, ax = plt.subplots(figsize=(5.0, 3.2), dpi=140)
        draw_mp_quartet_matplotlib(ax, win_tid, taxa_ordered)
        fig.suptitle(
            f"Best topology (minimum frugality)\n{min_tree}  |  Fitch = {scores[min_tree]}",
            fontsize=11,
            color="#0f172a",
        )
        fig.patch.set_facecolor("#f8fafc")
        _save_figure_png_jpeg(fig, out_dir / "mp_best_topology", facecolor="#f8fafc")
        print(f"Raster saved: {out_dir / 'mp_best_topology.png'} (+ .jpeg if available)")

    if plt is not None:
        fig, axes = plt.subplots(1, 3, figsize=(11.4, 3.5), dpi=140)
        for ax, (name, tid, _) in zip(axes.flat, entries):
            draw_mp_quartet_matplotlib(ax, tid, taxa_ordered)
            tag = " ★ most parsimonious" if name == min_tree else ""
            ax.set_title(f"Topology {tid}{tag}\nFitch = {scores[name]}", fontsize=8, color="#0f172a")
        fig.suptitle(
            "Maximum parsimony — three quartet topologies (same layout as website)",
            fontsize=10,
            color="#0f172a",
        )
        fig.patch.set_facecolor("#f8fafc")
        fig.tight_layout(rect=[0, 0, 1, 0.92])
        _save_figure_png_jpeg(fig, out_dir / "mp_all_topologies_overview", facecolor="#f8fafc")
        print(f"Raster saved: {out_dir / 'mp_all_topologies_overview.png'} (+ .jpeg if available)")

    print("\nSite-by-site score table:")
    length = len(next(iter(chars.values())))
    for idx in range(length):
        print(f"  Site {idx + 1}")
        for name, _tid, topology in entries:
            score, states = site_score(topology, chars, idx)
            print(f"    {name} -> score {score}, states {states}")

    print("\nMaximum parsimony (Fitch) total scores:")
    for name, _tid, _ in entries:
        print(f"{name} -> {scores[name]}")
    print(f"\nMinimum frugality: {min_tree} (score {scores[min_tree]})")
    print(f"Maximum frugality: {max_tree} (score {scores[max_tree]})")


if __name__ == "__main__":
    print("Topic 15 — UPGMA, Neighbor Joining, Maximum parsimony (Fitch)")
    print("  1 — Distance matrix: UPGMA or Neighbor Joining")
    print("  2 — Maximum parsimony: four aligned sequences (three quartet topologies)")
    choice = input("Select mode (1 or 2): ").strip()
    try:
        if choice == "1":
            run_distance_mode()
        elif choice == "2":
            run_maximum_parsimony_mode()
        else:
            print("Invalid choice. Please run again and choose 1 or 2.")
    except ValueError as exc:
        print(f"Input error: {exc}")
