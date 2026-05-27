import { h, mount, topbar } from "../render.js";
import { TOPICS, TOPICS_BY_SLUG } from "../data.js";
import { renderTicket } from "./ticket.js";
import { hideMainButton, isTG } from "../tg.js";
import { getDifficultSet, getLearnedSet } from "../store.js";

export function renderTheoryTopics(ctx) {
  if (isTG) hideMainButton();
  const node = h("div", { class: "app" },
    topbar("Темы", { back: () => (location.hash = "#/") }),
    h("div", { class: "topic-list" },
      ...TOPICS.map((t) => {
        const qs = ctx.data.byTopic[t.tcsc] || [];
        const empty = qs.length === 0;
        const props = {
          class: `topic-row ${empty ? "empty" : ""}`,
          href: empty ? null : `#/theory/${t.slug}`,
        };
        return h("a", props,
          h("div", { class: "idx" }, `${t.order}.`),
          h("div", { class: "name" }, t.name),
          h("div", { class: "count" }, empty ? "—" : `${qs.length}`),
        );
      }),
    ),
    h("div", { class: "info-note" },
      "Сейчас спарсена тема «Знаки приоритета» (демо-срез). ",
      "Остальные темы появятся после полного прогона парсера."
    ),
  );
  mount(node);
}

export function renderTheoryTopic(ctx, slug) {
  if (isTG) hideMainButton();
  const topic = TOPICS_BY_SLUG[slug];
  if (!topic) { location.hash = "#/theory"; return; }
  const qs = (ctx.data.byTopic[topic.tcsc] || []).slice().sort((a, b) => a.id - b.id);

  const progress = ctx.store.getProgress();
  const diff = getDifficultSet();
  const learn = getLearnedSet();
  const node = h("div", { class: "app" },
    topbar(topic.name, { back: () => (location.hash = "#/theory") }),
    qs.length === 0
      ? h("div", { class: "info-note" }, "Билеты этой темы пока не загружены.")
      : h("div", { class: "ticket-grid" },
          ...qs.map((q, i) => {
            const rec = progress.answered[q.id];
            const isDiff = diff.has(q.id);
            const isLearn = learn.has(q.id);
            const ansCls = rec ? (rec.correct ? "ok" : "fail") : "";
            const cls = `ticket-tile ${ansCls}${isLearn ? " learned" : ""}${isDiff ? " hot" : ""}`;
            const titleSuffix = [
              isLearn ? "пройден" : null,
              isDiff ? "сложный" : null,
            ].filter(Boolean).join(", ");
            return h("a", {
              class: cls,
              href: `#/theory/${slug}/${q.id}`,
              title: `Билет №${q.id}${titleSuffix ? " · " + titleSuffix : ""}`,
            },
              String(i + 1),
              isLearn ? h("span", { class: "learn-mark", "aria-label": "пройдено" }, "✅") : null,
              isDiff ? h("span", { class: "fire-mark", "aria-label": "сложный" }, "🔥") : null,
            );
          }),
        ),
  );
  mount(node);
}

export function renderTheoryTicket(ctx, slug, id) {
  const topic = TOPICS_BY_SLUG[slug];
  if (!topic) { location.hash = "#/theory"; return; }
  const qs = (ctx.data.byTopic[topic.tcsc] || []).slice().sort((a, b) => a.id - b.id);
  const idx = qs.findIndex(q => q.id === +id);
  if (idx < 0) { location.hash = `#/theory/${slug}`; return; }
  const q = qs[idx];
  const prev = qs[idx - 1] ? `#/theory/${slug}/${qs[idx - 1].id}` : null;
  const next = qs[idx + 1] ? `#/theory/${slug}/${qs[idx + 1].id}` : null;

  renderTicket(ctx, {
    q,
    topicName: topic.name,
    revealMode: "always",
    headerTitle: `Билет №${q.id} · ${idx + 1}/${qs.length}`,
    back: () => (location.hash = `#/theory/${slug}`),
    onAnswer: (correct) => ctx.store.recordAnswer(q.id, correct),
    nav: {
      prev: prev ? () => (location.hash = prev) : null,
      next: next ? () => (location.hash = next) : null,
    },
  });
}
