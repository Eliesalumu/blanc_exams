import { CATEGORIES } from './config.js';
export function validateRuntime(bank, plan) {
  if (!Array.isArray(bank) || bank.length < 500 || plan.exams.length !== 5) throw new Error('Banque incomplète');
  const byId = new Map(bank.map(q => [q.id, q]));
  if (byId.size !== bank.length) throw new Error('Identifiants dupliqués');
  for (const q of bank) if (!CATEGORIES[q.category] || q.choices.length !== 4 || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3 || !q.explanation) throw new Error(`Question invalide : ${q.id}`);
  const used = new Set();
  plan.exams.forEach(e => {
    if (e.ids.length !== 65) throw new Error('Examen incomplet');
    const counts = {};
    e.ids.forEach(id => { if (!byId.has(id) || used.has(id)) throw new Error('Examen avec doublon ou question manquante'); used.add(id); const c = byId.get(id).category; counts[c] = (counts[c] || 0) + 1; });
    Object.entries(CATEGORIES).forEach(([c, spec]) => { if (counts[c] !== spec.count) throw new Error('Répartition incorrecte'); });
  });
  if (plan.reserve.length !== bank.length - used.size || new Set(plan.reserve).size !== plan.reserve.length || plan.reserve.some(id => !byId.has(id) || used.has(id))) throw new Error('Réserve invalide');
  return byId;
}
export async function loadQuestions() {
  const responses = await Promise.all([fetch('./data/questions.json'), fetch('./data/exam-plan.json')]);
  if (responses.some(r => !r.ok)) throw new Error('Fichiers de questions indisponibles');
  const [bank, plan] = await Promise.all(responses.map(r => r.json()));
  return { bank, plan, byId: validateRuntime(bank, plan) };
}
