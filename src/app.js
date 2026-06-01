import { loadData } from "./data.js";
import * as store from "./store.js";
import { h, mount } from "./render.js";
import { renderHome } from "./views/home.js";
import { renderTheoryTopics, renderTheoryTopic, renderTheoryTicket } from "./views/theory.js";
import { renderPractice } from "./views/practice.js";
import { renderExam } from "./views/exam.js";
import { renderMistakes } from "./views/mistakes.js";
import { renderCards } from "./views/cards.js";
import { initTG, isTG, setBackButton } from "./tg.js";

const ctx = {
  data: null,
  store,
  session: {
    practice: null,
    exam: null,
    examTimerId: null,
  },
  tg: { isTG },
};

async function init() {
  initTG();
  try {
    ctx.data = await loadData();
  } catch (e) {
    mount(h("div", { class: "app" },
      h("div", { class: "info-note" },
        "Не удалось загрузить базу вопросов: ",
        String(e.message || e)),
    ));
    return;
  }
  window.addEventListener("hashchange", route);
  route();

  registerSW();
}

// ─ Service Worker с авто-апдейтом ────────────────────────────────
// Когда выходит новая версия SW, мы немедленно её активируем и
// перезагружаем страницу, чтобы пользователь увидел свежий контент
// сразу — без необходимости закрывать приложение.
function registerSW() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    // Каждые 60 секунд (и сразу) — проверяем обновление
    const checkUpdate = () => { try { reg.update(); } catch {} };
    checkUpdate();
    setInterval(checkUpdate, 60_000);

    // Когда новый SW устанавливается — попросим его сразу активироваться
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          // есть новая версия и есть текущий контроллер — это обновление
          sw.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    // После активации нового SW — перезагрузим страницу один раз
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }).catch(() => {});
}

function route() {
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);

  if (parts.length === 0) return renderHome(ctx);

  if (parts[0] === "theory") {
    if (parts.length === 1) return renderTheoryTopics(ctx);
    if (parts.length === 2) return renderTheoryTopic(ctx, parts[1]);
    if (parts.length === 3 && parts[2] === "cards") return renderCards(ctx, parts[1]);
    if (parts.length === 3) return renderTheoryTicket(ctx, parts[1], parts[2]);
  }
  if (parts[0] === "practice") return renderPractice(ctx);
  if (parts[0] === "exam") return renderExam(ctx);
  if (parts[0] === "mistakes") return renderMistakes(ctx);

  location.hash = "#/";
}

init();
