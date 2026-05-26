import { loadData } from "./data.js";
import * as store from "./store.js";
import { h, mount } from "./render.js";
import { renderHome } from "./views/home.js";
import { renderTheoryTopics, renderTheoryTopic, renderTheoryTicket } from "./views/theory.js";
import { renderPractice } from "./views/practice.js";
import { renderExam } from "./views/exam.js";
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

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function route() {
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);

  if (parts.length === 0) return renderHome(ctx);

  if (parts[0] === "theory") {
    if (parts.length === 1) return renderTheoryTopics(ctx);
    if (parts.length === 2) return renderTheoryTopic(ctx, parts[1]);
    if (parts.length === 3) return renderTheoryTicket(ctx, parts[1], parts[2]);
  }
  if (parts[0] === "practice") return renderPractice(ctx);
  if (parts[0] === "exam") return renderExam(ctx);

  location.hash = "#/";
}

init();
