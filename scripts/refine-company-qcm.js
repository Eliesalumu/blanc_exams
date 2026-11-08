import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = new URL('../data/company-exams.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const context = {
  SNCC: {
    A: 'connaissance du réseau et de son environnement multimodal',
    B: 'pilotage stratégique des capacités et des flux ferroviaires',
    C: 'pilotage économique, disponibilité et maîtrise des risques',
    D: 'exploitation sûre, infrastructure et maintenance ferroviaires',
    E: 'gouvernance statutaire et contrôle de la gestion',
    F: 'arbitrage opérationnel sous contraintes',
  },
  RVA: {
    A: 'missions, services aéroportuaires et navigation aérienne',
    B: 'pilotage stratégique d\'une plateforme et de ses services',
    C: 'performance, recettes, investissements et maîtrise des risques',
    D: 'sécurité, continuité, exploitation et systèmes critiques',
    E: 'gouvernance statutaire et responsabilité de direction',
    F: 'décision exécutive en situation dégradée',
  },
};

const lowerInitial = value => value ? value[0].toLowerCase() + value.slice(1) : value;
const rewritePrompt = (prompt, company, section) => {
  const subject = context[company][section];
  if (/^(Quel|Quelle|Quels|Quelles)\b/.test(prompt)) return `Dans un cas de ${subject}, ${lowerInitial(prompt)}`;
  if (/^(Pourquoi|Comment)\b/.test(prompt)) return `Dans une analyse de ${subject}, ${lowerInitial(prompt)}`;
  return `Situation de ${subject} : ${prompt}`;
};
const enrichExplanation = (explanation, company, section) =>
  `${explanation} Pour cette refonte ${company}, le raisonnement attendu relie la décision à ${context[company][section]}; il écarte les propositions qui répondent à un indicateur isolé, à une autorité incompétente ou à une mesure sans preuve de maîtrise.`;

export function refineCompanyQcm(data) {
  for (const exam of data.exams) {
    if (!['SNCC', 'RVA'].includes(exam.company)) continue;
    const target = exam.questions.filter(question => question.type === 'mcq').slice(0, 30);
    if (target.length !== 30) throw new Error(`La simulation ${exam.id} ne contient pas 30 QCM à refondre.`);
    for (const question of target) {
      if (question.refonteVersion === 'statuts-techniques-v1') continue;
      question.originalPrompt = question.prompt;
      question.prompt = rewritePrompt(question.prompt, exam.company, question.section);
      question.explanation = enrichExplanation(question.explanation, exam.company, question.section);
      question.refonteVersion = 'statuts-techniques-v1';
    }
  }
  return data;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  refineCompanyQcm(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('Refonte appliquée : 90 QCM SNCC et 150 QCM RVA.');
}
