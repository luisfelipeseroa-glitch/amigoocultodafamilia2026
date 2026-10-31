import pathlib

base = pathlib.Path(__file__).parent
core = (base / "src/core.js").read_text(encoding="utf-8")

import base64
hero = "data:image/jpeg;base64," + base64.b64encode((base / "src/hero.jpg").read_bytes()).decode()

html = (base / "src/app.html").read_text(encoding="utf-8")
assert "/*__CORE__*/" in html and "/*__HERO__*/" in html
html = html.replace("/*__CORE__*/", core).replace("/*__HERO__*/", hero)
(base / "dist/index.html").write_text(html, encoding="utf-8")

gs = (base / "src/Code.gs.tpl").read_text(encoding="utf-8")
assert "/*__CORE__*/" in gs
(base / "dist/Code.gs").write_text(gs.replace("/*__CORE__*/", core), encoding="utf-8")

print("build ok:", [p.name for p in (base / "dist").iterdir()])
