#!/usr/bin/env python3
"""WCAG 2.x contrast checker for the braves-audit accessibility pass.

Adapted from antislop-human (MIT, Miqdad Badjuber; see the root LICENSE).

Usage:
    python3 contrast-check.py "#FFFFFF" "#777777"
    python3 contrast-check.py --selftest

Takes opaque 3- or 6-digit hex colours. Exit code: 0 passes 4.5:1 (normal
text), 1 passes only 3:1 (large text, non-text UI), 2 fails both, 3 bad input.
"""

import math
import re
import sys


def parse_hex(value):
    value = value.strip().lstrip("#")
    if len(value) in (4, 8) and re.fullmatch(r"[0-9A-Fa-f]+", value):
        raise ValueError(f"#{value} has alpha: blend it onto its background first")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError(f"expected a hex colour like #FFFFFF, got {value!r}")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    def lin(ch):
        c = ch / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(ch) for ch in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a, b):
    lighter, darker = sorted((luminance(a), luminance(b)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def selftest():
    # Known pairs; verdicts read the unrounded ratio (#777 on #070707 is 4.498:1).
    pairs = [("000", "FFF", 21.00), ("FFF", "333", 12.63), ("FFF", "666", 5.74),
             ("777", "FFF", 4.48), ("777", "070707", 4.50), ("FFF", "888", 3.54),
             ("FFF", "999", 2.85), ("555", "000", 2.82)]
    for fg, bg, want in pairs:
        got = contrast_ratio(parse_hex(fg), parse_hex(bg))
        assert f"{got:.2f}" == f"{want:.2f}", (fg, bg, got)
    assert contrast_ratio(parse_hex("777"), parse_hex("070707")) < 4.5
    print(f"selftest: {len(pairs)} pairs OK")
    return 0


def main(argv):
    if argv == ["--selftest"]:
        return selftest()
    if len(argv) != 2:
        print("usage: python3 contrast-check.py <fg hex> <bg hex> | --selftest")
        return 3
    try:
        ratio = contrast_ratio(parse_hex(argv[0]), parse_hex(argv[1]))
    except ValueError as exc:
        print(f"error: {exc}")
        return 3
    normal, large = ratio >= 4.5, ratio >= 3.0
    # Truncate, never round: 4.498 must not print as a passing-looking 4.50.
    print(f"ratio: {math.floor(ratio * 100) / 100:.2f}:1")
    print(f"normal text (4.5:1): {'PASS' if normal else 'FAIL'}")
    print(f"large text / non-text UI (3.0:1): {'PASS' if large else 'FAIL'}")
    return 0 if normal else 1 if large else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
