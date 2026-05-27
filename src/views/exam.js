import { h, mount, topbar } from "../render.js";
import { sampleExam, TOPICS_BY_TCSC } from "../data.js";
import { renderTicket } from "./ticket.js";
import { renderResult } from "./result.js";
import { addExamMistake, removeExamMistake } from "../store.js";

const SIZE = 30;
const MAX_ERRORS = 5;       // 2026 reform: до 5 ошибок включительно
const DURATION_SEC = 30 * 60;

export function renderExam(ctx) {
  let session = ctx.session.exam;
  if (!session) {
    renderExamStart(ctx);
    return;
  }

  // финал по таймеру или превышению ошибок
  const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
  if (elapsed >= DURATION_SEC) {
    finishExam(ctx, session, "timeout");
    return;
  }
  if (session.errors > MAX_ERRORS) {
    finishExam(ctx, session, "errors");
    return;
  }
  if (session.index >= session.questions.length) {
    finishExam(ctx, session, "complete");
    return;
  }

  const q = session.questions[session.index];
  const topic = TOPICS_BY_TCSC[q.topic];
  const bar = sessionBar(session, DURATION_SEC - elapsed);

  renderTicket(ctx, {
    q,
    topicName: topic?.name,
    revealMode: "click",
    headerTitle: `Экзамен · ${session.index + 1}/${session.questions.length}`,
    back: () => {
      if (!confirm("Прервать экзамен? Прогресс будет утерян.")) return;
      ctx.session.exam = null;
      stopTimer(ctx);
      location.hash = "#/";
    },
    sessionBar: bar,
    onAnswer: (correct) => {
      ctx.store.recordAnswer(q.id, correct);
      if (correct) {
        session.correct++;
        // если этот билет ранее был ошибкой — снимаем
        removeExamMistake(q.id);
      } else {
        session.errors++;
        addExamMistake(q.id);
      }
    },
    onContinue: () => {
      session.index++;
      renderExam(ctx);
    },
    showWhy: false,
  });

  ensureTimer(ctx);
}

function renderExamStart(ctx) {
  const node = h("div", { class: "app" },
    topbar("Экзамен", { back: () => (location.hash = "#/") }),
    h("div", { class: "ticket" },
      h("h2", {}, "Имитация теоретического экзамена"),
      h("p", {}, "30 случайных вопросов из банка категории B."),
      h("ul", {},
        h("li", {}, "⏱ 30 минут на все вопросы"),
        h("li", {}, "✗ До 5 ошибок включительно — экзамен сдан"),
        h("li", {}, "При 6-й ошибке экзамен прекращается"),
        h("li", {}, "Пояснения показываются после каждого ответа"),
      ),
      h("div", { class: "ticket-nav" },
        h("button", {
          class: "primary",
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
      ),
    ),
  );
  mount(node);
}

function finishExam(ctx, session, reason) {
  const passed = session.errors <= MAX_ERRORS &&
                 session.index >= session.questions.length;
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
    onRetry: () => { location.hash = "#/exam"; },
    onHome: () => { location.hash = "#/"; },
  });
}

function ensureTimer(ctx) {
  if (ctx.session.examTimerId) return;
  ctx.session.examTimerId = setInterval(() => {
    if (!ctx.session.exam) { stopTimer(ctx); return; }
    if (location.hash.startsWith("#/exam")) {
      // обновим только bar
      const session = ctx.session.exam;
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      if (elapsed >= DURATION_SEC) { renderExam(ctx); return; }
      const bar = document.querySelector(".session-bar");
      if (bar) bar.replaceWith(sessionBar(session, DURATION_SEC - elapsed));
    }
  }, 1000);
}

function stopTimer(ctx) {
  if (ctx.session.examTimerId) {
    clearInterval(ctx.session.examTimerId);
    ctx.session.examTimerId = null;
  }
}

function sessionBar(s, secLeft) {
  const pct = Math.round((s.index / s.questions.length) * 100);
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");
  const dangerErr = s.errors > MAX_ERRORS - 2;
  const dangerTimer = secLeft <= 60;
  return h("div", { class: "session-bar" },
    h("div", { class: "progress" }, h("div", { style: `width:${pct}%` })),
    h("div", { class: "counter" }, `${s.index}/${s.questions.length}`),
    h("div", { class: `errors${dangerErr ? " danger" : ""}` }, `✗ ${s.errors}/${MAX_ERRORS}`),
    h("div", { class: `timer${dangerTimer ? " danger" : ""}` }, `${mm}:${ss}`),
  );
}
