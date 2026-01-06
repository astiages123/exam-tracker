import React, { useEffect, useRef } from 'react';

export interface MathAwareHtmlProps extends React.HTMLAttributes<HTMLElement> {
    html: string;
    as?: React.ElementType;
}

/**
 * MathJax destekli HTML render bileşeni.
 * İçerikteki HTML değiştiğinde MathJax typeset işlemini tetikler.
 */
export function MathAwareHtml({ html, className, as: Component = 'div', ...props }: MathAwareHtmlProps) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise && ref.current) {
            (window as any).MathJax.typesetPromise([ref.current])
                .catch((err: any) => console.warn('MathJax typeset error:', err));
        }
    }, [html]);

    return (
        <Component
            ref={ref}
            className={className}
            dangerouslySetInnerHTML={{ __html: html }}
            {...props}
        />
    );
}

export default MathAwareHtml;
