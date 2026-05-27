// Режим «Работа над ошибками».
// Берёт пул билетов из store.examMistakes — это id, в которых пользователь
// ошибся в режиме «Экзамен». При правильном ответе билет удаляется из пула.
import { h, mount, topbar } from "../render.js";
import { TOPICS_BY_TCSC, shuffle } from "../data.js";
import { renderTicket } from "./ticket.js";
import {
  getExamMistakes, removeExamMistake, addExamMistake,
} from "../store.js";

export function renderMistakes(ctx) {
  // Пересоздаём сессию: подтягиваем актуальные id из store
  let session = ctx.session.mistakes;
  if (!session) {
    session = ctx.session.mistakes = newSession(ctx);
  }

  // Если пул пуст — показать «всё чисто»
  if (!session.queue.length) {
    renderEmpty(ctx);
    return;
  }

  // Если индекс вышел за конец — пересобираем (вдруг что-то ещё осталось из ошибок текущей сессии)
  if (session.index >= session.queue.length) {
    ctx.session.mistakes = newSession(ctx);
    renderMistakes(ctx);
    return;
  }

  const q = session.queue[session.index];
  const topic = TOPICS_BY_TCSC[q.topic];

  renderTicket(ctx, {
    q,
    topicName: topic?.name,
    revealMode: "click",
    headerTitle: `Ошибка ${session.index + 1} из ${session.initialCount}`,
    back: () => {
      ctx.session.mistakes = null;
      location.hash = "#/";
    },
    sessionBar: sessionBar(session),
    onAnswer: (correct) => {
      ctx.store.recordAnswer(q.id, correct);
      if (correct) {
        session.correct++;
        removeExamMistake(q.id);  // больше не ошибка
      } else {
        session.errors++;
        addExamMistake(q.id);     // и так уже там, но на всякий
      }
    },
    onContinue: () => {
      session.index++;
      renderMistakes(ctx);
    },
    showWhy: true,
  });
}

function newSession(ctx) {
  const ids = getExamMistakes();
  const byId = ctx.data.byId;
  const queue = ids
    .map((id) => byId[id])
    .filter(Boolean);
  return {
    queue: shuffle(queue),
    index: 0,
    correct: 0,
    errors: 0,
    initialCount: queue.length,
    startedAt: Date.now(),
  };
}

function sessionBar(s) {
  const pct = s.queue.length
    ? Math.round((s.index / s.queue.length) * 100)
    : 0;
  return h("div", { class: "session-bar" },
    h("div", { class: "progress" }, h("div", { style: `width:${pct}%` })),
    h("div", { class: "counter" }, `${s.index}/${s.queue.length}`),
    h("div", { class: "errors" }, `✓ ${s.correct} · ✗ ${s.errors}`),
  );
}

function renderEmpty(ctx) {
  ctx.session.mistakes = null;
  const node = h("div", { class: "app" },
    topbar("Работа над ошибками", { back: () => (location.hash = "#/") }),
    h("div", { class: "result", style: "padding: 32px 16px" },
      h("h2", {}, "🎉 Ошибок нет"),
      h("p", {},
        "В режиме «Экзамен» вы пока не ошибались — или уже отработали все ошибки. ",
        "Пройдите экзамен, и сюда автоматически попадут билеты, в которых сделаны ошибки.",
      ),
      h("div", { class: "actions" },
        h("button", { class: "primary", onclick: () => (location.hash = "#/exam") }, "К экзамену"),
        h("button", { onclick: () => (location.hash = "#/") }, "На главную"),
      ),
    ),
  );
  mount(node);
}
