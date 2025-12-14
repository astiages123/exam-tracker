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
 * using local time to avoid timezone issues.
 */
export const getLocalYMD = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

/**
 * Checks if a date string represents a weekend (Saturday or Sunday).
 * @param {string} dateStr - YYYY-MM-DD
 */
export const isWeekend = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
};

/**
 * Calculates the current streak based on an activity log.
 * @param {Object} activityLog - JSON object where keys are YYYY-MM-DD and values are boolean true.
 * @param {Date} [referenceDate] - The date to calculate streak relative to (default: today).
 */
export const calculateStreak = (activityLog, referenceDate = new Date()) => {
    if (!activityLog || Object.keys(activityLog).length === 0) return 0;

    // Use a pointer starting from "yesterday" relative to referenceDate
    // But first, check if "today" has activity. If so, streak includes today.
    let currentStreak = 0;

    const todayStr = getLocalYMD(referenceDate);

    // Check if we have activity today
    if (activityLog[todayStr]) {
        currentStreak++;
    }

    // Now loop backwards from yesterday
    let checkDate = new Date(referenceDate);
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
        // Stop if we go before Anchor Date
        if (checkDate < ANCHOR_DATE) break;

        const dateStr = getLocalYMD(checkDate);
        const hasActivity = !!activityLog[dateStr];
        const isWeekendDay = isWeekend(dateStr);

        if (hasActivity) {
            currentStreak++;
        } else if (!hasActivity && isWeekendDay) {
            // It's a weekend and no activity -> Rest day.
            // Streak doesn't break, but doesn't increment.
            // Just continue to previous day.
        } else {
            // No activity on a weekday -> Streak broken.
            break;
        }

        // Move to previous day
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
};

/**
 * Adds an entry to the activity log for "today".
 * Stores a count of activities to support undo operations.
 * @param {Object} currentLog 
 */
export const logActivity = (currentLog) => {
    const todayStr = getLocalYMD(new Date());
    const currentCount = currentLog[todayStr] === true ? 1 : (currentLog[todayStr] || 0); // Handle legacy boolean 'true'

    return {
        ...currentLog,
        [todayStr]: currentCount + 1
    };
};

/**
 * Removes an activity from the log for "today".
 * Used when user unchecks a video.
 * @param {Object} currentLog 
 */
export const removeActivity = (currentLog) => {
    const todayStr = getLocalYMD(new Date());
    const currentVal = currentLog[todayStr] === true ? 1 : (currentLog[todayStr] || 0); // Handle legacy boolean

    if (currentVal <= 1) {
        // If count goes to 0 or was 1 (or true), remove the key
        const newLog = { ...currentLog };
        delete newLog[todayStr];
        return newLog;
    }

    return {
        ...currentLog,
        [todayStr]: currentVal - 1
    };
};
