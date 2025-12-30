/**
 * Virtualized Video List
 * 
 * Uses @tanstack/react-virtual for efficient rendering of long video lists.
 * Only renders visible items, significantly improving performance for courses
 * with many videos.
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import VideoItem from '@/components/course/VideoItem';
import type { Video } from '@/types';

interface VirtualizedVideoListProps {
    videos: Video[];
    completedIds: number[];
    courseId: string;
    onVideoClick: (e: React.MouseEvent, courseId: string, videoId: number) => void;
}

/**
 * Threshold for when to use virtualization
 * Below this count, render all items normally
 */
const VIRTUALIZATION_THRESHOLD = 15;

/**
 * Estimated height of each video item in pixels
 */
const ESTIMATED_ITEM_HEIGHT = 48;

export function VirtualizedVideoList({
    videos,
    completedIds,
    courseId,
    onVideoClick
}: VirtualizedVideoListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    // If list is small, don't virtualize
    if (videos.length <= VIRTUALIZATION_THRESHOLD) {
        return (
            <div className="p-2 space-y-1">
                {videos.map((video, vIdx) => {
                    const isCompleted = completedIds.includes(video.id);
                    return (
                        <VideoItem
                            key={video.id}
                            video={video}
                            index={vIdx}
                            isCompleted={isCompleted}
                            onClick={(e) => onVideoClick(e, courseId, video.id)}
                        />
                    );
                })}
            </div>
        );
    }

    // Use virtualization for larger lists
    const virtualizer = useVirtualizer({
        count: videos.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5, // Render 5 extra items above/below viewport
    });

    const items = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className="p-2 overflow-auto"
            style={{ maxHeight: '400px' }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {items.map((virtualItem) => {
                    const video = videos[virtualItem.index];
                    const isCompleted = completedIds.includes(video.id);

                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <VideoItem
                                video={video}
                                index={virtualItem.index}
                                isCompleted={isCompleted}
                                onClick={(e) => onVideoClick(e, courseId, video.id)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default VirtualizedVideoList;
