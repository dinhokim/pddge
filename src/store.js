// Прогресс пользователя в localStorage.
// Структура:
// {
//   answered: { [id]: { correct: bool, ts: number } },
//   examHistory: [ { ts, total, correct, errors, passed, durationSec } ],
//   difficult:    [ id, ... ],   // id вопросов, помеченных 🔥
//   learned:      [ id, ... ],   // id вопросов, помеченных как пройденные ✅
//   examMistakes: [ id, ... ],   // id вопросов, в которых сделана ошибка на экзамене
// }

const KEY = "pddge.progress.v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { answered: {}, examHistory: [], difficult: [], learned: [], examMistakes: [] };
    const data = JSON.parse(raw);
    data.answered ||= {};
    data.examHistory ||= [];
    data.difficult ||= [];
    data.learned ||= [];
    data.examMistakes ||= [];
    return data;
  } catch {
    return { answered: {}, examHistory: [], difficult: [], learned: [], examMistakes: [] };
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
  _state = { answered: {}, examHistory: [], difficult: [], learned: [], examMistakes: [] };
  save();
}

// ── Ошибки экзамена (для режима «Работа над ошибками») ────────
export function addExamMistake(id) {
  id = +id;
  if (!_state.examMistakes.includes(id)) {
    _state.examMistakes.push(id);
    save();
  }
}
export function removeExamMistake(id) {
  id = +id;
  const i = _state.examMistakes.indexOf(id);
  if (i >= 0) {
    _state.examMistakes.splice(i, 1);
    save();
  }
}
export function getExamMistakes() {
  return _state.examMistakes.slice();
}
export function getExamMistakesCount() {
  return _state.examMistakes.length;
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

// ── Пройденные (✅) ───────────────────────────────────────────
export function isLearned(id) {
  return _state.learned.includes(+id);
}

export function toggleLearned(id) {
  id = +id;
  const i = _state.learned.indexOf(id);
  if (i >= 0) _state.learned.splice(i, 1);
  else _state.learned.push(id);
  save();
  return _state.learned.includes(id);
}

export function getLearnedSet() {
  return new Set(_state.learned);
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
