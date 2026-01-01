export const formatHours = (hours: number): string => {
    return `${hours.toFixed(1)} sa`;
};

export const formatVideoDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h > 0) {
        return `${h}s ${m}dk`;
    }
    return `${m} dk`;
};
