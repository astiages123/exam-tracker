/**
 * MathJax Lazy Loader
 * 
 * This utility dynamically loads MathJax only when needed (e.g., on quiz pages),
 * avoiding the 250KB initial load cost for pages that don't use math rendering.
 */

let mathJaxPromise: Promise<void> | null = null;

export interface MathJaxConfig {
    tex?: {
        inlineMath?: string[][];
        displayMath?: string[][];
        processEscapes?: boolean;
    };
    options?: {
        skipHtmlTags?: string[];
    };
}

const defaultConfig: MathJaxConfig = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
    },
    options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
    }
};

/**
 * Loads MathJax dynamically. Subsequent calls return the same promise.
 */
export const loadMathJax = (config: MathJaxConfig = defaultConfig): Promise<void> => {
    // Return cached promise if already loading/loaded
    if (mathJaxPromise) {
        return mathJaxPromise;
    }

    // Check if MathJax is already loaded
    if (window.MathJax) {
        return Promise.resolve();
    }

    mathJaxPromise = new Promise((resolve, reject) => {
        // Set MathJax config before loading script
        window.MathJax = config;

        const script = document.createElement('script');
        script.id = 'MathJax-script';
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;

        script.onload = () => {
            resolve();
        };

        script.onerror = () => {
            mathJaxPromise = null;
            reject(new Error('Failed to load MathJax'));
        };

        document.head.appendChild(script);
    });

    return mathJaxPromise;
};

/**
 * Typeset an element after MathJax is loaded.
 * Call this after dynamically adding content with math.
 */
export const typesetMath = async (element?: HTMLElement): Promise<void> => {
    await loadMathJax();

    if (window.MathJax?.typesetPromise) {
        const elements = element ? [element] : undefined;
        await window.MathJax.typesetPromise(elements);
    }
};

/**
 * Check if MathJax is already loaded
 */
export const isMathJaxLoaded = (): boolean => {
    return !!window.MathJax?.typesetPromise;
};

// Extend Window interface for MathJax
declare global {
    interface Window {
        MathJax: MathJaxConfig & {
            typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
        };
    }
}
