// Универсальный рендер одного билета. Используется во всех трёх режимах.
//   revealMode: "always"  — сразу показать правильный ответ и все пояснения
//                "click"  — открыть только после клика по варианту
//                "after"  — открыть после клика, но без подсветки остальных пояснений
import { h, mount, topbar, fmt } from "../render.js";
import { isTG, setMainButton, hapticNotify, hapticImpact } from "../tg.js";

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
  } = opts;

  let answered = revealMode === "always";
  let picked = null;
  let outerScroll = null;

  function render() {
    const correctIdx = q.correct;
    const e = q.enriched || null;

    const answers = h("div", { class: "answers" },
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
          if (answered && revealMode !== "always") return;
          if (!answered) {
            picked = i;
            answered = true;
            if (isCorrect) hapticNotify("success");
            else hapticNotify("error");
            if (onAnswer) onAnswer(isCorrect);
            render();
          }
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

    const ticketBlock = h("div", { class: "ticket" },
      h("div", { class: "ticket-meta" },
        h("div", { class: "pill" }, topicName || "—"),
        h("div", {}, `#${q.id}`),
      ),
      h("div", { class: "question" }, q.question),
      q.image ? h("img", {
        class: "ticket-image",
        src: `public/images/${q.image}`,
        alt: "Иллюстрация к билету",
      }) : null,
      answers,
      why,
      noQualityNote,
      raw,
      buildNav(),
    );

    const root = h("div", { class: "app" },
      topbar(headerTitle || "Билет", { back }),
      sessionBar || null,
      ticketBlock,
    );
    mount(root);
    // В TG используем MainButton; на вебе — обычная кнопка внутри ticket-nav
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
    if (outerScroll != null) window.scrollTo({ top: outerScroll, behavior: "instant" });
  }

  function buildNav() {
    if (onContinue) {
      // В TG кнопку «Далее» рисует MainButton — на странице её не дублируем
      if (isTG) return null;
      return h("div", { class: "ticket-nav" },
        h("button", {
          class: "primary",
          disabled: !answered,
          onclick: () => onContinue(picked),
        }, "Далее →"),
      );
    }
    if (nav) {
      return h("div", { class: "ticket-nav" },
        h("button", { disabled: !nav.prev, onclick: nav.prev || (() => {}) }, "← Пред."),
        h("button", { disabled: !nav.next, onclick: nav.next || (() => {}) }, "След. →"),
      );
    }
    return null;
  }

  render();
}
