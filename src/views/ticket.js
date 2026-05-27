// Универсальный рендер одного билета. Используется во всех трёх режимах.
//   revealMode: "always"  — режим Теории: сразу показывается правильный ответ
//                            и пояснение, остальные варианты СКРЫТЫ
//                "click"  — режим Практики/Экзамена: 4 варианта, ответ выбирается кликом
import { h, mount, topbar, fmt } from "../render.js";
import { isTG, setMainButton, hapticNotify, hapticImpact } from "../tg.js";
import { isDifficult, toggleDifficult, isLearned, toggleLearned } from "../store.js";

export function renderTicket(ctx, opts) {
  const {
    q,
    topicName,
    revealMode = "always",
    headerTitle,
    back,
    onAnswer,
    nav,           // { prev, next }
    sessionBar,    // optional node
    onContinue,    // callback for practice/exam "Далее"
    showWhy = true,
    allowAttr = revealMode === "always", // ✅ и 🔥 доступны только в теории
  } = opts;

  const isTheory = revealMode === "always";
  let answered = isTheory;
  let picked = null;
  let firstRender = true;

  function render() {
    const correctIdx = q.correct;
    const e = q.enriched || null;
    const isDiff = isDifficult(q.id);
    const isLearn = isLearned(q.id);

    // ── Блок ответа ──────────────────────────────────────
    let answersBlock;
    if (isTheory) {
      // Только правильный ответ
      const cls = "answer correct";
      const exp = e?.correct
        ? h("div", { class: "explain", html: fmt(e.correct) })
        : null;
      answersBlock = h("div", { class: "answers" },
        h("div", { class: cls },
          h("div", { class: "num" }, "✓"),
          h("div", { class: "text" }, q.answers[correctIdx]),
          exp,
        ),
      );
    } else {
      answersBlock = h("div", { class: "answers" },
        ...q.answers.map((text, i) => {
          const isCorrect = i === correctIdx;
          let cls = "answer";
          if (answered) {
            if (isCorrect) cls += " correct";
            else if (picked === i) cls += " wrong";
            else cls += " neutral";
            if (picked === i) cls += " picked";
          }
          const onClick = () => {
            if (answered) return;
            picked = i;
            answered = true;
            if (isCorrect) hapticNotify("success");
            else hapticNotify("error");
            if (onAnswer) onAnswer(isCorrect);
            render();
          };
          const exp = answered && e
            ? (isCorrect
                ? (e.correct ? h("div", { class: "explain", html: fmt(e.correct) }) : null)
                : (e.wrong && e.wrong[i] != null
                    ? h("div", { class: "explain", html: fmt(e.wrong[i]) })
                    : null))
            : null;
          return h("div", { class: cls, onclick: onClick },
            h("div", { class: "num" }, String(i + 1)),
            h("div", { class: "text" }, text),
            exp,
          );
        }),
      );
    }

    const why = (answered && showWhy && e && e.why)
      ? h("div", { class: "why-box" },
          h("h4", {}, "Почему правило работает именно так"),
          h("p", { html: fmt(e.why) }),
        )
      : null;

    const raw = (answered && (!e) && q.explanationRaw)
      ? h("details", { class: "raw" },
          h("summary", {}, "Показать оригинальное пояснение (на грузинском)"),
          h("div", { class: "raw-body" }, q.explanationRaw),
        )
      : null;

    const noQualityNote = (answered && !e)
      ? h("div", { class: "info-note" },
          "Человеческое пояснение для этого билета ещё не написано — пока показан правильный ответ. Подробный разбор появится в обновлении."
        )
      : null;

    // ── Sticky-блок: топбар + (sessionBar) + meta + вопрос + картинка ─
    const meta = h("div", { class: "ticket-meta" },
      h("div", { class: "pill" }, topicName || "—"),
      h("div", {}, `#${q.id}`),
    );

    const ticketHead = h("div", { class: "ticket-head" },
      meta,
      h("div", { class: "question" }, q.question),
      q.image ? h("img", {
        class: "ticket-image",
        src: `public/images/${q.image}`,
        alt: "Иллюстрация к билету",
      }) : null,
    );

    const stickyHead = h("div", { class: "sticky-head" },
      topbar(headerTitle || "Билет", { back }),
      sessionBar || null,
      ticketHead,
    );

    // ── Кнопки «Понял» / «Нужно повторить» (внизу, над nav) ──────
    let attrRow = null;
    if (allowAttr) {
      const learnBtn = h("button", {
        class: `attr-btn learn-btn${isLearn ? " active" : ""}`,
        "aria-pressed": isLearn ? "true" : "false",
        onclick: (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          const now = toggleLearned(q.id);
          learnBtn.classList.toggle("active", now);
          learnBtn.setAttribute("aria-pressed", now ? "true" : "false");
          hapticImpact("light");
        },
      },
        h("span", { class: "emo" }, "✅"),
        h("span", {}, "Понял"),
      );

      const fireBtn = h("button", {
        class: `attr-btn fire-btn${isDiff ? " active" : ""}`,
        "aria-pressed": isDiff ? "true" : "false",
        onclick: (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          const now = toggleDifficult(q.id);
          fireBtn.classList.toggle("active", now);
          fireBtn.setAttribute("aria-pressed", now ? "true" : "false");
          hapticImpact("light");
        },
      },
        h("span", { class: "emo" }, "🔥"),
        h("span", {}, "Нужно повторить"),
      );

      attrRow = h("div", { class: "attr-row" }, learnBtn, fireBtn);
    }

    // ── Низ страницы (скроллится под sticky-head) ───────────
    const body = h("div", { class: "ticket-body" },
      answersBlock,
      why,
      noQualityNote,
      raw,
    );

    // ── Прибитая к низу навигация / кнопка Далее ────────────
    const footer = buildFooter();

    const root = h("div", { class: "app" },
      stickyHead,
      body,
      attrRow,
      footer,
    );
    mount(root, { preserveScroll: !firstRender });
    firstRender = false;

    if (isTG && onContinue) {
      setMainButton({
        text: "Далее",
        enabled: !!answered,
        visible: true,
        onClick: () => onContinue(picked),
      });
    } else if (isTG) {
      setMainButton({ visible: false });
    }
  }

  function buildFooter() {
    if (onContinue) {
      if (isTG) return null; // в TG MainButton рисует кнопку «Далее»
      return h("div", { class: "sticky-foot" },
        h("div", { class: "ticket-nav" },
          h("button", {
            class: "primary",
            disabled: !answered,
            onclick: () => onContinue(picked),
          }, "Далее →"),
        ),
      );
    }
    if (nav) {
      return h("div", { class: "sticky-foot" },
        h("div", { class: "ticket-nav" },
          h("button", { disabled: !nav.prev, onclick: nav.prev || (() => {}) }, "← Пред."),
          h("button", { disabled: !nav.next, onclick: nav.next || (() => {}) }, "След. →"),
        ),
      );
    }
    return null;
  }

  render();
}
