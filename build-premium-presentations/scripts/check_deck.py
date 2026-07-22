#!/usr/bin/env python3
"""Dependency-free structural preflight for a Reveal.js presentation."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


CHECKS = {
    "doctype": re.compile(r"<!doctype html>", re.I),
    "language": re.compile(r"<html[^>]+lang=[\"'][^\"']+[\"']", re.I),
    "direction": re.compile(r"<html[^>]+dir=[\"'](?:rtl|ltr)[\"']", re.I),
    "viewport": re.compile(r"name=[\"']viewport[\"']", re.I),
    "reveal": re.compile(r"Reveal\.initialize\s*\("),
    "slides": re.compile(r"class=[\"'][^\"']*slides"),
    "reduced_motion": re.compile(r"prefers-reduced-motion"),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("deck", type=Path)
    args = parser.parse_args()
    root = args.deck.resolve()
    index_path = root / "index.html"
    if not index_path.is_file():
        print("ERROR: index.html not found", file=sys.stderr)
        return 2

    combined = "\n".join(
        p.read_text(encoding="utf-8", errors="replace")
        for p in [index_path, *sorted(root.glob("*.css")), *sorted(root.glob("*.js"))]
    )
    errors: list[str] = []
    warnings: list[str] = []

    for name, pattern in CHECKS.items():
        if not pattern.search(combined):
            errors.append(f"missing {name}")

    ids = re.findall(r"<section\b[^>]*\bid=[\"']([^\"']+)[\"']", combined, re.I)
    if not ids:
        errors.append("slides need stable section IDs")
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        errors.append("duplicate slide IDs: " + ", ".join(duplicates))

    sections = re.findall(r"<section\b([^>]*)>", combined, re.I)
    missing_time = sum("data-time-hint" not in attrs for attrs in sections)
    if missing_time:
        warnings.append(f"{missing_time} slide(s) lack data-time-hint")

    refs = re.findall(r"(?:src|href)=[\"']([^\"'#?]+)", index_path.read_text(encoding="utf-8"), re.I)
    for ref in refs:
        if re.match(r"(?:https?:|data:|mailto:|tel:)", ref, re.I):
            continue
        candidate = (root / ref).resolve()
        try:
            candidate.relative_to(root)
        except ValueError:
            errors.append(f"asset escapes deck root: {ref}")
            continue
        if not candidate.exists():
            errors.append(f"missing local asset: {ref}")

    forbidden = re.compile(r"(?:api[_-]?key|secret|token)\s*[:=]\s*[\"'][^\"']{8,}", re.I)
    if forbidden.search(combined):
        errors.append("possible embedded secret")

    for item in warnings:
        print(f"WARN: {item}")
    for item in errors:
        print(f"ERROR: {item}")
    if errors:
        return 1
    print(f"OK: {len(ids)} slides passed structural preflight")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
