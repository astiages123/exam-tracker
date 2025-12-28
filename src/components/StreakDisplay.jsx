import { Flame } from 'lucide-react';

const StreakDisplay = ({ streak }) => {
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-300">{streak}</span>
        </div>
    );
};

export default StreakDisplay;
