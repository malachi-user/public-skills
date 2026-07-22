#!/usr/bin/env python3
"""Copy the bundled Reveal.js starter into a new presentation directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("target", type=Path)
    parser.add_argument("--title", default="Premium Presentation")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    source = Path(__file__).resolve().parent.parent / "assets" / "deck-starter"
    target = args.target.resolve()
    if target.exists() and any(target.iterdir()) and not args.force:
        raise SystemExit(f"Refusing to overwrite non-empty directory: {target}")
    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True)

    index_path = target / "index.html"
    html = index_path.read_text(encoding="utf-8")
    direction = "rtl" if args.lang.lower().startswith(("he", "ar", "fa", "ur")) else "ltr"
    html = html.replace("{{TITLE}}", args.title).replace("{{LANG}}", args.lang).replace("{{DIR}}", direction)
    index_path.write_text(html, encoding="utf-8")
    print(f"Created deck at {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
