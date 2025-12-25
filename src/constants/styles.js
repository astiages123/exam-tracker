/**
 * Centralized Style Constants
 * 
 * This file contains all shared style objects used across the application.
 * Import from here instead of defining duplicates in each component.
 */

import {
    Banknote,
    Scale,
    PieChart,
    Calculator,
    BookOpen,
    User,
    CreditCard,
    Search,
    Shield,
    Award,
    Crown,
    Star
} from 'lucide-react';

// ============================================================================
// CATEGORY STYLES - Used in App.jsx for course categories
// ============================================================================

export const CATEGORY_STYLES = {
    'EKONOMİ': {
        bg: 'bg-sky-500/10 hover:bg-sky-500/20',
        border: 'border-sky-500/20',
        accent: 'text-sky-300',
        iconBg: 'bg-sky-500/20',
        barColor: 'bg-sky-300'
    },
    'HUKUK': {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20',
        border: 'border-rose-500/20',
        accent: 'text-rose-300',
        iconBg: 'bg-rose-500/20',
        barColor: 'bg-rose-300'
    },
    'MUHASEBE - İŞLETME - MALİYE': {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        border: 'border-emerald-500/20',
        accent: 'text-emerald-300',
        iconBg: 'bg-emerald-500/20',
        barColor: 'bg-emerald-300'
    },
    'MATEMATİK - BANKA': {
        bg: 'bg-violet-500/10 hover:bg-violet-500/20',
        border: 'border-violet-500/20',
        accent: 'text-violet-300',
        iconBg: 'bg-violet-500/20',
        barColor: 'bg-violet-300'
    },
    'DEFAULT': {
        bg: 'bg-card',
        border: 'border-border/30',
        accent: 'text-primary',
        iconBg: 'bg-primary/10',
        barColor: 'bg-primary'
    }
};

// ============================================================================
// CATEGORY ICONS - Used in App.jsx for course category icons
// ============================================================================

export const CATEGORY_ICONS = {
    'EKONOMİ': Banknote,
    'HUKUK': Scale,
    'MUHASEBE - İŞLETME - MALİYE': PieChart,
    'MATEMATİK - BANKA': Calculator,
    'DEFAULT': BookOpen
};

// ============================================================================
// RANK ICONS - Used in App.jsx and RankModal.jsx for rank display
// ============================================================================

export const RANK_ICONS = {
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

export const SUBJECT_STYLES = {
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
