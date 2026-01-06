/**
 * Matematik formüllerini render eder
 * Desteklenen formatlar:
 * - ^2 → ² (üst simge)
 * - _2 → ₂ (alt simge) 
 * - sqrt(x) → √x
 * - frac{a}{b} → a/b kesir
 */
export const renderMathText = (text: string): string => {
    if (!text) return text;

    // Basit dönüşümler (regex ile)
    let result = text
        // Üst simgeler: ^2, ^3, ^n, ^x vb.
        .replace(/\^(\d+)/g, (_, num) => {
            const superscripts: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
            return num.split('').map((d: string) => superscripts[d] || d).join('');
        })
        .replace(/\^([a-zA-Z])/g, (_, letter) => {
            const superLetters: Record<string, string> = { 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'i': 'ⁱ', 'k': 'ᵏ', 'm': 'ᵐ' };
            return superLetters[letter.toLowerCase()] || `^${letter}`;
        })
        // Alt simgeler: _2, _n vb.
        .replace(/_(\d+)/g, (_, num) => {
            const subscripts: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
            return num.split('').map((d: string) => subscripts[d] || d).join('');
        })
        // Karekök
        .replace(/sqrt\(([^)]+)\)/gi, '√($1)')
        // Çarpma işareti
        .replace(/\s*\*\s*/g, ' × ')
        // Bölme işareti
        .replace(/\s*\/\s*/g, ' ÷ ')
        // Pi sembolü
        .replace(/\bpi\b/gi, 'π')
        // Delta
        .replace(/\bdelta\s*/gi, 'Δ')
        // İnfinity
        .replace(/\binfinity\b/gi, '∞')
        // Büyük/küçük eşit
        .replace(/>=/g, '≥')
        .replace(/<=/g, '≤')
        .replace(/!=/g, '≠');

    return result;
};
