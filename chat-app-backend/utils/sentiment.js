/**
 * Analyzes the sentiment of a message using Gemini 1.5 Flash API.
 * Returns 'positive', 'negative', or 'neutral'.
 * If error occurs or key is missing, defaults to 'neutral'.
 */
async function analyzeSentiment(content) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not defined, defaulting sentiment to neutral');
        return 'neutral';
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Analyze the sentiment of the following message. Respond with only one of these exact words: "positive", "negative", or "neutral". Do not write any other text or punctuation. Message: "${content}"`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API returned status ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
        
        if (text && ['positive', 'negative', 'neutral'].includes(text)) {
            return text;
        }

        if (text) {
            if (text.includes('positive')) return 'positive';
            if (text.includes('negative')) return 'negative';
            if (text.includes('neutral')) return 'neutral';
        }

        return 'neutral';
    } catch (error) {
        console.error('Sentiment analysis failed, falling back to neutral:', error);
        return 'neutral';
    }
}

module.exports = {
    analyzeSentiment
};
