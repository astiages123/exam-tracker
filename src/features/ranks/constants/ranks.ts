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
    { title: "Stajyer", min: 0, color: "text-zinc-300", icon: "Sprout" },
    { title: "Gişe Asistanı", min: 10, color: "text-emerald-400", icon: "HandCoins" },
    { title: "Müfettiş Yardımcısı", min: 25, color: "text-blue-400", icon: "SearchCheck" },
    { title: "Kıdemli Müfettiş Yardımcısı", min: 50, color: "text-violet-400", icon: "UserSearch" },
    { title: "Müfettiş", min: 75, color: "text-amber-400", icon: "ShieldCheck" },
    { title: "Kıdemli Müfettiş", min: 100, color: "text-rose-500 font-bold", icon: "Medal" }
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
