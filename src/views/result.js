import { h, mount, topbar, donut } from "../render.js";
import { isTG, setMainButton, hapticNotify } from "../tg.js";

export function renderResult(ctx, opts) {
  const { mode, passed, total, correct, errors, reason, secondsLeft, onRetry, onHome } = opts;
  const isExam = mode === "exam";
  const pct = total ? Math.round((correct / total) * 100) : 0;

  // Haptic
  if (isExam) hapticNotify(passed ? "success" : "error");

  let emoji, title, lead, titleClass;
  if (isExam) {
    if (passed) {
      emoji = "🏆";
      title = "Экзамен сдан!";
      lead = "На реальном экзамене вы получили бы права. Так держать!";
      titleClass = "passed";
    } else {
      emoji = "😔";
      title = "Экзамен не сдан";
      titleClass = "failed";
      if (reason === "errors") lead = "Допущено больше 5 ошибок — лимит исчерпан. Так же работает реальный экзамен.";
      else if (reason === "time") lead = "Время вышло. Постарайтесь отвечать чуть быстрее.";
      else lead = "Слишком много ошибок. Пройдитесь по слабым темам и попробуйте снова.";
    }
  } else {
    const good = pct >= 80;
    emoji = good ? "🎉" : "💪";
    title = good ? "Отличная практика!" : "Тренировка завершена";
    lead = good
      ? "Вы готовы попробовать экзамен. Сделайте ещё несколько подходов для уверенности."
      : "Не торопитесь. Пройдитесь по сложным темам в разделе «Теория» и попробуйте снова.";
  }

  const mm = secondsLeft != null ? Math.floor(secondsLeft / 60) : null;
  const ss = secondsLeft != null ? String(secondsLeft % 60).padStart(2, "0") : null;

  const node = h("div", { class: "app" },
    topbar(isExam ? "Результат экзамена" : "Результат практики", { back: onHome }),
    h("div", { class: "result" },
      h("div", { class: "big-emoji" }, emoji),
      h("div", {},
        h("h2", { class: titleClass }, title),
        h("div", { class: "lead" }, lead),
      ),
      h("div", { class: "result-card" },
        h("div", { class: "donut-big" },
          donut({
            value: correct, max: total,
            color: passed === false ? "var(--primary)" : "var(--success)",
            size: 86, stroke: 8,
          }),
          h("div", { class: "pct" }, `${pct}%`),
        ),
        h("div", { class: "stats" },
          statRow("Верно", correct, "var(--success)"),
          statRow("Ошибок", errors, "var(--danger)"),
          statRow("Всего", total, "var(--subtle)"),
          isExam && mm != null
            ? statRow("Осталось времени", `${mm}:${ss}`, "var(--subtle)")
            : null,
        ),
      ),
      h("div", { class: "result-actions" },
        h("button", {
          class: `btn-duo lg full ${passed === false ? "" : "success"}`,
          onclick: onRetry,
        }, isExam ? (passed ? "Ещё раз" : "Попробовать снова") : "Ещё одна практика"),
        h("button", {
          class: "btn-duo ghost lg full",
          onclick: onHome,
        }, "На главную"),
      ),
    ),
  );
  mount(node);

  if (isTG) {
    setMainButton({
      text: isExam ? (passed ? "Ещё раз" : "Попробовать снова") : "Ещё одна практика",
      enabled: true,
      visible: true,
      onClick: onRetry,
    });
  }
}

function statRow(label, value, color) {
  return h("div", { class: "stat-row" },
    h("span", { class: "label" }, label),
    h("span", { class: "value", style: color ? `color:${color}` : "" }, String(value)),
  );
}
