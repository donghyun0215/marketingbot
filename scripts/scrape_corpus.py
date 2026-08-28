"""
blog.codepresso.io 본문 수집 → voice_corpus 적재 (Voice Engine 학습용).
- URL은 성과 리포트 xlsx의 셀 하이퍼링크에서 추출 (data/blog_urls.json)
- 본문은 Supabase에만 저장. public repo에는 커밋하지 않는다.
사용: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 scripts/scrape_corpus.py
"""
import os, json, time, re, urllib.request
from bs4 import BeautifulSoup

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
UA = {"User-Agent": "Mozilla/5.0 (compatible; marketingbot-corpus/1.0)"}

def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25).read().decode("utf-8", "ignore")

def extract(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()
    node = soup.find("article") or soup.find("main") or soup.body
    if not node:
        return ""
    parts = []
    for el in node.find_all(["h1", "h2", "h3", "p", "li"]):
        t = el.get_text(" ", strip=True)
        if len(t) > 1:
            parts.append(t)
    text = "\n".join(parts)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def post(rows):
    req = urllib.request.Request(f"{URL}/rest/v1/voice_corpus",
        data=json.dumps(rows).encode(),
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
        method="POST")
    with urllib.request.urlopen(req) as r:
        print(f"voice_corpus: {len(rows)} rows -> {r.status}")

def main():
    items = json.load(open("data/blog_urls.json"))
    out, skipped = [], []
    for n, it in enumerate(items, 1):
        try:
            body = extract(fetch(it["url"]))
        except Exception as e:
            skipped.append((it["url"], str(e)[:60])); continue
        if len(body) < 400:
            skipped.append((it["url"], f"too short ({len(body)})")); continue
        out.append({"title": it["title"], "body": body, "channel": "blog",
                    "source": "scraped", "published_at": it["published_at"]})
        if n % 10 == 0:
            print(f"  {n}/{len(items)}")
        time.sleep(0.4)   # 예의상 간격
    json.dump(out, open("data/corpus.json", "w"), ensure_ascii=False)
    print(f"collected {len(out)}, skipped {len(skipped)}")
    for s in skipped[:5]:
        print("  skip:", s)
    post(out)

if __name__ == "__main__":
    main()
