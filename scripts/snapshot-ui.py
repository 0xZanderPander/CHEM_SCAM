#!/usr/bin/env python3
"""Capture the running site as standalone HTML files that render anywhere.

The design handoff in references/ depends on the Tailwind Play CDN, which builds
its stylesheet at runtime with JavaScript. Any viewer that does not execute JS --
a preview pane, Quick Look, an offline browser -- shows that file as unstyled
HTML and the design looks broken when it is not.

These snapshots have the opposite property: the compiled stylesheet is inlined,
the latin webfonts are embedded as base64, and every script is stripped. They
render identically with no network, no JS, and no build step.

    python3 scripts/snapshot-ui.py [base-url] [out-dir]
"""
import base64
import pathlib
import re
import ssl
import sys
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://localhost").rstrip("/")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "ui-snapshots")
PAGES = [("/", "01-home"), ("/about", "02-about"), ("/policy", "03-policy"), ("/contact", "04-contact")]

# The local rehearsal stack serves Caddy's internal certificate.
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def get(path: str) -> bytes:
    url = path if path.startswith("http") else BASE + path
    with urllib.request.urlopen(url, context=CTX, timeout=30) as r:
        return r.read()


def inline_fonts(css: str, css_href: str) -> str:
    """Embed the latin woff2 subsets only. The cyrillic and greek faces are never
    used by this content and would triple the file size for nothing.

    Next emits font URLs relative to the stylesheet (../media/x.woff2), so they
    are resolved against the stylesheet's own path rather than the site root.
    """
    embedded = 0
    for ref in sorted(set(re.findall(r"url\(([^)]+\.woff2)\)", css))):
        if "latin" not in ref:
            continue
        # Resolve per reference. Sharing a mutable base across iterations let one
        # "../" hop leak into the next lookup, so most fonts silently 404'd and
        # the snapshot fell back to system typefaces.
        base_dir = css_href.rsplit("/", 1)[0]
        resolved = ref
        while resolved.startswith("../"):
            resolved = resolved[3:]
            base_dir = base_dir.rsplit("/", 1)[0]
        resolved = resolved if resolved.startswith("/") else f"{base_dir}/{resolved}"
        try:
            data = base64.b64encode(get(resolved)).decode()
        except Exception as exc:  # noqa: BLE001
            print(f"    warning: font {resolved} not embedded: {exc}")
            continue
        css = css.replace(f"url({ref})", f"url(data:font/woff2;base64,{data})")
        embedded += 1

    # Each face lists a woff2 and a legacy woff. Having embedded the woff2, drop
    # the leftover relative sources -- otherwise the face still references the
    # network and the cleanup below would discard the whole block, silently
    # undoing the embedding and falling back to system type.
    css = re.sub(r",?\s*url\((?!data:)[^)]*\)\s*format\([^)]*\)", "", css)
    css = re.sub(r"src\s*:\s*,", "src:", css)

    # Only now drop faces that never got an embedded source.
    def keep(match: "re.Match[str]") -> str:
        return match.group(0) if "data:font" in match.group(0) else ""

    css = re.sub(r"@font-face\s*\{[^}]*\}", keep, css)
    print(f"    embedded {embedded} latin webfonts")
    return css


def snapshot(path: str, name: str) -> pathlib.Path:
    html = get(path).decode("utf-8", "replace")

    hrefs = re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html)
    hrefs += [h for h in re.findall(r'<link[^>]+href="([^"]+\.css)"', html) if h not in hrefs]
    css_parts = []
    for href in hrefs:
        try:
            css_parts.append(inline_fonts(get(href).decode("utf-8", "replace"), href))
        except Exception as exc:  # noqa: BLE001
            print(f"    warning: could not inline {href}: {exc}")

    # Strip stylesheet links, scripts, and preloads: everything needed is inlined,
    # and the leftovers would only produce failed requests in a viewer.
    html = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', "", html)
    html = re.sub(r'<link[^>]+\.css"[^>]*>', "", html)
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(r"<script[^>]*/>", "", html)
    html = re.sub(r'<link[^>]+rel="preload"[^>]*>', "", html)

    style = "<style>\n" + "\n".join(dict.fromkeys(css_parts)) + "\n</style>"
    html = html.replace("</head>", style + "\n</head>", 1) if "</head>" in html else style + html

    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{name}.html"
    out.write_text(html, encoding="utf-8")
    return out


if __name__ == "__main__":
    for path, name in PAGES:
        try:
            p = snapshot(path, name)
            print(f"  {p}  ({p.stat().st_size // 1024} KB)")
        except Exception as exc:  # noqa: BLE001
            print(f"  FAILED {path}: {exc}")
