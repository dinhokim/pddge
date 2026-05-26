// Универсальный рендер билета. Используется во всех трёх режимах.
//   mode: "instant" — правильный ответ и все объяснения видны сразу (Теория)
//         "tap"     — пользователь выбирает, потом видит результат (Практика/Экзамен)
//   examReveal: true — в "tap" объяснения скрыты по умолчанию, открываются кнопкой
import { h, mount, topbar, fmt, progress, svgIcon } from "../render.js";
import { isTG, setMainButton, hapticNotify, hideMainButton } from "../tg.js";

const LETTERS = ["А", "Б", "В", "Г", "Д"];

export function renderTicket(ctx, opts) {
  const {
    q,
    topic,
    mode = "instant",
    index,
    total,
    headerTitle,
    subtitle,
    back,
    onAnswer,
    onContinue,
    rightSlot,
    progressColor,
    examReveal = false,
    nextLabel,
  } = opts;

  const instant = mode === "instant";
  let answered = instant;
  let picked = instant ? q.correct : null;
  let showExpl = instant || !examReveal;

  function render() {
    const correctIdx = q.correct;
    const correctPicked = picked === correctIdx;

    // Header (sticky) — заголовок, прогресс, текст вопроса + картинка
    const header = h("div", { class: "q-sticky-head", style: "position:sticky;top:0;z-index:10;background:var(--bg);" },
      topbar(headerTitle || `Вопрос ${index + 1} из ${total}`, {
        back,
        subtitle,
        right: rightSlot || null,
      }),
      total != null ? h("div", { class: "q-progress-wrap" },
        progress({ value: index + 1, max: total, color: progressColor || "var(--success)", height: 10 }),
      ) : null,
      h("div", { class: "q-header" },
        h("div", { class: "q-text" }, q.question),
        q.image
          ? h("div", { class: "q-image-wrap" },
            h("img", { class: "q-image", src: `public/images/${q.image}`, alt: "" }),
          )
          : null,
      ),
    );

    // Options
    const opts = q.answers.map((text, i) => {
      const isCorrect = i === correctIdx;
      let state = "idle";
      if (answered) {
        if (isCorrect) state = "correct";
        else if (picked === i) state = "wrong";
        else state = "dim";
      } else if (picked === i) state = "selected";

      const bullet = (state === "correct")
        ? svgIcon("check", 14, "#fff")
        : (state === "wrong")
          ? svgIcon("cross", 12, "#fff")
          : LETTERS[i];

      const onClick = () => {
        if (answered) return;
        picked = i;
        answered = true;
        showExpl = !examReveal;
        if (isCorrect) hapticNotify("success");
        else hapticNotify("error");
        if (onAnswer) onAnswer(isCorrect);
        render();
      };

      // В theory mode инлайн-объяснение под каждым вариантом
      let inline = null;
      if (instant && q.enriched) {
        const e = q.enriched;
        const explText = isCorrect ? e.correct : e.wrong?.[i];
        if (explText) {
          inline = h("div", {
            class: `inline-explain ${isCorrect ? "correct" : ""}`,
            html: fmt(explText),
          });
        }
      }

      return h("div", { class: "option-wrap" },
        h("button", {
          class: `option ${state}`,
          onclick: onClick,
          disabled: answered && !instant,
        },
          h("div", { class: "bullet" }, bullet),
          h("div", { class: "label" }, text),
        ),
        inline,
      );
    });

    const optsBlock = h("div", { class: `options ${instant ? "instant" : ""}` }, ...opts);

    // Feedback panel (tap mode after answer)
    const feedback = (!instant && answered) ? feedbackPanel({
      q, picked, correctPicked, showExpl, examReveal,
      onToggle: () => { showExpl = !showExpl; render(); },
    }) : null;

    // "Why" — в theory mode под опциями
    const why = (instant && q.enriched?.why)
      ? h("div", { class: "why" },
        h("span", { class: "emoji" }, "💡"),
        h("div", {},
          h("div", { class: "eyebrow" }, "Почему так"),
          h("div", { class: "text", html: fmt(q.enriched.why) }),
        ),
      )
      : null;

    // Raw explanation fallback (без human-обогащения)
    const raw = (answered && !q.enriched && q.explanationRaw)
      ? h("details", { class: "raw" },
        h("summary", {}, "Показать оригинальное пояснение"),
        h("div", { class: "raw-body" }, q.explanationRaw),
      )
      : null;

    // Sticky footer
    const isLast = total != null && index + 1 >= total;
    const btnLabel = !instant && !answered ? "Выберите ответ"
      : (nextLabel || (isLast ? "Завершить" : "Дальше"));
    const btnVariant = !instant && !answered
      ? "ghost"
      : (instant ? "" : (correctPicked ? "success" : ""));

    const footer = onContinue ? h("div", { class: "sticky-foot" },
      h("button", {
        class: `btn-duo full lg ${btnVariant}`,
        disabled: !instant && !answered,
        onclick: () => onContinue(picked),
      }, btnLabel),
    ) : null;

    const root = h("div", { class: "app" },
      header,
      optsBlock,
      feedback,
      why,
      raw,
      footer,
    );
    mount(root);

    // MainButton в TG вместо экранной кнопки внизу
    if (isTG && onContinue) {
      setMainButton({
        text: btnLabel,
        enabled: instant || answered,
        visible: true,
        onClick: () => onContinue(picked),
      });
    } else if (isTG) {
      hideMainButton();
    }
  }

  render();
}

function feedbackPanel({ q, picked, correctPicked, showExpl, examReveal, onToggle }) {
  const verdictClass = correctPicked ? "correct" : "wrong";
  const head = correctPicked ? "Правильно!" : "Неправильно";
  const sub = !correctPicked ? `Правильный ответ: ${LETTERS[q.correct]}` : null;
  const verdictIcon = correctPicked ? svgIcon("check", 14, "#fff") : svgIcon("cross", 12, "#fff");

  return h("div", { class: `feedback ${verdictClass}` },
    h("div", { class: "verdict" },
      h("div", { class: "dot" }, verdictIcon),
      h("div", { class: "verdict-text" },
        h("div", { class: "verdict-head" }, head),
        sub ? h("div", { class: "verdict-sub" }, sub) : null,
      ),
      examReveal ? h("button", {
        class: "btn-duo sm ghost",
        onclick: onToggle,
      }, showExpl ? "Скрыть" : "Разбор") : null,
    ),
    showExpl ? explanationsList(q, picked) : null,
  );
}

function explanationsList(q, picked) {
  const e = q.enriched;
  return h("div", { class: "expl-list" },
    ...q.answers.map((opt, i) => {
      const isCorrect = i === q.correct;
      const isPicked = i === picked;
      const explText = e
        ? (isCorrect ? e.correct : e.wrong?.[i])
        : null;
      return h("div", { class: `expl-row ${isCorrect ? "correct" : ""}` },
        h("div", { class: "bullet" },
          isCorrect ? svgIcon("check", 11, "#fff") : LETTERS[i],
        ),
        h("div", { class: "body" },
          (isPicked && !isCorrect)
            ? h("div", { class: "your-choice" }, "Ваш выбор")
            : null,
          h("div", { class: "text", html: fmt(explText || opt) }),
        ),
      );
    }),
    e?.why ? h("div", {
      class: "why",
      style: "margin:8px 0 0;background:var(--why-bg);border-color:var(--why-border)",
    },
      h("span", { class: "emoji" }, "💡"),
      h("div", {},
        h("div", { class: "eyebrow" }, "Почему так"),
        h("div", { class: "text", html: fmt(e.why) }),
      ),
    ) : null,
  );
}
