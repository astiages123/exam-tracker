/**
 * Centralized Style Constants
 * 
 * This file contains all shared style objects used across the application.
 * Import from here instead of defining duplicates in each component.
 */

import {
    Banknote,
    Scale,
    Receipt,
    SquareFunction,
    BookOpen,
    User,
    CreditCard,
    Search,
    Shield,
    Award,
    Crown,
    Star,
    Globe2,
    Wallet,
    Ship,
    Building2,
    Handshake,
    Siren,
    HardHat,
    ShoppingBag,
    Landmark,
    Hammer,
    Calculator,
    Network,
    Tv,
    Gem,
    Castle,
    PiggyBank,
    Percent,
    Sigma,
    ScatterChart,
    Users,
    ChartNetwork
} from 'lucide-react';


// ============================================================================
// CATEGORY STYLES - Used in App.jsx for course categories
// ============================================================================

export const CATEGORY_STYLES: Record<string, {
    bg: string;
    border: string;
    accent: string;
    darkAccent: string;
    iconBg: string;
    barColor: string;
}> = {
    'EKONOMİ': {
        bg: 'bg-sky-400/8 hover:bg-sky-900/30',
        border: 'border-sky-500/20',
        accent: 'text-sky-300',
        darkAccent: 'text-sky-500',
        iconBg: 'bg-sky-500/20',
        barColor: 'bg-sky-300'
    },
    'HUKUK': {
        bg: 'bg-rose-400/8 hover:bg-rose-900/30',
        border: 'border-rose-500/20',
        accent: 'text-rose-300',
        darkAccent: 'text-rose-500',
        iconBg: 'bg-rose-500/20',
        barColor: 'bg-rose-300'
    },
    'MUHASEBE - İŞLETME - MALİYE': {
        bg: 'bg-emerald-400/8 hover:bg-emerald-900/30',
        border: 'border-emerald-500/20',
        accent: 'text-emerald-300',
        darkAccent: 'text-emerald-500',
        iconBg: 'bg-emerald-500/20',
        barColor: 'bg-emerald-300'
    },
    'MATEMATİK - BANKA': {
        bg: 'bg-violet-400/8 hover:bg-violet-900/30',
        border: 'border-violet-500/20',
        accent: 'text-violet-300',
        darkAccent: 'text-violet-500',
        iconBg: 'bg-violet-500/20',
        barColor: 'bg-violet-300'
    },
    'DEFAULT': {
        bg: 'bg-card',
        border: 'border-border/30',
        accent: 'text-primary',
        darkAccent: 'text-primary-foreground',
        iconBg: 'bg-primary/10',
        barColor: 'bg-primary'
    }
};

// ============================================================================
// CATEGORY ICONS - Used in App.jsx for course category icons
// ============================================================================

export const CATEGORY_ICONS: Record<string, any> = {
    'EKONOMİ': Banknote,
    'HUKUK': Scale,
    'MUHASEBE - İŞLETME - MALİYE': Receipt,
    'MATEMATİK - BANKA': SquareFunction,
    'DEFAULT': BookOpen
};

// ============================================================================
// COURSE ICONS - Specific icons for course names
// ============================================================================

export const COURSE_ICONS: Record<string, any> = {
    // Ekonomi
    'Mikro İktisat': ChartNetwork,
    'Makro İktisat': Globe2,
    'Para, Banka ve Kredi': Wallet,
    'Uluslararası Ticaret': Ship,
    'Türkiye Ekonomisi': Building2,

    // Hukuk
    'Medeni Hukuk': Users,
    'Borçlar Hukuku': Handshake,
    'Ticaret Hukuku': ShoppingBag,
    'Bankacılık Hukuku': Landmark,
    'İcra ve İflas': Hammer,
    'Türk Ceza Kanunu': Siren,
    'İş Hukuku': HardHat,

    // Muhasebe / Maliye / İşletme
    'Genel Muhasebe': Calculator,
    'İşletme Yönetimi': Network,
    'Pazarlama Yönetimi': Tv,
    'Finansal Yönetim': Gem,
    'Maliye Teorisi': Castle,
    'Banka Muhasebesi': PiggyBank,

    // Matematik / Banka
    'Finans Matematiği': Percent,
    'Matematik & Sayısal Mantık': Sigma,
    'İstatistik': ScatterChart,

    // Default
    'DEFAULT': BookOpen
};

// ============================================================================
// RANK ICONS - Used in App.jsx and RankModal.jsx for rank display
// ============================================================================

export const RANK_ICONS: Record<string, any> = {
    User,
    CreditCard,
    Search,
    Shield,
    Award,
    Crown,
    Star
};

// ============================================================================
// SUBJECT STYLES - Used in ScheduleModal.jsx for schedule display
// ============================================================================

export const SUBJECT_STYLES: Record<string, {
    bg: string;
    text: string;
    border: string;
    badge: string;
}> = {
    'EKONOMİ': {
        bg: 'bg-sky-500/20',
        text: 'text-sky-700 dark:text-sky-100',
        border: 'border-sky-500/30',
        badge: 'bg-sky-500/30'
    },
    'HUKUK': {
        bg: 'bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-100',
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/30'
    },
    'MUHASEBE - İŞLETME - MALİYE': {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-100',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/30'
    },
    'MATEMATİK - BANKA': {
        bg: 'bg-violet-500/20',
        text: 'text-violet-700 dark:text-violet-100',
        border: 'border-violet-500/30',
        badge: 'bg-violet-500/30'
    },
    'DEFAULT': {
        bg: 'bg-card',
        text: 'text-foreground',
        border: 'border-border',
        badge: 'bg-muted'
    }
};

// ============================================================================
// SUBJECT OPTIONS - Used in ScheduleModal.jsx for subject dropdown
// ============================================================================

export const SUBJECT_OPTIONS = [
    "EKONOMİ",
    "HUKUK",
    "MUHASEBE - İŞLETME - MALİYE",
    "MATEMATİK - BANKA"
];

// ============================================================================
// DAY CONSTANTS - Used in ScheduleModal.jsx
// ============================================================================

export const DAYS = [
    'PAZARTESİ',
    'SALI',
    'ÇARŞAMBA',
    'PERŞEMBE',
    'CUMA',
    'CUMARTESİ / PAZAR'
];
