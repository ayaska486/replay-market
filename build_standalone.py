# -*- coding: utf-8 -*-
"""Inline CSS/JS/data into a single portable index.html."""
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, "index.html"), encoding="utf-8") as f:
    html = f.read()
with open(os.path.join(BASE, "style.css"), encoding="utf-8") as f:
    css = f.read()
with open(os.path.join(BASE, "data.js"), encoding="utf-8") as f:
    data = f.read()
with open(os.path.join(BASE, "app.js"), encoding="utf-8") as f:
    app = f.read()

html = html.replace(
    '<link rel="stylesheet" href="style.css">',
    "<style>\n" + css + "\n</style>",
)
html = html.replace(
    '<script src="data.js"></script>\n<script src="app.js"></script>',
    "<script>\n" + data + "\n</script>\n<script>\n" + app + "\n</script>",
)
if 'href="style.css"' in html or 'src="app.js"' in html or 'src="data.js"' in html:
    raise SystemExit("inline replacement failed")
if "</script>" in data or "</script>" in app:
    raise SystemExit("script payload contains closing tag")
out = os.path.join(BASE, "index.standalone.html")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)
print("wrote", out, os.path.getsize(out), "bytes")
