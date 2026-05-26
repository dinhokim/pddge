// Прогресс пользователя в localStorage.
// Структура:
// {
//   answered: { [id]: { correct: bool, ts: number } },
//   examHistory: [ { ts, total, correct, errors, passed, durationSec } ],
//   difficult: [ id1, id2, ... ],   // id вопросов, помеченных 🔥
// }

const KEY = "pddge.progress.v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { answered: {}, examHistory: [], difficult: [] };
    const data = JSON.parse(raw);
    data.answered ||= {};
    data.examHistory ||= [];
    data.difficult ||= [];
    return data;
  } catch {
    return { answered: {}, examHistory: [], difficult: [] };
  }
}

let _state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn("progress save failed", e);
  }
}

export function getProgress() {
  return _state;
}

export function recordAnswer(id, correct) {
  _state.answered[id] = { correct: !!correct, ts: Date.now() };
  save();
}

export function recordExam(result) {
  _state.examHistory.unshift({ ...result, ts: Date.now() });
  _state.examHistory = _state.examHistory.slice(0, 30);
  save();
}

export function resetProgress() {
  _state = { answered: {}, examHistory: [], difficult: [] };
  save();
}

// ── Сложные вопросы (🔥) ──────────────────────────────────────
export function isDifficult(id) {
  return _state.difficult.includes(+id);
}

export function toggleDifficult(id) {
  id = +id;
  const i = _state.difficult.indexOf(id);
  if (i >= 0) _state.difficult.splice(i, 1);
  else _state.difficult.push(id);
  save();
  return _state.difficult.includes(id);
}

export function getDifficultSet() {
  return new Set(_state.difficult);
}

export function stats(questions) {
  const total = questions.length;
  const ids = new Set(questions.map(q => q.id));
  let learnedOk = 0, learnedFail = 0;
  for (const [id, rec] of Object.entries(_state.answered)) {
    if (!ids.has(+id)) continue;
    if (rec.correct) learnedOk++; else learnedFail++;
  }
  const examPassed = _state.examHistory.filter(e => e.passed).length;
  return { total, learnedOk, learnedFail, examTotal: _state.examHistory.length, examPassed };
}
