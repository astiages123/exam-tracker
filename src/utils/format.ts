/**
 * Formatting Utility Functions
 * 
 * Centralized formatters for consistent display across the app.
 */

/**
 * Formats decimal hours into a human-readable string.
 * 
 * @param {number} decimalHours - Hours as a decimal (e.g., 2.5 for 2h 30m)
 * @returns {string} Formatted string (e.g., "2sa 30dk")
 */
export const formatHours = (decimalHours: number): string => {
    if (!decimalHours) return "0sa 0dk";
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}sa ${minutes}dk`;
};

/**
 * Formats minutes into hours and minutes string.
 * 
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted string (e.g., "2sa 30dk")
 */
export const formatMinutes = (totalMinutes: number): string => {
    if (!totalMinutes) return "0dk";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
        return `${hours}sa ${minutes}dk`;
    }
    return `${minutes}dk`;
};

/**
 * Formats seconds into MM:SS or HH:MM:SS string.
 * 
 * @param {number} seconds - Total seconds
 * @param {boolean} alwaysShowHours - Whether to show hours even if 0
 * @returns {string} Formatted time string
 */
export const formatSeconds = (seconds: number, alwaysShowHours: boolean = false): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0 || alwaysShowHours) {
        return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
};

/**
 * Formats video duration in minutes to MM:SS or HH:MM string.
 * if < 1 hour: MM:SS
 * if >= 1 hour: HH:MM
 * 
 * @param {number} totalMinutes - Duration in minutes
 * @returns {string} Formatted string
 */
export const formatVideoDuration = (totalMinutes: number): string => {
    const totalSeconds = Math.round(totalMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
        // HH:MM
        return `${pad(hours)}:${pad(minutes)}`;
    }
    // MM:SS
    return `${pad(minutes)}:${pad(seconds)}`;
};
