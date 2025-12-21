import React from 'react';
import { Check, ListChecks } from 'lucide-react';

const ActionPopover = ({ onMarkSingle, onMarkRange, videoId }) => {
    // position: { x, y } or we can use absolute positioning relative to parent if parent is relative.
    // For simplicity given the design description "next to/above button", let's assume it's rendered near the click.
    // Ideally, if we render it inside the map loop where the click happened, it can just be absolute.

    return (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[200px]">
            <div className="bg-zinc-900 border border-zinc-700 w-full rounded-xl shadow-xl shadow-black/50 overflow-hidden flex flex-col p-1.5 animated-popover">
                <button
                    onClick={(e) => { e.stopPropagation(); onMarkSingle(); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-lg text-left group transition-colors w-full"
                >
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 shrink-0">
                        <Check size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">Sadece Bunu İşaretle</span>
                        <span className="text-[10px] text-zinc-500 truncate">Video #{videoId} tamamlandı</span>
                    </div>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onMarkRange(); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-lg text-left group transition-colors w-full"
                >
                    <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 shrink-0">
                        <ListChecks size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">Buraya Kadar İşaretle</span>
                        <span className="text-[10px] text-zinc-500 truncate">Önceki eksikler tamamlanır</span>
                    </div>
                </button>
            </div>

            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 pointer-events-none">
                <div className="border-8 border-transparent border-t-zinc-700 w-0 h-0 filter drop-shadow-md"></div>
                <div className="border-[7px] border-transparent border-t-zinc-900 w-0 h-0 absolute -top-[9px] left-[-7px]"></div>
            </div>
        </div>
    );
};

export default ActionPopover;
