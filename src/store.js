// Прогресс пользователя в localStorage.
// Структура:
// {
//   answered: { [id]: { correct: bool, ts: number } },
//   examHistory: [ { ts, total, correct, errors, passed, durationSec } ],
// }

const KEY = "pddge.progress.v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { answered: {}, examHistory: [] };
    const data = JSON.parse(raw);
    data.answered ||= {};
    data.examHistory ||= [];
    return data;
  } catch {
    return { answered: {}, examHistory: [] };
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
  _state = { answered: {}, examHistory: [] };
  save();
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
