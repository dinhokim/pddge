// Stories-режим обучающих карточек.
// URL: #/theory/<slug>/cards
import { h, mount, fmt } from "../render.js";
import { TOPICS_BY_SLUG } from "../data.js";
import { getCards } from "../cards/index.js";
import { isTG, setBackButton, hideMainButton, hapticImpact } from "../tg.js";

export function renderCards(ctx, slug) {
  const topic = TOPICS_BY_SLUG[slug];
  const cards = getCards(slug);
  if (!topic || !cards || !cards.length) {
    location.hash = `#/theory/${slug}`;
    return;
  }
  if (isTG) hideMainButton();

  // индекс хранится в ctx.session.cards чтобы переживать рендеры
  const state = ctx.session.cards = ctx.session.cards || { slug, index: 0 };
  if (state.slug !== slug) {
    state.slug = slug;
    state.index = 0;
  }

  function close() {
    ctx.session.cards = null;
    location.hash = `#/theory/${slug}`;
  }
  function go(delta) {
    const next = state.index + delta;
    if (next < 0) return;
    if (next >= cards.length) { close(); return; }
    state.index = next;
    hapticImpact("light");
    render();
  }

  // TG нативный BackButton закрывает stories
  if (isTG) setBackButton(close);

  function render() {
    const idx = state.index;
    const total = cards.length;
    const card = cards[idx];

    // прогресс-полоски сверху
    const progressBar = h("div", { class: "cards-progress" },
      ...Array.from({ length: total }, (_, i) => {
        const cls = i < idx ? "done" : (i === idx ? "active" : "");
        return h("div", { class: `cards-progress-seg ${cls}` },
          h("div", { class: "fill" }),
        );
      }),
    );

    // верхняя строка: ✕ закрыть · счётчик
    const topRow = h("div", { class: "cards-topbar" },
      h("button", {
        class: "cards-close",
        onclick: close,
        "aria-label": "Закрыть",
      }, "✕"),
      h("div", { class: "cards-counter" }, `${idx + 1} / ${total}`),
      h("div", { class: "cards-topic" }, topic.name),
    );

    // визуал
    const visual = card.visual
      ? h("div", { class: "cards-visual", html: typeof card.visual === "function" ? card.visual() : card.visual })
      : null;

    // тело
    const body = h("div", { class: "cards-body" },
      card.subtitle ? h("div", { class: "cards-subtitle" }, card.subtitle) : null,
      h("h2", { class: "cards-title" }, card.title),
      card.body ? h("div", { class: "cards-text", html: fmt(card.body) }) : null,
      card.tip ? h("div", { class: "cards-tip" }, h("div", { html: fmt(card.tip) })) : null,
    );

    // зоны тапа: левая 1/3 — назад, правая 2/3 — вперёд
    const tapPrev = h("button", {
      class: "cards-tap left",
      onclick: () => go(-1),
      "aria-label": "Назад",
    });
    const tapNext = h("button", {
      class: "cards-tap right",
      onclick: () => go(+1),
      "aria-label": "Дальше",
    });

    // нижняя подсказка по навигации
    const hint = h("div", { class: "cards-hint" },
      idx === total - 1
        ? "Тап справа — завершить"
        : "Тап справа — дальше · слева — назад",
    );

    const root = h("div", { class: "cards-app" },
      topRow,
      progressBar,
      h("div", { class: "cards-content" },
        visual,
        body,
      ),
      hint,
      tapPrev,
      tapNext,
    );
    mount(root);
  }

  render();
}
