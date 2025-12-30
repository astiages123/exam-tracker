/**
 * Date Utility Functions
 * 
 * Centralized date handling utilities to ensure consistency across the app.
 * All date strings use YYYY-MM-DD format (ISO 8601 date part).
 */

/**
 * Returns the date string in YYYY-MM-DD format for a given date object.
 * Uses local system time components to be consistent across the app.
 * 
 * @param {Date|number|string} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getLocalYMD = (date: Date | number | string): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Checks if a date string represents a weekend (Saturday or Sunday).
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is a weekend
 */
export const isWeekend = (dateStr: string): boolean => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
};

/**
 * Checks if two dates are on the same calendar day.
 * 
 * @param {Date|number|string} d1 - First date
 * @param {Date|number|string} d2 - Second date
 * @returns {boolean} True if same day
 */
export const isSameDay = (d1: Date | number | string, d2: Date | number | string): boolean => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

/**
 * Formats a time for input fields (HH:MM).
 * 
 * @param {Date} date - Date object
 * @returns {string} Time string in HH:MM format
 */
export const formatTimeForInput = (date: Date): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.getHours().toString().padStart(2, '0') + ":" +
        d.getMinutes().toString().padStart(2, '0');
};
