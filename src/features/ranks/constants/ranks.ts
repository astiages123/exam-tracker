import { Rank } from '@/types';

/**
 * Rank System Constants
 * 
 * Defines the user rank progression system based on completion percentage.
 */

/**
 * User ranks based on completion percentage
 */
export const RANKS: Rank[] = [
    { title: "Stajyer", min: 0, color: "text-slate-400", icon: "User" },
    { title: "Müfettiş Yardımcısı", min: 20, color: "text-blue-400", icon: "Search" },
    { title: "Kıdemli Müfettiş Yardımcısı", min: 40, color: "text-indigo-400", icon: "FileSearch" },
    { title: "Müfettiş", min: 60, color: "text-emerald-400", icon: "ShieldCheck" },
    { title: "Baş Müfettiş", min: 80, color: "text-amber-400 font-bold", icon: "BadgeCheck" }
];



/**
 * Helper function to get rank by percentage
 * @param {number} percentage - Completion percentage (0-100)
 * @returns {Rank} The appropriate rank object
 */
export const getRankByPercentage = (percentage: number): Rank => {
    let currentRank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (Math.floor(percentage) >= RANKS[i].min) {
            currentRank = RANKS[i];
            break;
        }
    }
    return currentRank;
};

/**
 * Get the next rank after the current one
 * @param {Rank} currentRank - Current rank object
 * @returns {Rank} Next rank or final rank info
 */
export const getNextRank = (currentRank: Rank): Rank => {
    const currentIndex = RANKS.findIndex(r => r.title === currentRank.title);
    return RANKS[currentIndex + 1] || { min: 100, title: "Zirve", color: "", icon: "" };
};
