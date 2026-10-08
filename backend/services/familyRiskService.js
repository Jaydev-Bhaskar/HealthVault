const axios = require('axios');

class FamilyRiskService {
    /**
     * Determines AI risk level securely.
     * Uses Gemini 1.5 Flash if API key is present, otherwise falls back to a deterministic heuristic.
     */
    static async evaluateRisk(member, latestRecord, activeMedicines) {
        const apiKey = process.env.GEMINI_API_KEY;

        // Fallback heuristic if no AI or API fails
        const fallbackHeuristic = () => {
            const age = member.age || 30;
            const score = member.healthScore || 500;
            const medCount = activeMedicines ? activeMedicines.length : 0;
            
            if (score < 400 || age > 70 || medCount > 3) return 'HIGH';
            if (score < 700 || age > 50 || medCount > 1) return 'MEDIUM';
            return 'LOW';
        };

        if (!apiKey) {
            return fallbackHeuristic();
        }

        try {
            const prompt = `
                You are a secure medical AI assistant.
                Based on the following minimal patient data, classify their health risk as strictly one of: "LOW", "MEDIUM", or "HIGH".
                Return ONLY the single word (LOW, MEDIUM, or HIGH) and nothing else.

                Patient Data:
                - Age: ${member.age || 'Unknown'}
                - Overall Health Score (out of 1000): ${member.healthScore || 500}
                - Number of Active Medicines: ${activeMedicines ? activeMedicines.length : 0}
                - Recent Diagnosis (from latest record): ${latestRecord?.aiParsedData?.diagnosis || 'None/Clear'}
                - Recent Summary: ${latestRecord?.aiParsedData?.summary || 'None'}
            `;

            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const textResponse = response.data.candidates[0].content.parts[0].text.trim().toUpperCase();
            
            if (['LOW', 'MEDIUM', 'HIGH'].includes(textResponse)) {
                return textResponse;
            }
            return fallbackHeuristic();

        } catch (error) {
            console.error('AI Risk Evaluation Error (falling back to heuristic):', error.message);
            return fallbackHeuristic();
        }
    }
}

module.exports = FamilyRiskService;
