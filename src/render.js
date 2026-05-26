// Утилиты рендеринга.
import { setBackButton, isTG } from "./tg.js";

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "data") {
      for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function mount(node, { preserveScroll = false } = {}) {
  const app = document.getElementById("app");
  const y = preserveScroll ? window.scrollY : 0;
  app.replaceChildren(node);
  // После replaceChildren высота body перестраивается — даём ей кадр,
  // прежде чем восстанавливать scroll. Иначе scrollTo не сработает.
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, behavior: "instant" });
  });
}

// мини-markdown: **bold** + переводы строк
export function fmt(text) {
  if (!text) return "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

export function topbar(title, { back } = {}) {
  // В Telegram используем нативный BackButton — экранную кнопку прячем
  if (isTG) {
    setBackButton(back || null);
    return h("div", { class: "topbar tg" },
      h("div", { class: "title" }, title),
    );
  }
  return h("div", { class: "topbar" },
    back ? h("button", { class: "back", onclick: back }, "← Назад") : null,
    h("div", { class: "title" }, title),
  );
}
