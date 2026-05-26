import { h, mount, topbar, hearts } from "../render.js";
import { sampleExam, TOPICS_BY_TCSC } from "../data.js";
import { renderTicket } from "./ticket.js";
import { renderResult } from "./result.js";
import { showConfirm, hideMainButton } from "../tg.js";

const SIZE = 30;
const MAX_ERRORS = 5;
const DURATION_SEC = 30 * 60;

export function renderExam(ctx) {
  let session = ctx.session.exam;
  if (!session) {
    renderExamStart(ctx);
    return;
  }
  const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
  if (elapsed >= DURATION_SEC) return finishExam(ctx, session, "time");
  if (session.errors > MAX_ERRORS) return finishExam(ctx, session, "errors");
  if (session.index >= session.questions.length) return finishExam(ctx, session, null);

  const q = session.questions[session.index];
  const topic = TOPICS_BY_TCSC[q.topic];
  const secLeft = DURATION_SEC - elapsed;
  const remaining = Math.max(0, MAX_ERRORS - session.errors);

  renderTicket(ctx, {
    q,
    topic,
    mode: "tap",
    examReveal: true,
    index: session.index,
    total: session.questions.length,
    headerTitle: "",
    subtitle: "Экзамен",
    progressColor: "var(--primary)",
    rightSlot: timerBadge(secLeft),
    back: async () => {
      const ok = await showConfirm("Прервать экзамен? Прогресс будет утерян.");
      if (!ok) return;
      ctx.session.exam = null;
      stopTimer(ctx);
      location.hash = "#/";
    },
    onAnswer: (correct) => {
      ctx.store.recordAnswer(q.id, correct);
      if (correct) session.correct++; else session.errors++;
    },
    onContinue: () => {
      session.index++;
      renderExam(ctx);
    },
    nextLabel: session.index + 1 >= session.questions.length ? "Завершить" : "Дальше",
  });

  // под progress'ом добавим экзаменационный баннер (сердечки)
  injectExamBanner(remaining, secLeft);
  ensureTimer(ctx);
}

function injectExamBanner(remaining, secLeft) {
  const sticky = document.querySelector(".q-sticky-head");
  if (!sticky) return;
  const old = sticky.querySelector(".exam-banner");
  if (old) old.remove();
  const banner = h("div", {
    class: "exam-banner",
    style: "display:flex;align-items:center;justify-content:space-between;padding:0 16px 10px",
  },
    hearts({ remaining, total: MAX_ERRORS }),
  );
  // вставить ПОСЛЕ q-progress-wrap
  const prog = sticky.querySelector(".q-progress-wrap");
  if (prog && prog.nextSibling) sticky.insertBefore(banner, prog.nextSibling);
  else sticky.appendChild(banner);
}

function timerBadge(secLeft) {
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");
  const danger = secLeft < 60;
  return h("div", {
    class: `badge-counter ${danger ? "danger" : ""}`,
    style: "white-space:nowrap",
  }, `${mm}:${ss}`);
}

function renderExamStart(ctx) {
  hideMainButton();
  const node = h("div", { class: "app" },
    topbar("Экзамен", {
      back: () => (location.hash = "#/"),
      subtitle: "Как в ГАИ",
    }),
    h("div", { class: "result", style: "padding-top:16px" },
      h("div", { class: "big-emoji" }, "🏁"),
      h("div", {},
        h("h2", {}, "Готовы к экзамену?"),
        h("div", { class: "lead" },
          "30 случайных вопросов из банка категории B. До 5 ошибок включительно — экзамен сдан."
        ),
      ),
      h("div", { class: "result-card col" },
        h("div", { class: "stat-row" },
          h("span", { class: "label" }, "⏱ Время"),
          h("span", { class: "value" }, "30 минут"),
        ),
        h("div", { class: "stat-row" },
          h("span", { class: "label" }, "✗ Лимит ошибок"),
          h("span", { class: "value" }, "5 (реформа мая 2026)"),
        ),
        h("div", { class: "stat-row" },
          h("span", { class: "label" }, "❤️ Прерывание"),
          h("span", { class: "value" }, "При 6-й ошибке"),
        ),
      ),
      h("div", { class: "result-actions" },
        h("button", {
          class: "btn-duo lg full",
          onclick: () => {
            ctx.session.exam = {
              questions: sampleExam(ctx.data.questions, SIZE),
              index: 0,
              correct: 0,
              errors: 0,
              startedAt: Date.now(),
            };
            renderExam(ctx);
          },
        }, "Начать экзамен"),
        h("button", {
          class: "btn-duo ghost lg full",
          onclick: () => (location.hash = "#/"),
        }, "Назад"),
      ),
    ),
  );
  mount(node);
}

function finishExam(ctx, session, reason) {
  const passed = !reason && session.errors <= MAX_ERRORS && session.index >= session.questions.length;
  ctx.store.recordExam({
    total: session.questions.length,
    correct: session.correct,
    errors: session.errors,
    passed,
    reason,
    durationSec: Math.floor((Date.now() - session.startedAt) / 1000),
  });
  ctx.session.exam = null;
  stopTimer(ctx);
  renderResult(ctx, {
    mode: "exam",
    passed,
    total: session.questions.length,
    correct: session.correct,
    errors: session.errors,
    reason,
    secondsLeft: Math.max(0, DURATION_SEC - Math.floor((Date.now() - session.startedAt) / 1000)),
    onRetry: () => (location.hash = "#/exam"),
    onHome: () => (location.hash = "#/"),
  });
}

function ensureTimer(ctx) {
  if (ctx.session.examTimerId) return;
  ctx.session.examTimerId = setInterval(() => {
    if (!ctx.session.exam) { stopTimer(ctx); return; }
    if (!location.hash.startsWith("#/exam")) return;
    const session = ctx.session.exam;
    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
    if (elapsed >= DURATION_SEC) { renderExam(ctx); return; }
    // обновим только бейдж таймера и сердечки
    const remaining = Math.max(0, MAX_ERRORS - session.errors);
    const secLeft = DURATION_SEC - elapsed;
    const bar = document.querySelector(".appbar .right");
    if (bar) bar.replaceChildren(timerBadge(secLeft));
    injectExamBanner(remaining, secLeft);
  }, 1000);
}

function stopTimer(ctx) {
  if (ctx.session.examTimerId) {
    clearInterval(ctx.session.examTimerId);
    ctx.session.examTimerId = null;
  }
}
