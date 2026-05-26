"""Парсер artdrive.ge для билетов кат. B (tc=2).

Запуск:
  python3 scripts/scrape.py --topic 4              # одна тема
  python3 scripts/scrape.py --all                  # все темы
  python3 scripts/scrape.py --topic 4 --no-images  # без скачивания картинок

Результат:
  data/questions.json    — массив билетов
  public/images/<id>.jpg — картинки
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from topics import TOPICS, BY_TCSC  # noqa: E402

BASE = "https://www.artdrive.ge"
TC_B = 2  # категория B/B1
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                  " (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "ru,en;q=0.9",
}
DELAY = 1.8

DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "public" / "images"
DATA_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

session = requests.Session()
session.headers.update(HEADERS)


def fetch(url: str, retries: int = 5) -> str:
    last_err = None
    for attempt in range(retries):
        try:
            r = session.get(url, timeout=30)
            if r.status_code in (403, 429, 503):
                # rate limit / временная блокировка — экспоненциальный backoff
                wait = 5 * (2 ** attempt)
                print(f"  rate-limit {r.status_code} → sleep {wait}s ({url})",
                      file=sys.stderr)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.text
        except requests.HTTPError as e:
            last_err = e
            time.sleep(2 + attempt * 2)
        except Exception as e:
            last_err = e
            time.sleep(2 + attempt)
    raise RuntimeError(f"failed to fetch {url}: {last_err}")


def list_ticket_ids(tcsc: int, tc: int = TC_B) -> list[int]:
    """Все cc-id для (tcsc, tc) с обходом пагинации."""
    ids: set[int] = set()
    page = 1
    seen_pages = 0
    while page <= 60:  # safety
        url = f"{BASE}/ru/tickets.php?tcsc={tcsc}&tc={tc}&page={page}"
        html = fetch(url)
        found = {int(m) for m in re.findall(r"tickets\.php\?cc=(\d+)", html)}
        new_ids = found - ids
        if not new_ids:
            seen_pages += 1
            if seen_pages >= 2:
                break
        else:
            seen_pages = 0
        ids.update(found)
        page += 1
        time.sleep(DELAY)
    return sorted(ids)


def parse_ticket(cc: int) -> dict | None:
    url = f"{BASE}/ru/tickets.php?cc={cc}"
    html = fetch(url)
    soup = BeautifulSoup(html, "lxml")

    q_el = soup.select_one(".ticket_form_question")
    if not q_el:
        return None
    question = q_el.get_text(" ", strip=True)

    cats_el = soup.select_one(".tickets_main_side_addition_title")
    applicable_raw = cats_el.get_text(strip=True) if cats_el else ""

    img_el = soup.select_one(".ticket_form_image_container img")
    img_src = img_el.get("src") if img_el else None
    image_file = None
    if img_src:
        full = urljoin(BASE, img_src)
        ext = os.path.splitext(full.split("?")[0])[1].lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
            ext = ".jpg"
        image_file = f"{cc}{ext}"

    answers: list[str] = []
    correct: int | None = None
    for a in soup.select(".answers_variants_form"):
        title_el = a.select_one(".answers_form_title")
        text = title_el.get_text(" ", strip=True) if title_el else ""
        classes = a.get("class", [])
        if "empty_variant" in classes or not text:
            continue
        if a.get("data-is-right") == "true":
            correct = len(answers)
        answers.append(text)

    exp_el = soup.select_one(".ticket_definition_content_container_main_content")
    explanation_raw = exp_el.get_text(" ", strip=True) if exp_el else ""

    return {
        "id": cc,
        "question": question,
        "image": image_file,
        "image_url": img_src,
        "answers": answers,
        "correct": correct,
        "applicable": applicable_raw,
        "explanation_raw": explanation_raw,
    }


def download_image(cc: int, src: str, ext_file: str) -> bool:
    dst = IMG_DIR / ext_file
    if dst.exists() and dst.stat().st_size > 0:
        return True
    full = urljoin(BASE, src)
    try:
        r = session.get(full, timeout=30)
        r.raise_for_status()
        dst.write_bytes(r.content)
        return True
    except Exception as e:
        print(f"  ! image fail cc={cc}: {e}", file=sys.stderr)
        return False


def load_existing() -> dict[int, dict]:
    p = DATA_DIR / "questions.json"
    if not p.exists():
        return {}
    raw = json.loads(p.read_text("utf-8"))
    return {q["id"]: q for q in raw.get("questions", [])}


def save_all(by_id: dict[int, dict], topic_index: dict[int, int]) -> None:
    out = {
        "version": 1,
        "category": "B",
        "source": "artdrive.ge",
        "questions": [],
    }
    for cc in sorted(by_id):
        q = dict(by_id[cc])
        q["topic"] = topic_index.get(cc)
        out["questions"].append(q)
    (DATA_DIR / "questions.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_topic_index() -> dict[int, int]:
    """cc → tcsc (тема)."""
    p = DATA_DIR / "topic_index.json"
    if not p.exists():
        return {}
    return {int(k): v for k, v in json.loads(p.read_text("utf-8")).items()}


def save_topic_index(idx: dict[int, int]) -> None:
    (DATA_DIR / "topic_index.json").write_text(
        json.dumps({str(k): v for k, v in idx.items()},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def run(tcsc_list: list[int], skip_images: bool = False) -> None:
    by_id = load_existing()
    topic_index = load_topic_index()

    for tcsc in tcsc_list:
        if tcsc not in BY_TCSC:
            print(f"skip unknown tcsc={tcsc}")
            continue
        _, slug, ru, _ge = BY_TCSC[tcsc]
        print(f"\n=== tcsc={tcsc} {slug} «{ru}» ===")
        ids = list_ticket_ids(tcsc)
        print(f"  found {len(ids)} ticket ids")

        for i, cc in enumerate(ids, 1):
            # Тему фиксируем для всех id из листинга,
            # даже если билет уже спарсен из другой темы
            topic_index[cc] = tcsc
            if cc in by_id and by_id[cc].get("question"):
                print(f"  [{i}/{len(ids)}] cc={cc} cached")
            else:
                try:
                    parsed = parse_ticket(cc)
                except Exception as e:
                    print(f"  [{i}/{len(ids)}] cc={cc} ERR {e}", file=sys.stderr)
                    continue
                if not parsed:
                    print(f"  [{i}/{len(ids)}] cc={cc} empty")
                    continue
                by_id[cc] = parsed
                print(f"  [{i}/{len(ids)}] cc={cc} ok"
                      f" ({len(parsed['answers'])} ans, correct={parsed['correct']})")
                time.sleep(DELAY)

            # картинка
            if not skip_images:
                q = by_id[cc]
                if q.get("image_url") and q.get("image"):
                    download_image(cc, q["image_url"], q["image"])

        # промежуточное сохранение после каждой темы
        save_all(by_id, topic_index)
        save_topic_index(topic_index)
        print(f"  saved {len(by_id)} questions total")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--topic", type=int, action="append",
                   help="tcsc темы (можно несколько раз)")
    g.add_argument("--all", action="store_true", help="все 31 темы")
    ap.add_argument("--no-images", action="store_true")
    args = ap.parse_args()

    if args.all:
        tcsc_list = [t[0] for t in TOPICS]
    else:
        tcsc_list = args.topic

    run(tcsc_list, skip_images=args.no_images)


if __name__ == "__main__":
    main()
