/**
 * LaTeX Renderer Component
 * Renders LaTeX formulas using react-katex
 */
import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

/**
 * Renders text with embedded LaTeX formulas
 * Supports both inline ($...$) and block ($$...$$) math
 */
export function LatexRenderer({ content, className = '' }) {
    if (!content) return null;

    // Split content by LaTeX delimiters
    const parts = [];
    let remaining = content;
    let key = 0;

    // Process block math first ($$...$$)
    const blockRegex = /\$\$\[?([\s\S]*?)\]?\$\$/g;
    // Process inline math ($...$)
    const inlineRegex = /\$([^$]+)\$/g;

    // Replace block math with placeholders
    const blockMaths = [];
    remaining = remaining.replace(blockRegex, (match, latex) => {
        // Fix: Escape % characters to prevent them from being interpreted as comments
        const sanitized = latex.replace(/([^\\])%/g, '$1\\%').trim();
        blockMaths.push(sanitized);
        return `__BLOCK_MATH_${blockMaths.length - 1}__`;
    });

    // Replace inline math with placeholders
    const inlineMaths = [];
    remaining = remaining.replace(inlineRegex, (match, latex) => {
        // Fix: Escape % characters to prevent them from being interpreted as comments
        const sanitized = latex.replace(/([^\\])%/g, '$1\\%').trim();
        inlineMaths.push(sanitized);
        return `__INLINE_MATH_${inlineMaths.length - 1}__`;
    });

    // Split by placeholders and reconstruct
    const segments = remaining.split(/(__(?:BLOCK|INLINE)_MATH_\d+__)/);

    for (const segment of segments) {
        if (segment.startsWith('__BLOCK_MATH_')) {
            const index = parseInt(segment.match(/_(\d+)__/)[1]);
            parts.push(
                <div key={key++} className="my-4 overflow-x-auto">
                    <BlockMath math={blockMaths[index]} />
                </div>
            );
        } else if (segment.startsWith('__INLINE_MATH_')) {
            const index = parseInt(segment.match(/_(\d+)__/)[1]);
            try {
                parts.push(<InlineMath key={key++} math={inlineMaths[index]} />);
            } catch {
                parts.push(<code key={key++} className="text-red-500">{inlineMaths[index]}</code>);
            }
        } else if (segment) {
            // Process markdown bold (**text**)
            const processedSegment = segment.split(/\*\*(.*?)\*\*/g).map((part, i) => {
                if (i % 2 === 1) {
                    return <strong key={`bold-${key}-${i}`}>{part}</strong>;
                }
                return part;
            });
            parts.push(<span key={key++}>{processedSegment}</span>);
        }
    }

    return <div className={`latex-content ${className}`}>{parts}</div>;
}

export default LatexRenderer;
