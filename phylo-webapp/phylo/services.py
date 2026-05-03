"""Shared parsers for legacy saved-run payloads. Tree algorithms run in the browser (algo lab)."""

from __future__ import annotations


def parse_distance_input(taxa_raw: str, matrix_raw: str) -> tuple[list[str], list[list[float]]]:
    taxa = [t.strip() for t in taxa_raw.split(",") if t.strip()]
    if len(taxa) < 2:
        raise ValueError("Provide at least two taxa names separated by commas.")

    rows = [line.strip() for line in matrix_raw.splitlines() if line.strip()]
    matrix: list[list[float]] = []
    for row in rows:
        parts = [p.strip() for p in row.split(",")]
        matrix.append([float(p) for p in parts])

    n = len(taxa)
    if len(matrix) != n or any(len(r) != n for r in matrix):
        raise ValueError("Distance matrix must be square and match the number of taxa.")

    for i in range(n):
        if matrix[i][i] != 0:
            raise ValueError("All diagonal values must be 0.")
        for j in range(n):
            if abs(matrix[i][j] - matrix[j][i]) > 1e-9:
                raise ValueError("Distance matrix must be symmetric.")
            if matrix[i][j] < 0:
                raise ValueError("Distances cannot be negative.")

    return taxa, matrix


def parse_character_input(raw_block: str) -> dict[str, str]:
    lines = [ln.strip() for ln in raw_block.splitlines() if ln.strip()]
    data: dict[str, str] = {}
    for ln in lines:
        if ":" not in ln:
            raise ValueError("Each line must follow format Taxon:SEQUENCE")
        taxon, seq = ln.split(":", 1)
        taxon = taxon.strip()
        seq = seq.strip().upper()
        if not taxon or not seq:
            raise ValueError("Taxon and sequence must be non-empty.")
        if not seq.isalpha():
            raise ValueError("Sequences should contain letters only.")
        data[taxon] = seq

    if len(data) < 2:
        raise ValueError("Provide at least two taxa.")

    lengths = {len(v) for v in data.values()}
    if len(lengths) != 1:
        raise ValueError("All character strings must have equal length.")
    return data
