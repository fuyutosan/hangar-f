# Bing などへ「このURLが新しくなった」と知らせる（IndexNow・無料）。公開のあとに動かす。2026-11-28
# indexnow-*.txt は持ち主の鍵。消すと知らせが通らなくなる
import json, pathlib, sys, urllib.request, urllib.error
HERE = pathlib.Path(__file__).parent
SITE = "https://hangar-f.pages.dev/"
keyfiles = sorted(HERE.glob("indexnow-*.txt"))
if not keyfiles:
    sys.exit("鍵のファイル（indexnow-*.txt）が見つからない")
key = keyfiles[0].read_text(encoding="utf-8").strip()
urls = sys.argv[1:] or [SITE, SITE + "llms.txt"]
bad = [u for u in urls if not u.startswith(SITE)]
if bad:
    sys.exit(f"このサイトのURLだけ送れる: {bad}")
body = json.dumps({"host": "hangar-f.pages.dev", "key": key, "keyLocation": SITE + keyfiles[0].name, "urlList": urls}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print("送った:", r.status, urls)
except urllib.error.HTTPError as e:
    print("失敗:", e.code, e.read()[:300])
except urllib.error.URLError as e:
    print("つながらなかった:", e.reason)
