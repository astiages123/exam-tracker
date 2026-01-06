/**
 * Central Rate Limiter for AI Generation
 * Configured limits:
 * - RPM (Requests Per Minute): 30
 * - RPD (Requests Per Day): 1,000
 * - TPM (Tokens Per Minute): 8,000
 * - TPD (Tokens Per Day): 200,000
 */
export class RateLimiter {
    private static instance: RateLimiter;

    // Configuration
    // RPM 30 means 1 request every 2 seconds on average.
    // However, burstiness might be allowed if TPM permits.
    // For safety, we enforce a strict minimum window between requests.
    private readonly MIN_REQUEST_INTERVAL_MS = 2000; // 60s / 30 = 2s
    private readonly LIMITS = {
        RPM: 30,
        RPD: 1000,
        TPM: 12000, // Quality over Quantity (Llama 3.3 70B limit)
        TPD: Infinity // Local limit removed to prevent blocking based on previous model usage
    };

    // State (in-memory for minute windows)
    private requestTimestamps: number[] = [];
    private tokenUsageHistory: { time: number; tokens: number }[] = [];
    private lastRequestTime: number = 0;

    // Storage keys
    private readonly STORAGE_KEYS = {
        DAILY_REQUESTS: 'rate_limit_daily_requests',
        DAILY_TOKENS: 'rate_limit_daily_tokens',
        LAST_RESET: 'rate_limit_last_reset'
    };

    private constructor() {
        this.checkDailyReset();
    }

    static getInstance(): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter();
        }
        return RateLimiter.instance;
    }

    /**
     * Resets daily counters if it's a new day
     */
    private checkDailyReset() {
        const lastResetStr = localStorage.getItem(this.STORAGE_KEYS.LAST_RESET);
        const now = new Date();
        const todayStr = now.toDateString();

        if (lastResetStr !== todayStr) {
            localStorage.setItem(this.STORAGE_KEYS.LAST_RESET, todayStr);
            localStorage.setItem(this.STORAGE_KEYS.DAILY_REQUESTS, '0');
            localStorage.setItem(this.STORAGE_KEYS.DAILY_TOKENS, '0');
            console.log('[RateLimiter] Daily limits reset for:', todayStr);
        }
    }

    private getDailyUsage() {
        this.checkDailyReset();
        return {
            requests: parseInt(localStorage.getItem(this.STORAGE_KEYS.DAILY_REQUESTS) || '0', 10),
            tokens: parseInt(localStorage.getItem(this.STORAGE_KEYS.DAILY_TOKENS) || '0', 10)
        };
    }

    private updateDailyUsage(requestsDelta: number, tokensDelta: number) {
        const current = this.getDailyUsage();
        localStorage.setItem(this.STORAGE_KEYS.DAILY_REQUESTS, (current.requests + requestsDelta).toString());
        localStorage.setItem(this.STORAGE_KEYS.DAILY_TOKENS, (current.tokens + tokensDelta).toString());
    }

    /**
     * Checks availability and waits if necessary.
     * @param estimatedTokens Estimated token cost of the request (default 1000)
     */
    async waitForAvailability(estimatedTokens: number = 1000): Promise<void> {
        // 1. Check Daily Limits
        const daily = this.getDailyUsage();
        if (daily.requests >= this.LIMITS.RPD) {
            throw new Error(`Günlük istek limiti (${this.LIMITS.RPD}) aşıldı.`);
        }
        if (daily.tokens + estimatedTokens > this.LIMITS.TPD) {
            throw new Error(`Günlük token limiti (${this.LIMITS.TPD}) aşıldı.`);
        }

        // 2. Enforce Minimum Interval (RPM protection / smoothing)
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.MIN_REQUEST_INTERVAL_MS) {
            const wait = this.MIN_REQUEST_INTERVAL_MS - timeSinceLast;
            console.log(`[RateLimiter] Throttling request for ${wait}ms`);
            await new Promise(resolve => setTimeout(resolve, wait));
        }

        // 3. Check TPM (Token Bucket for last minute)
        // Clean old history
        const oneMinuteAgo = Date.now() - 60000;
        this.tokenUsageHistory = this.tokenUsageHistory.filter(h => h.time > oneMinuteAgo);

        let currentMinuteTokens = this.tokenUsageHistory.reduce((sum, h) => sum + h.tokens, 0);

        // Wait if adding this request would exceed TPM
        // We poll every 1s until space clears up
        while (currentMinuteTokens + estimatedTokens > this.LIMITS.TPM) {
            const oldestEntry = this.tokenUsageHistory[0];
            const waitTime = oldestEntry ? (oldestEntry.time + 60000) - Date.now() : 1000;
            const safeWait = Math.max(1000, waitTime);

            console.log(`[RateLimiter] TPM Limit Reached (${currentMinuteTokens}/${this.LIMITS.TPM}). Waiting ${safeWait}ms...`);
            await new Promise(resolve => setTimeout(resolve, safeWait));

            // Re-check
            const freshAgo = Date.now() - 60000;
            this.tokenUsageHistory = this.tokenUsageHistory.filter(h => h.time > freshAgo);
            currentMinuteTokens = this.tokenUsageHistory.reduce((sum, h) => sum + h.tokens, 0);
        }

        // All clear to proceed (but we don't record usage yet, we verify after)
        // Update last request timestamp to now (or after wait)
        this.lastRequestTime = Date.now();
    }

    /**
     * Records the ACTUAL usage after a request completes.
     */
    recordUsage(tokensUsed: number) {
        const now = Date.now();
        this.tokenUsageHistory.push({ time: now, tokens: tokensUsed });
        this.requestTimestamps.push(now);

        // Update daily persistence
        this.updateDailyUsage(1, tokensUsed);

        console.log(`[RateLimiter] Usage recorded: ${tokensUsed} tokens. Daily: ${this.getDailyUsage().requests}/${this.LIMITS.RPD} reqs.`);
    }

    getStats() {
        const daily = this.getDailyUsage();
        const oneMinuteAgo = Date.now() - 60000;
        const currentMinuteTokens = this.tokenUsageHistory
            .filter(h => h.time > oneMinuteAgo)
            .reduce((sum, h) => sum + h.tokens, 0);

        return {
            dailyRequests: daily.requests,
            dailyTokens: daily.tokens,
            minuteTokens: currentMinuteTokens,
            limits: this.LIMITS
        };
    }
}

export const rateLimiter = RateLimiter.getInstance();
