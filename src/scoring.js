import { CATEGORIES, DURATION } from './config.js';
export function scoreExam(questions, answers, startedAt, submittedAt) {
  const categories = Object.fromEntries(Object.keys(CATEGORIES).map(c => [c, { correct: 0, total: 0 }]));
  let correct = 0, wrong = 0, unanswered = 0;
  const errors = [];
  for (const q of questions) {
    categories[q.category].total++;
    if (answers[q.id] === q.correctAnswer) { correct++; categories[q.category].correct++; }
    else { errors.push(q.id); if (Number.isInteger(answers[q.id])) wrong++; else unanswered++; }
  }
  return { correct, wrong, unanswered, total: questions.length, percentage: questions.length ? correct * 100 / questions.length : 0,
    passed: questions.length > 0 && correct * 100 >= questions.length * 70,
    elapsed: Math.max(0, Math.min(DURATION, submittedAt - startedAt)), categories, errors };
}
