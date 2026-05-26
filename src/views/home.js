import { h, mount, topbar } from "../render.js";
import { stats } from "../store.js";
import { hideMainButton, isTG } from "../tg.js";

export function renderHome(ctx) {
  if (isTG) hideMainButton();
  const s = stats(ctx.data.questions);
  const node = h("div", { class: "app" },
    h("div", { class: "hero" },
      h("h1", {}, "ПДД Грузия"),
      h("p", {}, "Подготовка к теоретическому экзамену · кат. B · русский"),
    ),
    h("div", { class: "stats-strip" },
      h("div", { class: "stat" },
        h("div", { class: "v" }, String(s.total)),
        h("div", { class: "l" }, "вопросов в банке"),
      ),
      h("div", { class: "stat" },
        h("div", { class: "v" }, String(s.learnedOk)),
        h("div", { class: "l" }, "выучено"),
      ),
      h("div", { class: "stat" },
        h("div", { class: "v" }, `${s.examPassed}/${s.examTotal}`),
        h("div", { class: "l" }, "экзаменов сдано"),
      ),
    ),
    h("div", { class: "mode-grid" },
      modeCard("📚", "Теория", "Изучать по темам с разбором ответов", "#/theory"),
      modeCard("🧠", "Практика", "30 случайных вопросов, без лимита ошибок", "#/practice"),
      modeCard("🏁", "Экзамен", "30 вопросов, 30 минут, до 5 ошибок", "#/exam"),
    ),
    h("div", { class: "info-note" },
      "Формат экзамена 2026: 30 вопросов · 30 минут · до 5 ошибок (изменено в мае 2026). ",
      "Доступен на русском в любом сервис-центре Sa-ts.ge."
    ),
  );
  mount(node);
}

function modeCard(emoji, title, descr, href) {
  return h("a", { class: "mode-card", href },
    h("h2", {}, `${emoji} ${title}`),
    h("p", {}, descr),
  );
}
