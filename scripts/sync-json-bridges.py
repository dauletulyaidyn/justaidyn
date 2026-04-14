from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAIRS = [
    ('data/course-pages.json', 'data/course-pages-data.js', '__COURSE_PAGES__'),
    ('data/articles-pages.json', 'data/articles-pages-data.js', '__ARTICLES_PAGES__'),
]

for json_rel, js_rel, var_name in PAIRS:
    json_path = ROOT / json_rel
    js_path = ROOT / js_rel
    payload = json.loads(json_path.read_text(encoding='utf-8'))
    js_path.write_text(
        f"window.{var_name} = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding='utf-8'
    )
    print(f'synced {js_rel}')
