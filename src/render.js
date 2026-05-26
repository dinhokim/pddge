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

export function svg(attrs = {}, ...children) {
  const NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children.flat()) {
    if (c) el.appendChild(c);
  }
  return el;
}

export function svgEl(tag, attrs = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function mount(node) {
  const app = document.getElementById("app");
  app.replaceChildren(node);
  window.scrollTo({ top: 0, behavior: "instant" });
}

/** Минимальный markdown: **жирный**, переводы строк, перенос параграфов. */
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

/** Верхний бар приложения с кнопкой назад, заголовком и slot справа. */
export function topbar(title, { back, subtitle, right } = {}) {
  // В TG используем нативный BackButton — экранную кнопку скрываем
  if (isTG) setBackButton(back || null);

  return h("div", { class: `appbar${isTG ? " tg" : ""}` },
    !isTG ? h("button", {
      class: back ? "back" : "back back-hidden",
      onclick: back || null,
      "aria-label": "Назад",
    },
      svgIcon("chevron-left", 14),
    ) : null,
    h("div", { class: "titles" },
      h("div", { class: "title" }, title),
      subtitle ? h("div", { class: "subtitle" }, subtitle) : null,
    ),
    h("div", { class: "right" }, right || null),
  );
}

/** SVG-иконки (как функции). */
export function svgIcon(name, size = 14, color = "currentColor") {
  switch (name) {
    case "chevron-left":
      return iconPath("M9 2 L4 7 L9 12", size, color);
    case "chevron-right":
      return iconPath("M5 2 L10 7 L5 12", size, color);
    case "check":
      return iconPath("M3 7.5 L5.7 10 L11 4.5", size, color);
    case "cross":
      return iconPath("M3 3 L9 9 M9 3 L3 9", size, color, 12);
    default:
      return null;
  }
}

function iconPath(d, size, color, vb = 14) {
  const el = svg({
    width: size, height: size, viewBox: `0 0 ${vb} ${vb}`, fill: "none",
  });
  el.appendChild(svgEl("path", {
    d, stroke: color, "stroke-width": "2.4",
    "stroke-linecap": "round", "stroke-linejoin": "round",
  }));
  return el;
}

/** Круговая диаграмма прогресса (donut). */
export function donut({ value, max, color = "#DA1E28", size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(max, 1)));
  const el = svg({ width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  el.appendChild(svgEl("circle", {
    cx: size / 2, cy: size / 2, r,
    fill: "none", stroke: "#E5E7EB", "stroke-width": stroke,
  }));
  el.appendChild(svgEl("circle", {
    cx: size / 2, cy: size / 2, r,
    fill: "none", stroke: color, "stroke-width": stroke,
    "stroke-linecap": "round",
    "stroke-dasharray": `${c * pct} ${c}`,
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
  }));
  return el;
}

/** 5 сердечек для экзамена. */
export function hearts({ remaining, total = 5, size = 18 }) {
  const wrap = h("span", { class: "hearts" });
  for (let i = 0; i < total; i++) {
    const alive = i < remaining;
    const s = svg({ width: size, height: size, viewBox: "0 0 24 24", style: `opacity:${alive ? 1 : 0.25}` });
    s.appendChild(svgEl("path", {
      d: "M12 21s-7-4.35-9.5-9C1 8 3 4 6.5 4c2 0 3.5 1 5.5 3.5C14 5 15.5 4 17.5 4 21 4 23 8 21.5 12 19 16.65 12 21 12 21z",
      fill: alive ? "var(--danger)" : "#9CA3AF",
    }));
    wrap.appendChild(s);
  }
  return wrap;
}

/** Прогресс-бар. */
export function progress({ value, max, color, height }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  const fill = h("div", {
    class: "fill",
    style: `width:${pct}%${color ? `;background:${color}` : ""}`,
  });
  return h("div", {
    class: "progress" + (height === 5 ? " thin" : height === 14 ? " thick" : ""),
  }, fill);
}

/** Pill / chip. */
export function pill(text, variant) {
  return h("span", { class: `pill${variant ? " " + variant : ""}` }, text);
}
