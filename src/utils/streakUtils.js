/**
 * Streak System Utility Functions
 * 
 * Rules:
 * 1. Trigger: Update only when a lesson is completed.
 * 2. Start Date: Dec 8, 2025.
 * 3. Weekends: Sat/Sun are rest days. Don't break streak if missed, but count if worked.
 * 4. Break Rule: Streak resets to 0 if a weekday (Mon-Fri) is missed.
 */

// Anchor Date: December 8, 2025
const ANCHOR_DATE = new Date('2025-12-08T00:00:00');

/**
 * Returns the date string in YYYY-MM-DD format for a given date object
 * using local system time components to be 100% consistent with App.jsx.
 */
const getLocalYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Checks if a date string represents a weekend (Saturday or Sunday).
 * @param {string} dateStr - YYYY-MM-DD
 */
const isWeekend = (dateStr) => {
    // Standard format YYYY-MM-DD can be parsed safely by new Date(year, month-1, day)
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
};

/**
 * Calculates the current streak based on an activity log.
 * @param {Object} activityLog - JSON object where keys are YYYY-MM-DD and values are activity counts or boolean.
 * @param {Date} [referenceDate] - The date to calculate streak relative to (default: today).
 */
export const calculateStreak = (activityLog, referenceDate = new Date()) => {
    if (!activityLog) return 0;

    // 1. Normalize keys to ensure NO spaces and NO malformed dates
    const cleanLog = {};
    Object.keys(activityLog).forEach(key => {
        const cleanKey = key.trim().replace(/\s+/g, '');
        if (cleanKey) cleanLog[cleanKey] = activityLog[key];
    });

    if (Object.keys(cleanLog).length === 0) return 0;

    const ANCHOR_STR = '2025-12-08';
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
        if (dateStr < ANCHOR_STR) break;

        const hasActivity = !!cleanLog[dateStr];
        const isWeekendDay = isWeekend(dateStr);

        if (hasActivity) {
            currentStreak++;
        } else if (isWeekendDay) {
            // Weekend rest day: Don't break streak, don't increment.
            // Just move to the previous day.
        } else {
            // Missing activity on a weekday: Streak broken.
            break;
        }

        // Move to the previous day
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
};
