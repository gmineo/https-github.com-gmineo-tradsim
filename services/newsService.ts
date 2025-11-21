
// Generates narrative flavor text based on market movements

const BULLISH_NEWS = [
    "Analyst upgrade: 'Strong Buy'",
    "Record earnings reported",
    "CEO announces stock buyback",
    "New product launch successful",
    "Competitor faces regulatory probe",
    "Sector momentum increasing",
    "Institutional investors accumulating",
    "Breakout detected on high volume",
    "Inflation data cooler than expected",
    "Tech breakthrough announced"
];

const BEARISH_NEWS = [
    "CEO investigation rumored",
    "Missed earnings expectations",
    "Regulatory crackdown looming",
    "Supply chain issues reported",
    "Analyst downgrade to 'Sell'",
    "Insider selling detected",
    "Macroeconomic fears grip market",
    "Sector rotation into bonds",
    "Accounting irregularities suspected",
    "Production delays confirmed"
];

const NEUTRAL_NEWS = [
    "Market awaiting Fed decision",
    "Low volume trading today",
    "Consolidation phase continues",
    "Traders watching key resistance",
    "Mixed signals from global markets",
    "Sideways movement expected"
];

export const newsService = {
    getNews: (priceChangePct: number, currentTicker: string): { headline: string, type: 'good' | 'bad' | 'neutral' } => {
        // Significant movement threshold (e.g., 2% move in a few ticks)
        
        if (priceChangePct > 0.02) {
            const idx = Math.floor(Math.random() * BULLISH_NEWS.length);
            return { headline: `${currentTicker}: ${BULLISH_NEWS[idx]}`, type: 'good' };
        }
        
        if (priceChangePct < -0.02) {
             const idx = Math.floor(Math.random() * BEARISH_NEWS.length);
             return { headline: `${currentTicker}: ${BEARISH_NEWS[idx]}`, type: 'bad' };
        }

        // Random chance for neutral news if calm
        if (Math.random() > 0.7) {
            const idx = Math.floor(Math.random() * NEUTRAL_NEWS.length);
            return { headline: NEUTRAL_NEWS[idx], type: 'neutral' };
        }

        return { headline: "", type: 'neutral' };
    }
};
