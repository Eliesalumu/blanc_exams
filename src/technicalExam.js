export const TECHNICAL_STORAGE_KEY = 'cap70.technical.v1';
export const TECHNICAL_SECTIONS = {
  A: { label: 'Connaissance de l’entreprise et du secteur', points: 15, mcq: 9, short: 1 },
  B: { label: 'Vision stratégique et opportunités', points: 15, mcq: 9, short: 1 },
  C: { label: 'Finance, pilotage et supervision', points: 20, mcq: 8, short: 2 },
  D: { label: 'Cœur du mandat', points: 25, mcq: 7, short: 3 },
  E: { label: 'Rôle dans la gouvernance', points: 15, mcq: 3, short: 2 },
  F: { label: 'Mise en situation réelle', points: 10, mcq: 4, short: 1 },
};
export const TECHNICAL_DURATION = 60 * 60 * 1000;
const questionKey = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function validateTechnicalExams(data) {
  if (!Array.isArray(data?.exams) || data.exams.length !== 3) throw new Error('Les trois simulations techniques sont requises.');
  const ids = new Set(), prompts = new Set();
  for (const [index, exam] of data.exams.entries()) {
    if (exam.id !== `technical-${index + 1}` || exam.questions?.length !== 50 || exam.durationMinutes !== 60) throw new Error(`Structure invalide pour la simulation technique ${index + 1}.`);
    const sections = Object.fromEntries(Object.keys(TECHNICAL_SECTIONS).map(section => [section, { mcq: 0, short: 0, points: 0 }]));
    const answerPositions = [0, 0, 0, 0];
    let commentCount = 0;
    for (const question of exam.questions) {
      if (!question.id || ids.has(question.id) || !TECHNICAL_SECTIONS[question.section]) throw new Error(`Identifiant ou section invalide : ${question.id}`);
      ids.add(question.id);
      const prompt = questionKey(question.prompt);
      if (!prompt || prompts.has(prompt)) throw new Error(`Question répétée ou vide : ${question.id}`);
      prompts.add(prompt);
      if (question.type === 'mcq') {
        if (!Array.isArray(question.choices) || question.choices.length !== 4 || new Set(question.choices.map(questionKey)).size !== 4 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3 || !question.explanation || typeof question.commentRequired !== 'boolean') throw new Error(`QCM invalide : ${question.id}`);
        answerPositions[question.answer]++;
        if (question.commentRequired) commentCount++;
        sections[question.section].mcq++;
        sections[question.section].points++;
      } else if (question.type === 'short') {
        if (!question.instruction || !question.modelAnswer || !Array.isArray(question.essentials) || question.essentials.length < 3 || ![[60, 100], [100, 180]].some(([minimum, maximum]) => question.minWords === minimum && question.maxWords === maximum) || question.commentRequired) throw new Error(`Réponse courte invalide : ${question.id}`);
        sections[question.section].short++;
        sections[question.section].points += 6;
      } else throw new Error(`Type de question invalide : ${question.id}`);
    }
    if (answerPositions.some(count => count !== 10)) throw new Error(`Réponses QCM déséquilibrées dans ${exam.id}.`);
    if (commentCount < 3 || commentCount > 12) throw new Error(`Nombre inadéquat de QCM à commenter dans ${exam.id}.`);
    for (const [section, expected] of Object.entries(TECHNICAL_SECTIONS)) {
      const actual = sections[section];
      if (actual.mcq !== expected.mcq || actual.short !== expected.short || actual.points !== expected.points) throw new Error(`Répartition invalide pour la section ${section} de ${exam.id}.`);
    }
    if (exam.questions.filter(question => question.type === 'mcq').length !== 40 || exam.questions.filter(question => question.type === 'short').length !== 10) throw new Error(`La composition de ${exam.id} doit être 40 QCM et 10 réponses courtes.`);
  }
  return data.exams;
}

export async function loadTechnicalExams() {
  const response = await fetch('./data/technical-exams.json');
  if (!response.ok) throw new Error('Les simulations techniques sont indisponibles.');
  return validateTechnicalExams(await response.json());
}

export function emptyTechnicalProgress() {
  return { active: null, attempts: [] };
}

export function loadTechnicalProgress(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(TECHNICAL_STORAGE_KEY));
    if (!saved) return { data: emptyTechnicalProgress(), warning: null };
    if (!Array.isArray(saved.attempts)) throw new Error('Sauvegarde invalide');
    const attempt = saved.active;
    if (attempt) {
      if (!/^technical-[123]$/.test(attempt.examId) || !Array.isArray(attempt.questionIds) || attempt.questionIds.length !== 50 || !Number.isFinite(attempt.startedAt) || !Number.isFinite(attempt.deadline) || attempt.deadline - attempt.startedAt !== TECHNICAL_DURATION || !Number.isInteger(attempt.index) || attempt.index < 0 || attempt.index > 49 || !attempt.answers || !attempt.written || !attempt.comments || !Array.isArray(attempt.marked)) throw new Error('Tentative technique invalide');
      if (Object.entries(attempt.answers).some(([id, answer]) => !attempt.questionIds.includes(id) || !Number.isInteger(answer) || answer < 0 || answer > 3) || [attempt.written, attempt.comments].some(values => Object.keys(values).some(id => !attempt.questionIds.includes(id) || typeof values[id] !== 'string')) || attempt.marked.some(id => !attempt.questionIds.includes(id))) throw new Error('Réponse sauvegardée invalide');
    }
    if (!saved.attempts.every(item => item && /^technical-[123]$/.test(item.examId) && Array.isArray(item.questionIds) && item.questionIds.length === 50 && item.result)) throw new Error('Résultat technique invalide');
    return { data: saved, warning: null };
  } catch {
    return { data: emptyTechnicalProgress(), warning: 'La sauvegarde des simulations techniques est indisponible ou illisible.' };
  }
}

export function saveTechnicalProgress(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(TECHNICAL_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createTechnicalAttempt(exam, now = Date.now()) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${exam.id}-${now}`,
    examId: exam.id,
    questionIds: exam.questions.map(question => question.id),
    answers: {}, written: {}, comments: {}, ratings: {}, marked: [], index: 0,
    startedAt: now, deadline: now + TECHNICAL_DURATION,
  };
}

export function scoreTechnicalAttempt(exam, attempt) {
  const questions = exam.questions;
  const mcq = questions.filter(question => question.type === 'mcq');
  const short = questions.filter(question => question.type === 'short');
  const mcqScore = mcq.reduce((score, question) => score + (attempt.answers[question.id] === question.answer ? 1 : 0), 0);
  const allRated = short.every(question => Number.isInteger(attempt.ratings?.[question.id]) && attempt.ratings[question.id] >= 0 && attempt.ratings[question.id] <= 6);
  const writtenScore = allRated ? short.reduce((score, question) => score + attempt.ratings[question.id], 0) : null;
  return { mcqScore, mcqTotal: 40, writtenScore, writtenTotal: 60, total: allRated ? mcqScore + writtenScore : null, passed: allRated ? mcqScore + writtenScore >= 70 : null, allRated };
}

export function missingRequiredComments(exam, attempt) {
  return exam.questions.filter(question => question.type === 'mcq' && question.commentRequired &&
    (!Number.isInteger(attempt.answers[question.id]) || !attempt.comments[question.id]?.trim()));
}
