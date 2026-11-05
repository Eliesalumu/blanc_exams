import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TECHNICAL_SECTIONS, validateTechnicalExams } from '../src/technicalExam.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exams = JSON.parse(fs.readFileSync(path.join(root, 'data/technical-exams.json'), 'utf8'));
const oldBank = JSON.parse(fs.readFileSync(path.join(root, 'data/questions.json'), 'utf8'));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const oldPrompts = new Set(oldBank.map(question => normalize(question.question)));
const validated = validateTechnicalExams(exams);
for (const exam of validated) {
  for (const question of exam.questions) {
    if (oldPrompts.has(normalize(question.prompt))) throw new Error(`Question réutilisée de l’ancienne banque : ${question.id}`);
    if (question.type === 'mcq' && question.choices.some((choice, index) => index !== question.answer && /\b(toujours|jamais|au hasard|ignorer totalement|sans aucune analyse)\b/i.test(choice))) {
      throw new Error(`Distracteur absolu à réviser : ${question.id}`);
    }
  }
}
console.log(JSON.stringify({
  valid: true,
  simulations: validated.length,
  questions: validated.reduce((sum, exam) => sum + exam.questions.length, 0),
  mcq: validated.reduce((sum, exam) => sum + exam.questions.filter(question => question.type === 'mcq').length, 0),
  written: validated.reduce((sum, exam) => sum + exam.questions.filter(question => question.type === 'short').length, 0),
  commentRequired: validated.map(exam => exam.questions.filter(question => question.commentRequired).length),
  answerPositions: validated.map(exam => [0, 1, 2, 3].map(position => exam.questions.filter(question => question.type === 'mcq' && question.answer === position).length)),
  sections: Object.fromEntries(Object.entries(TECHNICAL_SECTIONS).map(([section, spec]) => [section, { points: spec.points, mcq: spec.mcq, written: spec.short }])),
}, null, 2));
