// Загрузка вопросов и тем. Кэшируется в памяти на время сессии.

import { EXPLANATIONS } from "./explanations/index.js";

// Темы: tcsc, slug, name, emoji, accent (HEX), description
const TOPICS_RU = [
  [1,  "uchastniki",      "Водитель, пассажир, пешеход", "🧑‍✈️", "#475569", "Термины ПДД, обязанности водителей, ДТП и опознавательные знаки"],
  [2,  "neispravnosti",   "Неисправности и эксплуатация", "🔧", "#64748B", "Когда нельзя двигаться: тормоза, свет, дворники, давление в шинах"],
  [3,  "preduprezhd",     "Предупреждающие знаки", "⚠️", "#F59E0B", "Треугольники с красной каймой — впереди опасность"],
  [4,  "prioritet",       "Знаки приоритета", "🚸", "#DA1E28", "Главная дорога, STOP, уступи, преимущество встречного"],
  [5,  "zapreshch",       "Запрещающие знаки", "⛔", "#DC2626", "Красные круги — что запрещено: въезд, обгон, парковка"],
  [6,  "predpisyv",       "Предписывающие знаки", "➡️", "#1E5BD6", "Синие круги — обязательные направления и режимы"],
  [7,  "info_ukaz",       "Информационно-указательные", "🪧", "#2A8AA8", "Синие прямоугольники: одностороннее, пешеходный, автомагистраль"],
  [8,  "servis",          "Знаки сервиса", "⛽", "#0A7C3A", "Заправка, гостиница, больница, телефон — синие с белой пиктограммой"],
  [9,  "dop_info",        "Дополнительная информация", "📋", "#7C3AED", "Таблички под основными знаками: расстояние, время, исключения"],
  [10, "svetofor",        "Сигналы светофора", "🚦", "#0A7C3A", "Красный, жёлтый, зелёный, стрелки, реверс, Т-светофор"],
  [11, "regulirovshchik", "Сигналы регулировщика", "👮", "#0F766E", "Жесты: рука вверх, рука вытянута, спина/грудь к водителю"],
  [12, "specsignaly",     "Специальные сигналы", "🚨", "#DC2626", "Скорая, полиция, пожарная: когда уступать, когда нет"],
  [13, "avariynaya",      "Аварийная сигнализация", "🆘", "#EA580C", "Когда включать аварийку и знак аварийной остановки"],
  [14, "svetozvuk",       "Световые приборы и сигнал", "💡", "#F59E0B", "Фары ближнего/дальнего, габариты, противотуманки, клаксон"],
  [15, "dvizhenie",       "Движение и маневрирование", "🛣️", "#7A5AE0", "Разворот, задний ход, выбор полосы, начало движения"],
  [16, "obgon",           "Обгон и опережение", "↔️", "#C2410C", "Где можно обгонять, где запрещено и как это делать безопасно"],
  [17, "skorost",         "Скоростной режим", "⚡", "#F59E0B", "Лимиты в городе, за городом, с прицепом, на автомагистрали"],
  [18, "distanciya",      "Дистанция и торможение", "🛑", "#BE123C", "Тормозной путь, дистанция в секундах, торможение мотором"],
  [19, "ostanovka",       "Остановка и стоянка", "🅿️", "#2A8AA8", "Где можно стоять, расстояния до перехода, мост, остановка"],
  [20, "perekrestki",     "Проезд перекрёстков", "🚥", "#DA1E28", "Очерёдность, помеха справа, главная дорога, трамвай"],
  [21, "zhd",             "Железнодорожный переезд", "🚂", "#9333EA", "Шлагбаум, светофор переезда, STOP-линия, объезд"],
  [22, "avtomagistral",   "Автомагистраль", "🛤️", "#0369A1", "Въезд/выезд, разгон/торможение, кому запрещено, остановка"],
  [23, "zhilaya_zona",    "Жилая зона", "🏘️", "#0EA5E9", "20 км/ч, приоритет пешехода, что запрещено"],
  [24, "buksirovka",      "Буксировка", "🚛", "#92400E", "Гибкая/жёсткая сцепка, скорость, кто за рулём, что нельзя"],
  [25, "uchebnaya",       "Учебная езда", "🎓", "#7C3AED", "Где запрещена, что нужно для учебной машины"],
  [26, "perevozka",       "Перевозка людей и грузов", "📦", "#92400E", "Дети, негабарит, ремни, посадка-высадка"],
  [27, "velo_skot",       "Велосипед, мопед, скот", "🚴", "#0A7C3A", "Возраст, тротуар, прогон скота, незрячий пешеход"],
  [28, "razmetka",        "Дорожная разметка", "🛣️", "#7A5AE0", "Сплошная, прерывистая, стоп-линия, зебра, реверс"],
  [29, "med_pomoshch",    "Медицинская помощь", "🩺", "#DC2626", "Кровотечения, переломы, ожоги, бессознательное состояние, ШОК"],
  [30, "bezopasnost",     "Безопасность движения", "🛡️", "#0F172A", "Психология, погода, ремни, телефон, занос, шины"],
  [33, "eko",             "Эко-тест", "🌿", "#10B981", "Экономия топлива, экология, выбросы, шум"],
];

export const TOPICS = TOPICS_RU.map(([tcsc, slug, name, emoji, accent, description], idx) => ({
  tcsc, slug, name, emoji, accent, description, order: idx + 1,
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
