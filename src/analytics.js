import { CATEGORIES } from './config.js';
export function analyze(attempts, byId) {
  const categories = Object.fromEntries(Object.keys(CATEGORIES).map(c => [c, { correct: 0, total: 0 }]));
  const errors = {}, errorIds = new Set();
  // An error disappears from targeted revision when the latest exam answer is correct.
  const latestAnswers = new Map();
  for (const a of attempts) {
    for (const [c, s] of Object.entries(a.result.categories)) { categories[c].correct += s.correct; categories[c].total += s.total; }
    a.ids.forEach(id => latestAnswers.set(id, a.answers[id]));
  }
  for (const [id, answer] of latestAnswers) {
    const q = byId.get(id);
    if (q && answer !== q.correctAnswer) { errorIds.add(id); errors[q.subcategory] = (errors[q.subcategory] || 0) + 1; }
  }
  const ranked = Object.entries(categories).filter(([, v]) => v.total).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  return { categories, errors, errorIds: [...errorIds], weakest: ranked[0]?.[0], strongest: ranked.at(-1)?.[0],
    average: attempts.length ? attempts.reduce((s, a) => s + a.result.percentage, 0) / attempts.length : null,
    best: attempts.length ? Math.max(...attempts.map(a => a.result.percentage)) : null };
}
