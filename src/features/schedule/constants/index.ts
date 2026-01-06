
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
    'MUHASEBE - MALİYE': {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-100',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/30'
    },
    'MATEMATİK - İŞLETME': {
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

export const SUBJECT_OPTIONS = [
    "EKONOMİ",
    "HUKUK",
    "MUHASEBE - MALİYE",
    "MATEMATİK - İŞLETME"
];

export const DAYS = [
    'PAZARTESİ',
    'SALI',
    'ÇARŞAMBA',
    'PERŞEMBE',
    'CUMA',
    'CUMARTESİ / PAZAR'
];
