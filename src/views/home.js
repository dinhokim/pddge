import { h, mount, topbar } from "../render.js";
import { stats, getLearnedSet, getDifficultSet, getExamMistakesCount } from "../store.js";
import { hideMainButton, isTG, closeApp } from "../tg.js";

export function renderHome(ctx) {
  if (isTG) hideMainButton();
  const s = stats(ctx.data.questions);
  const learnedCount = getLearnedSet().size;
  const difficultCount = getDifficultSet().size;
  const mistakesCount = getExamMistakesCount();

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
        h("div", { class: "v" }, String(learnedCount)),
        h("div", { class: "l" }, "пройдено ✅"),
      ),
      h("div", { class: "stat" },
        h("div", { class: "v" }, String(difficultCount)),
        h("div", { class: "l" }, "сложных 🔥"),
      ),
    ),
    h("div", { class: "mode-grid" },
      modeCard("📚", "Теория", "Изучать по темам с разбором ответов", "#/theory"),
      modeCard("🧠", "Практика", "30 случайных вопросов, без лимита ошибок", "#/practice"),
      modeCard("🏁", "Экзамен", "30 вопросов, 30 минут, до 5 ошибок", "#/exam"),
      // Карточка «Работа над ошибками» — отображается всегда; если ошибок нет, кликабельна но покажет «всё чисто»
      modeCard(
        "🛠",
        `Работа над ошибками${mistakesCount ? ` · ${mistakesCount}` : ""}`,
        mistakesCount
          ? "Отработка билетов, в которых ошиблись на экзамене"
          : "Появится после первой ошибки в экзамене",
        "#/mistakes",
        mistakesCount > 0,
      ),
    ),
    h("div", { class: "info-note" },
      "Формат экзамена 2026: 30 вопросов · 30 минут · до 5 ошибок (изменено в мае 2026). ",
      "Доступен на русском в любом сервис-центре Sa-ts.ge."
    ),
    isTG ? h("div", { class: "exit-row" },
      h("button", {
        class: "exit-btn",
        onclick: () => closeApp(),
        title: "Закрыть приложение и вернуться к чату",
      }, "🚪 Выйти из приложения"),
    ) : null,
  );
  mount(node);
}

function modeCard(emoji, title, descr, href, accent = false) {
  return h("a", { class: `mode-card${accent ? " accent" : ""}`, href },
    h("h2", {}, `${emoji} ${title}`),
    h("p", {}, descr),
  );
}
