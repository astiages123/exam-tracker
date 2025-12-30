/**
 * Streak System Utility Functions
 * 
 * Rules:
 * 1. Trigger: Update only when a lesson is completed.
 * 2. Start Date: Dec 8, 2025.
 * 3. Weekends: Sat/Sun are rest days. Don't break streak if missed, but count if worked.
 * 4. Break Rule: Streak resets to 0 if a weekday (Mon-Fri) is missed.
 */

import { getLocalYMD, isWeekend } from './date';

// Anchor Date: December 8, 2025
const ANCHOR_DATE_STR = '2025-12-08';

/**
 * Calculates the current streak based on an activity log.
 * @param {Record<string, any>} activityLog - JSON object where keys are YYYY-MM-DD and values are activity counts or boolean.
 * @param {Date} [referenceDate] - The date to calculate streak relative to (default: today).
 */
export const calculateStreak = (activityLog: Record<string, any>, referenceDate: Date = new Date()): number => {
    if (!activityLog) return 0;

    // 1. Normalize keys to ensure NO spaces and NO malformed dates
    const cleanLog: Record<string, any> = {};
    Object.keys(activityLog).forEach(key => {
        const cleanKey = key.trim().replace(/\s+/g, '');
        if (cleanKey) cleanLog[cleanKey] = activityLog[key];
    });

    if (Object.keys(cleanLog).length === 0) return 0;

    let currentStreak = 0;

    // Start checking from Today
    let checkDate = new Date(referenceDate);
    const todayStr = getLocalYMD(checkDate);

    // Check if today is active
    if (cleanLog[todayStr]) {
        currentStreak++;
    }

    // Move to Yesterday and start the loop
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
        const dateStr = getLocalYMD(checkDate);

        // Stop if we go before Anchor Date (String comparison is safer)
        if (dateStr < ANCHOR_DATE_STR) break;

        const hasActivity = !!cleanLog[dateStr];
        const isWeekendDay = isWeekend(dateStr);

        if (hasActivity) {
            currentStreak++;
        } else if (isWeekendDay) {
            // Hafta sonu mantığı: Sadece bir gün tatil olabilir.
            // Diğer hafta sonu gününü kontrol et.
            const [y, m, d] = dateStr.split('-').map(Number);
            const currentDate = new Date(y, m - 1, d);
            const dayOfWeek = currentDate.getDay(); // 0: Pazar, 6: Cumartesi

            const otherDate = new Date(currentDate);
            // Pazar ise Cumartesiye, Cumartesi ise Pazara bak
            otherDate.setDate(currentDate.getDate() + (dayOfWeek === 0 ? -1 : 1));
            const otherDateStr = getLocalYMD(otherDate);

            if (!cleanLog[otherDateStr]) {
                // Her iki hafta sonu günü de boş -> Streak bozulur.
                break;
            }
            // Sadece bir gün boş (diğeri dolu) -> Bozulmaz ama sayaç artmaz.
        } else {
            // Hafta içi bir gün boş -> Streak bozulur.
            break;
        }

        // Move to the previous day
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
};
