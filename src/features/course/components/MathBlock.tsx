/**
 * MathBlock - LaTeX Formül Bileşeni
 * ==================================
 * KaTeX ile matematiksel formülleri render eder.
 */

import { useEffect, useRef } from 'react';

interface MathBlockProps {
    content: string;
    display?: boolean;
    className?: string;
}

/**
 * LaTeX formüllerini render eder
 * MathJax kullanılıyorsa global typeset'i tetikler
 */
export function MathBlock({ content, display = false, className = '' }: MathBlockProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // MathJax varsa yeniden render et
        if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
            (window as any).MathJax.typesetPromise([ref.current]).catch((err: Error) => {
                console.warn('MathJax render hatası:', err);
            });
        }
    }, [content]);

    if (display) {
        return (
            <div
                ref={ref}
                className={`math-block math-display ${className}`}
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }

    return (
        <span
            ref={ref}
            className={`math-block math-inline ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}

export default MathBlock;
