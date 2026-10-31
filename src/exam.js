import { DURATION } from './config.js';
export function shuffle(values, random = Math.random) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
export function createAttempt(day, ids, now = Date.now()) {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random()}`, day, ids: shuffle(ids), answers: {}, marked: [], index: 0, startedAt: now, deadline: now + DURATION };
}
export function setAnswer(attempt, questionId, choice, now = Date.now()) {
  if (now >= attempt.deadline || !attempt.ids.includes(questionId) || !Number.isInteger(choice) || choice < 0 || choice > 3) return false;
  attempt.answers[questionId] = choice; return true;
}
export function toggleMark(attempt, id) {
  if (!attempt.ids.includes(id)) return;
  attempt.marked = attempt.marked.includes(id) ? attempt.marked.filter(x => x !== id) : [...attempt.marked, id];
}
export function completeAttempt(attempt, questions, score, now = Date.now(), automatic = false) {
  const submittedAt = Math.min(now, attempt.deadline);
  return { ...attempt, submittedAt, automatic, result: score(questions, attempt.answers, attempt.startedAt, submittedAt) };
}
