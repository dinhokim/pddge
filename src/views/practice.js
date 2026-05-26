import { h, mount, topbar, progress } from "../render.js";
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

  renderTicket(ctx, {
    q,
    topic,
    mode: "tap",
    index: session.index,
    total: session.questions.length,
    headerTitle: "",
    subtitle: `Практика · ✓ ${session.correct}`,
    progressColor: "var(--success)",
    back: () => {
      ctx.session.practice = null;
      location.hash = "#/";
    },
    onAnswer: (correct) => {
      ctx.store.recordAnswer(q.id, correct);
      if (correct) session.correct++; else session.errors++;
    },
    onContinue: () => {
      session.index++;
      renderPractice(ctx);
    },
    nextLabel: session.index + 1 >= session.questions.length ? "Завершить" : "Дальше",
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
