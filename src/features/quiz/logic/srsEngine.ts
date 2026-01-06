/**
 * Spaced Repetition System (SRS) Engine
 * Based on a simplified SM-2 Algorithm
 */

// Configuration for exam prep mode
// Prevents intervals from exceeding 30 days for intensive study
const MAX_INTERVAL = 30;

export interface SRSResult {
    nextReviewDate: Date;
    interval: number;
    easeFactor: number;
    repetitionCount: number;
}

export interface SRSInput {
    isCorrect: boolean;
    currentEaseFactor?: number;
    currentInterval?: number;
    currentRepetitionCount?: number;
}

/**
 * Calculates new SRS parameters based on user performance
 * 
 * Rules:
 * - Start: Interval = 0, Ease = 2.5
 * - Correct: 
 *      - Repetition 1: Interval = 1 day
 *      - Repetition 2: Interval = 6 days
 *      - Repetition 3+: Interval = Previous * Ease (capped at MAX_INTERVAL)
 * - Incorrect: 
 *      - Reset Interval to 0 (or 1 day)
 *      - Ease Factor drops (min 1.3)
 */
export function calculateSRS({
    isCorrect,
    currentEaseFactor = 2.5,
    currentInterval = 0,
    currentRepetitionCount = 0
}: SRSInput): SRSResult {
    let newInterval: number;
    let newEaseFactor: number = currentEaseFactor;
    let newRepetitionCount: number;

    if (isCorrect) {
        newRepetitionCount = currentRepetitionCount + 1;

        if (newRepetitionCount === 1) {
            newInterval = 1;
        } else if (newRepetitionCount === 2) {
            newInterval = 6;
        } else {
            // SM-2: I(n) = I(n-1) * EF, capped at MAX_INTERVAL for exam prep
            newInterval = Math.min(
                Math.round(currentInterval * currentEaseFactor),
                MAX_INTERVAL
            );
        }

        // Slight adjustment to EF could happen here if we had detailed grading (0-5)
        // For binary Correct/Incorrect, we keep EF stable or slightly increase if needed.
        // Keeping it simple for now as requested.
        if (newRepetitionCount > 2) {
            newEaseFactor = currentEaseFactor + 0.1;
        }

    } else {
        // Incorrect
        newRepetitionCount = 0; // Reset streak
        newInterval = 0; // Review immediately (or very soon)

        // Decrease Ease Factor (min 1.3)
        // SM-2 formula for grade 0 is q=0. NewEF = OldEF - 0.8 + 0.28*0 - 0.02*0 = OldEF - 0.8
        // Let's use a milder penalty for simply "Incorrect" vs "Blackout"
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
    }

    // Calculate next date
    const nextReviewDate = new Date();
    // If interval is 0, it means "Today" or "Immediate". 
    // If we want it to be 'Immediately', we shouldn't add days.
    // However, usually "Due Today" means we can review it now.
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        nextReviewDate,
        interval: newInterval,
        easeFactor: Number(newEaseFactor.toFixed(2)),
        repetitionCount: newRepetitionCount
    };
}
