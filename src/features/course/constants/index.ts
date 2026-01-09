
import {
    Banknote,
    Scale,
    Receipt,
    SquareFunction,
    BookOpen,
    Wallet,
    Ship,
    Building2,
    ChartNetwork,
    Globe2,
    Users,
    Handshake,
    ShoppingBag,
    Landmark,
    Hammer,
    Siren,
    HardHat,
    Calculator,
    Network,
    Tv,
    Gem,
    Castle,
    PiggyBank,
    Percent,
    Sigma,
    ScatterChart
} from 'lucide-react';

export const CATEGORY_STYLES: Record<string, {
    bg: string;
    border: string;
    accent: string;
    darkAccent: string;
    iconBg: string;
    barColor: string;
    hover: string;
}> = {
    'EKONOMİ': {
        bg: 'bg-sky-400/8 hover:bg-sky-900/30',
        border: 'border-sky-500/20',
        accent: 'text-sky-300',
        darkAccent: 'text-sky-500',
        iconBg: 'bg-sky-500/20',
        barColor: 'bg-sky-300',
        hover: 'hover:border-sky-400/50 hover:ring-1 hover:ring-sky-400/50 hover:shadow-[0_8px_30px_-10px_rgba(56,189,248,0.3)]'
    },
    'HUKUK': {
        bg: 'bg-rose-400/8 hover:bg-rose-900/30',
        border: 'border-rose-500/20',
        accent: 'text-rose-300',
        darkAccent: 'text-rose-500',
        iconBg: 'bg-rose-500/20',
        barColor: 'bg-rose-300',
        hover: 'hover:border-rose-400/50 hover:ring-1 hover:ring-rose-400/50 hover:shadow-[0_8px_30px_-10px_rgba(251,113,133,0.3)]'
    },
    'MUHASEBE - MALİYE': {
        bg: 'bg-emerald-400/8 hover:bg-emerald-900/30',
        border: 'border-emerald-500/20',
        accent: 'text-emerald-300',
        darkAccent: 'text-emerald-500',
        iconBg: 'bg-emerald-500/20',
        barColor: 'bg-emerald-300',
        hover: 'hover:border-emerald-400/50 hover:ring-1 hover:ring-emerald-400/50 hover:shadow-[0_8px_30px_-10px_rgba(52,211,153,0.3)]'
    },
    'MATEMATİK - İŞLETME': {
        bg: 'bg-violet-400/8 hover:bg-violet-900/30',
        border: 'border-violet-500/20',
        accent: 'text-violet-300',
        darkAccent: 'text-violet-500',
        iconBg: 'bg-violet-500/20',
        barColor: 'bg-violet-300',
        hover: 'hover:border-violet-400/50 hover:ring-1 hover:ring-violet-400/50 hover:shadow-[0_8px_30px_-10px_rgba(167,139,250,0.3)]'
    },
    'DEFAULT': {
        bg: 'bg-card',
        border: 'border-border/30',
        accent: 'text-emerald',
        darkAccent: 'text-emerald-foreground',
        iconBg: 'bg-emerald/10',
        barColor: 'bg-emerald',
        hover: 'hover:border-emerald-400/50 hover:ring-1 hover:ring-emerald-400/50 hover:shadow-[0_8px_30px_-10px_rgba(52,211,153,0.3)]'
    }
};

export const CATEGORY_ICONS: Record<string, any> = {
    'EKONOMİ': Banknote,
    'HUKUK': Scale,
    'MUHASEBE - MALİYE': Receipt,
    'MATEMATİK - İŞLETME': SquareFunction,
    'DEFAULT': BookOpen
};

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
