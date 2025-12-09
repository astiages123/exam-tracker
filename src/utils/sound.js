export const playNotificationSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playBeep = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, time); // A5
        osc.frequency.exponentialRampToValueAtTime(440, time + 0.3); // Drop to A4

        // Louder volume
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    };

    // Play 3 times
    const now = ctx.currentTime;
    playBeep(now);
    playBeep(now + 0.6);
    playBeep(now + 1.2);
};
