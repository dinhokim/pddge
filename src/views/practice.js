import { h, mount, topbar } from "../render.js";
import { sampleExam, TOPICS_BY_TCSC } from "../data.js";
import { renderTicket } from "./ticket.js";
import { renderResult } from "./result.js";

const SIZE = 30;

export function renderPractice(ctx) {
  const session = ctx.session.practice ||= newSession(ctx);
  if (session.index >= session.questions.length) {
    renderResult(ctx, {
      mode: "practice",
      total: session.questions.length,
      correct: session.correct,
      errors: session.errors,
      onRetry: () => { ctx.session.practice = null; renderPractice(ctx); },
      onHome: () => { ctx.session.practice = null; location.hash = "#/"; },
    });
    return;
  }
  const q = session.questions[session.index];
  const topic = TOPICS_BY_TCSC[q.topic];
  const bar = sessionBar(session);

  renderTicket(ctx, {
    q,
    topicName: topic?.name,
    revealMode: "click",
    headerTitle: `Практика · ${session.index + 1}/${session.questions.length}`,
    back: () => { ctx.session.practice = null; location.hash = "#/"; },
    sessionBar: bar,
    onAnswer: (correct) => {
      ctx.store.recordAnswer(q.id, correct);
      if (correct) session.correct++; else session.errors++;
    },
    onContinue: () => {
      session.index++;
      renderPractice(ctx);
    },
  });
}

function newSession(ctx) {
  return {
    questions: sampleExam(ctx.data.questions, SIZE),
    index: 0,
    correct: 0,
    errors: 0,
    startedAt: Date.now(),
  };
}

function sessionBar(s) {
  const pct = Math.round((s.index / s.questions.length) * 100);
  return h("div", { class: "session-bar" },
    h("div", { class: "progress" }, h("div", { style: `width:${pct}%` })),
    h("div", { class: "counter" }, `${s.index}/${s.questions.length}`),
    h("div", { class: "errors" }, `✓ ${s.correct} · ✗ ${s.errors}`),
  );
}
