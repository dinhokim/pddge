import { h, mount, topbar } from "../render.js";
import { isTG, setMainButton, hapticNotify } from "../tg.js";

export function renderResult(ctx, opts) {
  const { mode, passed, total, correct, errors, reason, onRetry, onHome } = opts;
  // Haptic уведомление о результате
  if (mode === "exam") hapticNotify(passed ? "success" : "error");
  // MainButton — Ещё раз
  if (isTG) {
    setMainButton({
      text: "Ещё раз",
      enabled: true,
      visible: true,
      onClick: onRetry,
    });
  }
  const isExam = mode === "exam";
  const cls = isExam ? (passed ? "result pass" : "result fail") : "result";
  const headline = isExam
    ? (passed ? "Экзамен сдан" : "Экзамен не сдан")
    : "Тренировка завершена";

  let reasonText = "";
  if (isExam && !passed) {
    if (reason === "errors") reasonText = "Превышен лимит ошибок (более 5).";
    else if (reason === "timeout") reasonText = "Истекло время.";
    else reasonText = "Недостаточно правильных ответов.";
  }

  const node = h("div", { class: "app" },
    topbar(isExam ? "Результат экзамена" : "Результат практики",
           { back: onHome }),
    h("div", { class: cls },
      h("h2", {}, headline),
      h("div", { class: "big" }, `${correct} / ${total}`),
      h("p", {}, isExam
        ? `Ошибок: ${errors}/5. ${reasonText}`
        : `Правильно ${correct} из ${total}, ошибок ${errors}.`,
      ),
      h("div", { class: "actions" },
        h("button", { class: "primary", onclick: onRetry }, "Ещё раз"),
        h("button", { onclick: onHome }, "На главную"),
      ),
    ),
  );
  mount(node);
}
