import { useState } from 'react';

/**
 * Hook to manage source reference state
 */
export function useSourceReference(chunks = []) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChunk, setSelectedChunk] = useState(null);

    const openSource = (chunkId) => {
        const chunk = chunks.find(c => c.id === chunkId);
        if (chunk) {
            setSelectedChunk(chunk);
            setIsOpen(true);
        }
    };

    const closeSource = () => {
        setIsOpen(false);
        setSelectedChunk(null);
    };

    return {
        isOpen,
        selectedChunk,
        openSource,
        closeSource
    };
}
