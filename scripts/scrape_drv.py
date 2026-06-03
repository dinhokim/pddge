"""Парсер drv.ge — собирает пояснения по 921 билету категории B.

Использование:
  export DRV_COOKIES='_skillout_session=...; remember_courses_account_token=...; cf_clearance=...; courses_account.id=...'

  # 1) Сухой тест парсера на одном URL (без обхода):
  python3 scripts/scrape_drv.py --single "https://learn.drv.ge/test_results/.../test_result_items/..."

  # 2) Один блок (тема):
  python3 scripts/scrape_drv.py --blocks 44

  # 3) Несколько блоков:
  python3 scripts/scrape_drv.py --blocks 41,42,43

  # 4) ВСЕ 32 темы (block_id 41..72) — ~30-60 минут:
  python3 scripts/scrape_drv.py --all

Поведение:
  • Использует requests.Session с твоими cookies
  • Заходит на /test_modes/182/test_practice?block_id=N
  • Парсит текущий test_result_item: question_id, вопрос, картинка, варианты, правильный, пояснение
  • Делает PATCH ответа (правильным значением) и переходит к следующему — пока не закончится тема
  • Инкрементально сохраняет в data/drv_explanations.json (можно прервать Ctrl+C и продолжить)
  • Rate limit: 1.8 сек между запросами
  • При 403 / редиректе на sign_in — печатает понятную ошибку (cookies протухли)
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

BASE = "https://learn.drv.ge"
DELAY = 1.8
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/120.0.0.0 Safari/537.36")

# Все темы категории B: block_id 41..72 (по странице /tests/94)
ALL_BLOCKS = list(range(41, 73))

ROOT = Path(__file__).resolve().parent.parent
OUT_DEFAULT = ROOT / "data" / "drv_explanations.json"


# ───────────────────────────────────────────────────────────────
# HTTP
# ───────────────────────────────────────────────────────────────

def make_session(cookies: str) -> requests.Session:
    """Создаём сессию с авторизационными cookies. Cookies приходят как одна строка
    'name1=val1; name2=val2; ...' (как из заголовка Cookie). Парсим в jar."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.9",
    })
    for kv in cookies.split(";"):
        kv = kv.strip()
        if not kv or "=" not in kv:
            continue
        name, val = kv.split("=", 1)
        s.cookies.set(name.strip(), val.strip(), domain="learn.drv.ge")
    return s


def check_auth(resp: requests.Response) -> None:
    if resp.status_code == 403:
        raise SystemExit(
            "HTTP 403 от Cloudflare — cf_clearance просрочен или подозрительный fingerprint.\n"
            "Залогинься в браузере заново, обнови cf_clearance и _skillout_session в DRV_COOKIES."
        )
    loc = (resp.history[-1].headers.get("Location") if resp.history else None) or ""
    if "sign_in" in loc or "sign_in" in resp.url:
        raise SystemExit(
            "Редирект на /accounts/sign_in — _skillout_session просрочен.\n"
            "Залогинься заново в браузере и обнови cookies."
        )


# ───────────────────────────────────────────────────────────────
# Парсинг страницы test_result_item
# ───────────────────────────────────────────────────────────────

def _unwrap_turbo(html: str) -> str:
    """Turbo Stream возвращает контент в <template>. BS4 его не парсит как DOM —
    вытащим строку и распарсим её отдельно."""
    if "<template>" in html and "</template>" in html:
        start = html.find("<template>") + len("<template>")
        end = html.rfind("</template>")
        if end > start:
            return html[start:end]
    return html


def _scoped_soup(html: str) -> BeautifulSoup:
    """Если есть Turbo Stream — берём только его содержимое.
    Если есть полная HTML — ограничиваемся <turbo-frame id='test-results-form'>
    (иначе h2/img подцепляют шапку/баннеры)."""
    unwrapped = _unwrap_turbo(html)
    full = BeautifulSoup(unwrapped, "lxml")
    tf = full.find("turbo-frame", id="test-results-form")
    if tf:
        return BeautifulSoup(str(tf), "lxml")
    return full


def parse_item(html: str) -> dict | None:
    soup = _scoped_soup(html)

    # ID вопроса: либо turbo-stream формат (test_result_item[question_id]),
    # либо полный — просто question_id
    qid_input = (
        soup.select_one('input[name="test_result_item[question_id]"]')
        or soup.select_one('input[name="question_id"]')
    )
    if not qid_input or not qid_input.get("value"):
        return None
    try:
        question_id = int(qid_input["value"])
    except (ValueError, KeyError):
        return None

    h2 = soup.select_one("h2")
    question = h2.get_text(strip=True) if h2 else ""

    img_el = soup.select_one("img[alt='Изображение для вопроса']")
    image_url = img_el["src"] if img_el else None

    options, correct_index = [], None
    for i, opt in enumerate(soup.select(".answer-option")):
        cls = opt.get("class", [])
        text = opt.get_text(strip=True)
        options.append(text)
        if "answer-option--correct" in cls:
            correct_index = i

    explanation = ""
    for p in soup.find_all("p"):
        prev = p.find_previous(string=re.compile(r"Объяснение"))
        if prev:
            explanation = p.get_text(strip=True)
            break

    return {
        "question_id": question_id,
        "question": question,
        "image_url": image_url,
        "options": options,
        "correct_index": correct_index,
        "explanation": explanation,
    }


def parse_form_meta(html: str) -> dict | None:
    """Извлекает action формы, токены и default-значение answers.
    Поддерживает оба формата:
      - POST на коллекцию `/test_results/<rid>/test_result_items` (первый заход)
      - PATCH на ресурс `/test_results/<rid>/test_result_items/<id>` (turbo-stream)
    """
    soup = _scoped_soup(html)
    form = soup.select_one('form[action*="test_result_items"]')
    if not form:
        return None
    action = form.get("action")
    method_hidden = form.select_one('input[name="_method"]')
    method = (method_hidden.get("value") if method_hidden else None) or form.get("method") or "post"
    tok_el = form.select_one('input[name="authenticity_token"]')
    if not tok_el:
        return None

    # default answers (в Rails-форме приходит как hidden input с placeholder-значением)
    answers_input = form.select_one('input[name$="[answers]"]') or form.select_one('input[name="answers"]')
    answers_value = answers_input.get("value") if answers_input else None

    # block_id если есть
    block_input = form.select_one('input[name="block_id"]')
    block_id = int(block_input.get("value")) if block_input and block_input.get("value") else None

    # question_id из формы
    qid_input = (
        form.select_one('input[name="test_result_item[question_id]"]')
        or form.select_one('input[name="question_id"]')
    )
    qid = int(qid_input.get("value")) if qid_input and qid_input.get("value") else None

    return {
        "action": action,
        "method": method.lower(),
        "token": tok_el.get("value"),
        "answers": answers_value,
        "block_id": block_id,
        "question_id": qid,
    }


def get_next_link(html: str) -> str | None:
    """Возвращает href ссылки 'Далее' с текущей страницы билета."""
    soup = BeautifulSoup(_unwrap_turbo(html), "lxml")
    for a in soup.find_all("a"):
        text = a.get_text(strip=True)
        if text == "Далее" or text.startswith("Далее"):
            href = a.get("href")
            if href:
                return href
    return None


# ───────────────────────────────────────────────────────────────
# Хранилище
# ───────────────────────────────────────────────────────────────

def load_existing(path: Path) -> dict[int, dict]:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text("utf-8"))
    return {int(k): v for k, v in raw.items()}


def save(path: Path, data: dict[int, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {str(k): v for k, v in sorted(data.items())}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")


# ───────────────────────────────────────────────────────────────
# Обход
# ───────────────────────────────────────────────────────────────

def submit_answer(session: requests.Session, meta: dict,
                  item: dict, block_id: int) -> requests.Response:
    """POST ответа на стартовой странице темы. Сервер вернёт 302 на следующую страницу темы.
    Используем правильный вариант (нам всё равно, главное — продвинуть курсор)."""
    correct_idx = item.get("correct_index")
    if correct_idx is None or correct_idx >= len(item["options"]):
        answer_text = item["options"][0] if item["options"] else "I"
    else:
        answer_text = item["options"][correct_idx]

    url = urljoin(BASE, meta["action"])
    qid = meta.get("question_id") or item["question_id"]

    if meta["method"] == "patch":
        payload = {
            "_method": "patch",
            "authenticity_token": meta["token"],
            "test_result_item[question_id]": str(qid),
            "test_result_item[answer]": answer_text,
            "test_result_item[answers]": meta.get("answers") or "",
        }
    else:
        payload = {
            "authenticity_token": meta["token"],
            "question_id": str(qid),
            "block_id": str(block_id),
            "answer": answer_text,
            "answers": meta.get("answers") or "",
        }

    headers = {
        "X-CSRF-Token": meta["token"],
        "Accept": "text/vnd.turbo-stream.html",
        "Referer": f"{BASE}/test_modes/182/test_practice?block_id={block_id}",
        "Origin": BASE,
    }
    # ВАЖНО: allow_redirects=False, иначе requests подменит Accept на default
    # после 302, и следующий GET вернёт 406. После POST делаем GET вручную.
    return session.post(url, data=payload, headers=headers,
                        allow_redirects=False, timeout=30)


def extract_item_links(html: str) -> list[str]:
    """Из навигации страницы вытаскивает href'ы пройденных билетов
    (.question-item-correct/incorrect) → они ведут на /test_results/<rid>/test_result_items/<id>."""
    soup = _scoped_soup(html)
    out = []
    for a in soup.select("a.question-item-correct, a.question-item-incorrect"):
        href = a.get("href", "")
        if "test_result_items/" in href:
            out.append(href)
    return out


def scrape_block(session: requests.Session, block_id: int,
                 data: dict[int, dict], out_path: Path,
                 max_iters: int = 200) -> int:
    """Прогон одной темы.
    Шаги:
      1. GET страницы темы → видим первый билет
      2. POST с ответом на этот билет → 302 → GET автоматически следует, попадает на следующий билет
      3. Повторяем пока на странице есть форма
      4. В конце собираем все ссылки на test_result_items из навигации последней страницы
      5. GET каждой ссылки → парсим вопрос + пояснение → сохраняем
    """
    start_url = f"{BASE}/test_modes/182/test_practice?block_id={block_id}"
    print(f"\n=== block_id={block_id} ===", file=sys.stderr)

    r = session.get(start_url, timeout=30)
    check_auth(r)

    seen_qids: set[int] = set()
    added = 0
    iters = 0

    while iters < max_iters:
        iters += 1
        item = parse_item(r.text)
        meta = parse_form_meta(r.text)
        if not item or not meta:
            print(f"  iter {iters}: no question form → block complete", file=sys.stderr)
            break

        qid = item["question_id"]
        if qid in seen_qids:
            print(f"  iter {iters}: cycle at qid={qid} → block complete", file=sys.stderr)
            break
        seen_qids.add(qid)

        # POST → 302 c Location на свежесозданный test_result_item (с пояснением)
        try:
            time.sleep(DELAY)
            pr = submit_answer(session, meta, item, block_id)
        except Exception as e:
            print(f"  iter {iters}: POST failed: {e}", file=sys.stderr)
            break

        if pr.status_code != 302:
            check_auth(pr)
            print(f"  iter {iters}: POST status {pr.status_code}, breaking", file=sys.stderr)
            break

        item_url = pr.headers.get("Location")
        if not item_url:
            print(f"  iter {iters}: no Location after POST → breaking", file=sys.stderr)
            break

        # GET страницы пройденного билета — там вопрос с правильным + пояснение
        time.sleep(DELAY)
        try:
            ar = session.get(item_url, timeout=30)
            check_auth(ar)
        except Exception as e:
            print(f"  iter {iters}: GET item page failed: {e}", file=sys.stderr)
            break

        answered = parse_item(ar.text)
        if answered and answered.get("explanation"):
            if qid not in data or not data[qid].get("explanation"):
                data[qid] = answered
                added += 1
                save(out_path, data)
                preview = (answered["question"][:55] + "…") if len(answered["question"]) > 55 else answered["question"]
                print(f"  iter {iters}: ✓ qid={qid}  {preview}", file=sys.stderr)
            else:
                print(f"  iter {iters}: qid={qid} cached", file=sys.stderr)
        else:
            print(f"  iter {iters}: qid={qid} ⚠ no explanation on answered page", file=sys.stderr)

        # переходим к следующему билету — GET стартовой страницы темы (там форма следующего вопроса)
        time.sleep(DELAY)
        try:
            r = session.get(start_url, timeout=30)
            check_auth(r)
        except Exception as e:
            print(f"  iter {iters}: GET next failed: {e}", file=sys.stderr)
            break

    print(f"  block_id={block_id} done. new: {added}, total store: {len(data)}",
          file=sys.stderr)
    return added


# ───────────────────────────────────────────────────────────────
# main
# ───────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--single", help="Сухой тест — один URL test_result_item")
    g.add_argument("--blocks", help="Список block_id через запятую (например, 41,42,43)")
    g.add_argument("--all", action="store_true", help="Все блоки 41..72 (~921 вопросов)")
    ap.add_argument("--output", default=str(OUT_DEFAULT))
    ap.add_argument("--cookies", help="Cookies строкой (или env DRV_COOKIES)")
    args = ap.parse_args()

    cookies = args.cookies or os.environ.get("DRV_COOKIES", "").strip()
    if not cookies:
        print("ERROR: нужны cookies — пробрось через env DRV_COOKIES или --cookies",
              file=sys.stderr)
        sys.exit(1)

    session = make_session(cookies)
    out_path = Path(args.output)
    data = load_existing(out_path)
    print(f"loaded existing: {len(data)} items", file=sys.stderr)

    if args.single:
        r = session.get(args.single, timeout=30)
        check_auth(r)
        item = parse_item(r.text)
        print(json.dumps(item, ensure_ascii=False, indent=2))
        return

    if args.blocks:
        blocks = [int(x) for x in args.blocks.split(",") if x.strip()]
    elif args.all:
        blocks = ALL_BLOCKS
    else:
        print("ERROR: укажи --single URL, --blocks 41,42, либо --all",
              file=sys.stderr)
        sys.exit(1)

    total_added = 0
    for i, b in enumerate(blocks, 1):
        print(f"\n[{i}/{len(blocks)}] block {b}", file=sys.stderr)
        try:
            total_added += scrape_block(session, b, data, out_path)
        except SystemExit:
            raise
        except KeyboardInterrupt:
            print("\n⚠ interrupted by user — данные сохранены", file=sys.stderr)
            break
        except Exception as e:
            print(f"  block {b} ERR: {e}", file=sys.stderr)

    print(f"\n=== DONE === total in store: {len(data)}, новых в этом запуске: {total_added}",
          file=sys.stderr)
    print(f"saved to: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
