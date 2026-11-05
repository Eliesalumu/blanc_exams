import { z } from 'zod';

export const evaluationSchema = z.object({
  questionId: z.string().max(100),
  scoreOutOf10: z.number().min(0).max(10).multipleOf(0.5),
  appreciation: z.string().min(1).max(160),
  correctElements: z.array(z.string().max(500)).max(8),
  missingElements: z.array(z.string().max(500)).max(8),
  errors: z.array(z.string().max(500)).max(8),
  improvedAnswer: z.string().min(1).max(1800),
  keyTakeaway: z.string().min(1).max(500),
  needsHumanReview: z.boolean(),
}).strict();
export const answerRequest = z.object({
  examId: z.string().max(80), questionId: z.string().max(100),
  answer: z.string().max(6000), kind: z.enum(['short', 'comment']).default('short'),
  selectedChoice: z.number().int().min(0).max(3).nullable().default(null),
  optionsVersion: z.enum(['legacy','options-2026-11-05-v1']).optional(),
  bankVersion: z.enum(['rva-dg-2026-11-v1']).optional(),
}).strict();
export const examRequest = z.object({ examId: z.string().max(80), answers: z.array(answerRequest.omit({examId:true})).min(1).max(22) }).strict();
export const chatRequest = z.object({
  stream:z.boolean().default(false),
  mode: z.enum(['Comprendre', 'Réviser', 'Analyser mes erreurs']),
  messages: z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(2000)}).strict()).min(1).max(12),
  context: z.object({
    company:z.enum(['ONATRA','SNCC','RVA']), examId:z.string().max(80).optional(),
    questionId:z.string().max(100).optional(), correction:evaluationSchema.optional(),
    optionsVersion:z.enum(['legacy','options-2026-11-05-v1']).optional(),
    bankVersion:z.enum(['rva-dg-2026-11-v1']).optional(),
    candidateAnswer:z.string().max(6000).optional(), frequentErrors:z.array(z.string().max(200)).max(6).default([]),
    examActive:z.boolean(),
  }).strict(),
}).strict();
export const speechRequest=z.object({text:z.string().trim().min(1).max(3000),examActive:z.boolean()}).strict();
