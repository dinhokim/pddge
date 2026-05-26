import { h, mount, donut, pill, progress, svgIcon } from "../render.js";
import { stats } from "../store.js";
import { TOPICS } from "../data.js";
import { hideMainButton, isTG } from "../tg.js";

export function renderHome(ctx) {
  if (isTG) hideMainButton();
  const s = stats(ctx.data.questions);
  const total = s.total;
  const answered = s.learnedOk + s.learnedFail;
  const correctPct = answered ? Math.round((s.learnedOk / answered) * 100) : 0;
  const wrongPct = answered ? Math.round((s.learnedFail / answered) * 100) : 0;

  const node = h("div", { class: "app" },
    // brand strip
    h("div", { class: "home-brand" },
      h("div", { style: "display:flex;align-items:center;gap:10px" },
        h("div", { class: "ge" }, "GE"),
        h("div", { class: "title-block" },
          h("div", { class: "name" }, "ПДД Грузия"),
          h("div", { class: "tag" }, "Подготовка к экзамену"),
        ),
      ),
      h("div", { class: "streak" },
        h("span", { style: "font-size:14px" }, "🔥"),
        h("span", {}, String(s.examPassed || 0)),
      ),
    ),

    // hero progress card
    heroProgress({ answered, total, correctPct, wrongPct }),

    // section label
    h("div", { class: "modes" },
      h("div", { class: "section-label" }, "Режимы подготовки"),
      modeTile({
        kind: "theory",
        emoji: "📚",
        title: "Теория",
        sub: "Темы и билеты с разбором",
        meta: `${TOPICS.length} ТЕМ · ${total} ВОПРОСОВ`,
        href: "#/theory",
      }),
      modeTile({
        kind: "practice",
        emoji: "🎯",
        title: "Практика",
        sub: "30 случайных вопросов",
        meta: "БЕЗ ОГРАНИЧЕНИЙ — УЧИМСЯ",
        href: "#/practice",
      }),
      modeTile({
        kind: "exam",
        emoji: "🏁",
        title: "Экзамен",
        sub: "30 вопросов · 5 ошибок · 30 минут",
        meta: "КАК В ГАИ",
        href: "#/exam",
      }),
    ),
  );
  mount(node);
}

function heroProgress({ answered, total, correctPct, wrongPct }) {
  const headText = answered === 0 ? "Начнём подготовку" : `Точность ответов · ${correctPct}%`;
  return h("div", { class: "hero-progress" },
    h("div", { class: "donut-wrap" },
      donut({ value: answered, max: total, color: "var(--primary)", size: 64, stroke: 6 }),
      h("div", { class: "donut-text" },
        String(answered),
        h("span", { class: "of" }, `/${total}`),
      ),
    ),
    h("div", { class: "info" },
      h("div", { class: "eyebrow" }, "Ваш прогресс"),
      h("div", { class: "head" }, headText),
      h("div", { class: "pills" },
        pill(`✓ ${correctPct}% верно`, "success"),
        pill(`${wrongPct}% ошибок`, "danger"),
      ),
    ),
  );
}

function modeTile({ kind, emoji, title, sub, meta, href }) {
  return h("a", { class: `mode-tile ${kind}`, href },
    h("div", { class: "icon" }, emoji),
    h("div", { class: "text" },
      h("div", { class: "head" }, title),
      h("div", { class: "sub" }, sub),
      h("div", { class: "meta" }, meta),
    ),
    svgIcon("chevron-right", 18, "#fff"),
  );
}
