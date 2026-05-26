import { h, mount, topbar, progress, svgIcon } from "../render.js";
import { TOPICS, TOPICS_BY_SLUG } from "../data.js";
import { renderTicket } from "./ticket.js";
import { hideMainButton, isTG } from "../tg.js";

export function renderTheoryTopics(ctx) {
  if (isTG) hideMainButton();
  const prog = ctx.store.getProgress();
  const answered = prog.answered || {};

  const node = h("div", { class: "app" },
    topbar("Теория", {
      back: () => (location.hash = "#/"),
      subtitle: "Выберите тему",
    }),
    h("div", { class: "topic-list" },
      ...TOPICS.map((t) => topicCard(t, ctx, answered)),
    ),
  );
  mount(node);
}

function topicCard(t, ctx, answered) {
  const qs = ctx.data.byTopic[t.tcsc] || [];
  const empty = qs.length === 0;
  const correct = qs.filter(q => answered[q.id]?.correct).length;
  const total = qs.length;

  const props = {
    class: `topic-card ${empty ? "empty" : ""}`,
    href: empty ? null : `#/theory/${t.slug}`,
  };

  return h("a", props,
    h("div", {
      class: "icon",
      style: `background:${withAlpha(t.accent, 0.12)};color:${t.accent}`,
    }, t.emoji),
    h("div", { class: "body" },
      h("div", { class: "head" }, t.name),
      h("div", { class: "desc" }, t.description || ""),
      h("div", { class: "progress-row" },
        progress({ value: correct, max: Math.max(total, 1), color: t.accent, height: 5 }),
        h("div", { class: "count" }, empty ? "Скоро" : `${correct}/${total}`),
      ),
    ),
  );
}

function withAlpha(hex, alpha) {
  // #RRGGBB → rgba()
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return hex;
  const [, r, g, b] = m;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
}

export function renderTheoryTopic(ctx, slug) {
  if (isTG) hideMainButton();
  const topic = TOPICS_BY_SLUG[slug];
  if (!topic) { location.hash = "#/theory"; return; }
  const qs = (ctx.data.byTopic[topic.tcsc] || []).slice().sort((a, b) => a.id - b.id);
  const progress = ctx.store.getProgress();

  const node = h("div", { class: "app" },
    topbar(topic.name, {
      back: () => (location.hash = "#/theory"),
      subtitle: `${qs.length} билетов`,
    }),
    qs.length === 0
      ? h("div", { class: "info-note" }, "Билеты этой темы пока не загружены.")
      : h("div", { class: "billet-list" },
        ...qs.map((q, i) => billetRow(q, i, slug, progress.answered[q.id])),
      ),
  );
  mount(node);
}

function billetRow(q, i, slug, rec) {
  const status = rec ? (rec.correct ? "ok" : "fail") : "";
  const numStr = String(i + 1).padStart(2, "0");
  const text = q.question || "Билет №" + q.id;

  let badge = null;
  if (rec?.correct) {
    badge = h("span", { class: "badge ok" }, svgIcon("check", 11, "#fff"));
  } else if (rec && !rec.correct) {
    badge = h("span", { class: "badge fail" }, svgIcon("cross", 10, "#fff"));
  }

  return h("a", {
    class: `billet-row ${status}`,
    href: `#/theory/${slug}/${q.id}`,
  },
    h("div", { class: "num" }, numStr),
    h("div", { class: "q" }, text),
    badge,
  );
}

export function renderTheoryTicket(ctx, slug, id) {
  const topic = TOPICS_BY_SLUG[slug];
  if (!topic) { location.hash = "#/theory"; return; }
  const qs = (ctx.data.byTopic[topic.tcsc] || []).slice().sort((a, b) => a.id - b.id);
  const idx = qs.findIndex(q => q.id === +id);
  if (idx < 0) { location.hash = `#/theory/${slug}`; return; }
  const q = qs[idx];

  renderTicket(ctx, {
    q,
    topic,
    mode: "instant",
    index: idx,
    total: qs.length,
    headerTitle: `Билет ${idx + 1} из ${qs.length}`,
    subtitle: null,
    back: () => (location.hash = `#/theory/${slug}`),
    onAnswer: (correct) => ctx.store.recordAnswer(q.id, correct),
    onContinue: () => {
      const next = qs[idx + 1];
      if (next) location.hash = `#/theory/${slug}/${next.id}`;
      else location.hash = `#/theory/${slug}`;
    },
    nextLabel: qs[idx + 1] ? "Следующий билет" : "Завершить тему",
  });
}
