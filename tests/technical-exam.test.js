import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DURATION, SUBSCRIPTION_EXPIRY } from '../src/config.js';
import {
  TECHNICAL_SECTIONS, TECHNICAL_DURATION, TECHNICAL_STORAGE_KEY,
  validateTechnicalExams, createTechnicalAttempt, scoreTechnicalAttempt,
  missingRequiredComments, loadTechnicalProgress, saveTechnicalProgress,
} from '../src/technicalExam.js';
import { daysUntilExpiry } from '../src/subscription.js';

const exams = JSON.parse(fs.readFileSync(new URL('../data/technical-exams.json', import.meta.url))).exams;
const legacyBank = JSON.parse(fs.readFileSync(new URL('../data/questions.json', import.meta.url)));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('Trois simulations dédiées : 150 questions nouvelles, distinctes et au format exact', () => {
  assert.equal(validateTechnicalExams({ exams }).length, 3);
  assert.equal(exams.flatMap(exam => exam.questions).length, 150);
  const prompts = exams.flatMap(exam => exam.questions.map(question => normalize(question.prompt)));
  assert.equal(new Set(prompts).size, 150);
  const oldPrompts = new Set(legacyBank.map(question => normalize(question.question)));
  assert.ok(prompts.every(prompt => !oldPrompts.has(prompt)));
  for (const exam of exams) {
    assert.equal(exam.questions.filter(question => question.type === 'mcq').length, 40);
    assert.equal(exam.questions.filter(question => question.type === 'short').length, 10);
    assert.equal(exam.durationMinutes, 60);
    for (const [section, rule] of Object.entries(TECHNICAL_SECTIONS)) {
      const questions = exam.questions.filter(question => question.section === section);
      assert.equal(questions.filter(question => question.type === 'mcq').length, rule.mcq);
      assert.equal(questions.filter(question => question.type === 'short').length, rule.short);
      assert.equal(rule.points, rule.mcq + rule.short * 6);
    }
    assert.equal(Object.values(TECHNICAL_SECTIONS).reduce((sum, section) => sum + section.points, 0), 100);
    assert.ok(exam.questions.some(question => question.type === 'mcq' && question.commentRequired));
  }
});

test('Réponse à commenter requiert un choix et un commentaire, sauf soumission automatique', () => {
  const exam = { questions: [{ id: 'm1', type: 'mcq', commentRequired: true }, { id: 'm2', type: 'mcq' }] };
  const attempt = { answers: {}, comments: {} };
  assert.equal(missingRequiredComments(exam, attempt).length, 1);
  attempt.answers.m1 = 2;
  assert.equal(missingRequiredComments(exam, attempt).length, 1);
  attempt.comments.m1 = 'Le conseil doit arbitrer selon les risques suivis.';
  assert.equal(missingRequiredComments(exam, attempt).length, 0);
});

test('Autosauvegarde, reprise exacte et échéance immuable de soixante minutes', () => {
  const exam = exams[0], attempt = createTechnicalAttempt(exam, 1234);
  assert.equal(attempt.deadline - attempt.startedAt, TECHNICAL_DURATION);
  assert.equal(attempt.deadline - attempt.startedAt, DURATION);
  const memory = new Map(), storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  attempt.index = 3;
  attempt.written[attempt.questionIds[3]] = 'Réponse longue conservée pendant la rédaction.';
  attempt.comments[attempt.questionIds[0]] = 'Commentaire conservé pendant la rédaction.';
  const state = { active: attempt, attempts: [] };
  assert.equal(saveTechnicalProgress(state, storage), true);
  assert.deepEqual(loadTechnicalProgress(storage).data, state);
  assert.ok(memory.has(TECHNICAL_STORAGE_KEY));
  assert.equal(saveTechnicalProgress(state, { setItem: () => { throw new Error('quota'); } }), false);
});

test('Résultat provisoire et note pédagogique sur cent après auto-évaluation', () => {
  const exam = exams[0], attempt = createTechnicalAttempt(exam, 0);
  for (const question of exam.questions.filter(item => item.type === 'mcq')) attempt.answers[question.id] = question.answer;
  let score = scoreTechnicalAttempt(exam, attempt);
  assert.equal(score.mcqScore, 40);
  assert.equal(score.writtenScore, null);
  assert.equal(score.total, null);
  assert.equal(score.passed, null);
  for (const question of exam.questions.filter(item => item.type === 'short')) attempt.ratings[question.id] = 3;
  score = scoreTechnicalAttempt(exam, attempt);
  assert.equal(score.writtenScore, 30);
  assert.equal(score.total, 70);
  assert.equal(score.passed, true);
  attempt.ratings[exam.questions.find(item => item.type === 'short').id] = 2;
  score = scoreTechnicalAttempt(exam, attempt);
  assert.equal(score.total, 69);
  assert.equal(score.passed, false);
});

test('Rappel calculé selon la date de Kinshasa et la véritable échéance configurée', () => {
  assert.equal(SUBSCRIPTION_EXPIRY, '2026-11-06');
  assert.equal(daysUntilExpiry(SUBSCRIPTION_EXPIRY, new Date('2026-11-04T12:00:00Z')), 2);
  assert.equal(daysUntilExpiry(SUBSCRIPTION_EXPIRY, new Date('2026-11-06T12:00:00Z')), 0);
  assert.equal(daysUntilExpiry(SUBSCRIPTION_EXPIRY, new Date('2026-11-07T12:00:00Z')), -1);
  assert.throws(() => daysUntilExpiry('06-11-2026'), /invalide/);
  assert.throws(() => daysUntilExpiry('2026-02-31'), /invalide/);
});

test('Le plan technique demeure séparé des cinq simulations historiques', () => {
  const legacyPlan = JSON.parse(fs.readFileSync(new URL('../data/exam-plan.json', import.meta.url)));
  assert.equal(legacyPlan.exams.length, 5);
  assert.ok(legacyPlan.exams.every(exam => exam.ids.length === 65));
});
