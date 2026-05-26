// Загрузка вопросов и тем. Кэшируется в памяти на время сессии.

import { EXPLANATIONS } from "./explanations/index.js";

const TOPICS_RU = [
  [1,  "uchastniki",      "Водитель, пассажир, пешеход, знаки"],
  [2,  "neispravnosti",   "Неисправности и условия эксплуатации"],
  [3,  "preduprezhd",     "Предупреждающие знаки"],
  [4,  "prioritet",       "Знаки приоритета"],
  [5,  "zapreshch",       "Запрещающие знаки"],
  [6,  "predpisyv",       "Предписывающие знаки"],
  [7,  "info_ukaz",       "Информационно-указательные знаки"],
  [8,  "servis",          "Знаки сервиса"],
  [9,  "dop_info",        "Знаки дополнительной информации"],
  [10, "svetofor",        "Сигналы светофора"],
  [11, "regulirovshchik", "Сигналы регулировщика"],
  [12, "specsignaly",     "Специальные сигналы"],
  [13, "avariynaya",      "Аварийная световая сигнализация"],
  [14, "svetozvuk",       "Световые приборы и звуковой сигнал"],
  [15, "dvizhenie",       "Движение, маневрирование, проезжая часть"],
  [16, "obgon",           "Обгон, объезд встречного"],
  [17, "skorost",         "Скорость движения"],
  [18, "distanciya",      "Тормозной путь и дистанция"],
  [19, "ostanovka",       "Остановка и стоянка"],
  [20, "perekrestki",     "Проезд перекрёстков"],
  [21, "zhd",             "Железнодорожный переезд"],
  [22, "avtomagistral",   "Движение по автомагистрали"],
  [23, "zhilaya_zona",    "Жилая зона, маршрутный транспорт"],
  [24, "buksirovka",      "Буксировка"],
  [25, "uchebnaya",       "Учебная езда"],
  [26, "perevozka",       "Перевозка людей и грузов"],
  [27, "velo_skot",       "Велосипед, мопед, прогон скота"],
  [28, "razmetka",        "Дорожная разметка"],
  [29, "med_pomoshch",    "Медицинская помощь"],
  [30, "bezopasnost",     "Безопасность движения"],
  [33, "eko",             "Эко-тест"],
];

export const TOPICS = TOPICS_RU.map(([tcsc, slug, name], idx) => ({
  tcsc, slug, name, order: idx + 1,
}));

export const TOPICS_BY_TCSC = Object.fromEntries(TOPICS.map(t => [t.tcsc, t]));
export const TOPICS_BY_SLUG = Object.fromEntries(TOPICS.map(t => [t.slug, t]));

let _cache = null;

export async function loadData() {
  if (_cache) return _cache;
  const res = await fetch("data/questions.json", { cache: "force-cache" });
  if (!res.ok) throw new Error(`questions.json: ${res.status}`);
  const raw = await res.json();
  const questions = raw.questions.map((q) => {
    const enrich = (EXPLANATIONS[q.id]) || null;
    return {
      id: q.id,
      topic: q.topic, // tcsc
      question: q.question,
      image: q.image, // filename
      answers: q.answers,
      correct: q.correct,
      applicable: q.applicable,
      explanationRaw: q.explanation_raw || "",
      enriched: enrich, // {correct, wrong:{idx:str}, why}
    };
  });
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  const byTopic = {};
  for (const q of questions) {
    if (q.topic == null) continue;
    (byTopic[q.topic] ||= []).push(q);
  }
  _cache = { questions, byId, byTopic };
  return _cache;
}

export function topicQuestions(byTopic, tcsc) {
  return byTopic[tcsc] || [];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleExam(questions, n = 30) {
  return shuffle(questions).slice(0, n);
}
