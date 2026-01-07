/**
 * Zod Validation Schemas for Quiz Questions
 */
import { z } from 'zod';

// Chart data schema
export const chartDataSchema = z.object({
    type: z.enum(['bar', 'line', 'pie']),
    title: z.string().optional(),
    data: z.array(z.object({
        label: z.string(),
        value: z.number()
    })),
    _verified: z.boolean().optional(),
    _match_check: z.string().optional()
}).nullable();

// Single question schema
export const questionSchema = z.object({
    question: z.string().min(10, 'Soru en az 10 karakter olmalı'),
    options: z.object({
        A: z.string(),
        B: z.string(),
        C: z.string(),
        D: z.string(),
        E: z.string()
    }),
    correct_answer: z.enum(['A', 'B', 'C', 'D', 'E']),
    explanation: z.string().min(20, 'Açıklama en az 20 karakter olmalı'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    category: z.string().optional(),
    source_chunk_id: z.string().optional(),
    verified: z.boolean().optional().default(false),
    verification_notes: z.string().optional(),
    chart_data: chartDataSchema.optional()
});

// Quiz response schema (array of questions)
export const quizResponseSchema = z.array(questionSchema);

/**
 * Validate a single question
 */
/**
 * Validate a single question
 */
export function validateQuestion(data: unknown) {
    const result = questionSchema.safeParse(data);
    return {
        success: result.success,
        data: result.success ? result.data : null,
        errors: result.success ? [] : (result.error?.issues ?? []).map((e: z.ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message
        }))
    };
}

/**
 * Validate quiz response (array of questions)
 */
export function validateQuizResponse(data: unknown) {
    const result = quizResponseSchema.safeParse(data);
    return {
        success: result.success,
        data: result.success ? result.data : null,
        errors: result.success ? [] : (result.error?.issues ?? []).map((e: z.ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message
        })),
        summary: {
            total: Array.isArray(data) ? data.length : 0,
            valid: result.success && Array.isArray(data) ? data.length : 0
        }
    };
}

export default questionSchema;
