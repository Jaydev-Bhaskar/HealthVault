const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const HealthRecord = require('../models/HealthRecord');
const Medicine = require('../models/Medicine');
const User = require('../models/User');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Helper: Call Gemini API with robust error handling
async function callGemini(prompt, imageBase64 = null, mimeType = 'image/jpeg') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in .env');

    // Normalize mime types
    if (mimeType === 'application/octet-stream') mimeType = 'image/jpeg';
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('application/pdf')) {
        mimeType = 'image/jpeg';
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const parts = [];
    if (imageBase64) {
        parts.push({ inlineData: { mimeType, data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const requestBody = {
        contents: [{ parts }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    console.log(`🤖 Calling Gemini API [mimeType: ${mimeType}, hasImage: ${!!imageBase64}, promptLen: ${prompt.length}]`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // HTTP-level errors (quota, auth, etc.)
    if (!response.ok) {
        console.error('❌ Gemini HTTP Error:', response.status, JSON.stringify(data).substring(0, 300));
        const msg = data.error?.message || JSON.stringify(data);
        throw new Error(`Gemini API error (${response.status}): ${msg}`);
    }

    // Blocked by safety at the prompt level
    if (data.promptFeedback?.blockReason) {
        console.error('❌ Gemini blocked by safety:', data.promptFeedback.blockReason);
        throw new Error(`Content blocked by Gemini safety filter: ${data.promptFeedback.blockReason}`);
    }

    // Extract text from candidates
    if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];

        if (candidate.finishReason === 'SAFETY') {
            console.error('❌ Gemini candidate blocked:', JSON.stringify(candidate.safetyRatings));
            throw new Error('Response blocked by Gemini safety filter. Try a different image.');
        }

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const text = candidate.content.parts[0].text;
            console.log(`✅ Gemini response received [${text.length} chars]`);
            return text;
        }
    }

    // Fallback — no usable content
    console.error('❌ Gemini no content. Full response:', JSON.stringify(data).substring(0, 500));
    throw new Error(`Gemini API returned no content. Response: ${JSON.stringify(data).substring(0, 200)}`);
}

// ────────────────────────────────────────────────────────────────────
// OCR + Extract from uploaded image/PDF
// ────────────────────────────────────────────────────────────────────
router.post('/ocr-scan', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        const fileBuffer = fs.readFileSync(filePath);
        const base64 = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Valid enum values for HealthRecord.type
        const validTypes = ['lab_report', 'prescription', 'scan', 'fitness', 'vaccination', 'other'];

        const prompt = `You are a medical OCR assistant. Analyze this medical document image and extract ALL information in the following JSON format. Be thorough and accurate.

    Return ONLY valid JSON (no markdown, no code blocks, no backticks):
    {
      "documentType": "prescription" or "lab_report" or "scan" or "vaccination" or "other",
      "title": "brief title for the document",
      "doctorName": "doctor name if visible",
      "hospitalName": "hospital/clinic name if visible",
      "date": "date on document if visible (YYYY-MM-DD format)",
      "diagnosis": "diagnosis or condition if mentioned",
      "medicines": [
        {
          "name": "medicine name",
          "dosage": "dosage like 500mg",
          "frequency": "once_daily or twice_daily or thrice_daily",
          "duration": "duration like 7 days",
          "timings": ["08:00 AM", "08:00 PM"]
        }
      ],
      "keyMetrics": [
        {
          "name": "metric name like Blood Sugar",
          "value": "numerical value",
          "unit": "unit like mg/dL",
          "status": "normal or high or low",
          "referenceRange": "normal range"
        }
      ],
      "summary": "A 2-3 sentence summary of the entire document in simple language",
      "warnings": ["any health warnings or concerns found"],
      "followUpDate": "next appointment date if mentioned"
    }`;

        let parsed = null;
        let aiError = null;

        // Attempt AI parsing — gracefully degrade if Gemini is unavailable
        try {
            const result = await callGemini(prompt, base64, mimeType);
            try {
                const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch (e) {
                parsed = { summary: result, documentType: 'other', title: 'Scanned Document' };
            }
        } catch (geminiErr) {
            console.error('⚠️ Gemini AI failed, saving record without AI parsing:', geminiErr.message);
            aiError = geminiErr.message;

            // User-friendly message for quota exceeded
            if (aiError.includes('429') || aiError.includes('quota') || aiError.includes('rate')) {
                aiError = '⚠️ Gemini AI quota exceeded. Your document has been saved to your vault, but AI analysis is temporarily unavailable. Please try again later or update your API key.';
            }
        }

        // Fallback if AI parsing failed
        if (!parsed) {
            parsed = {
                documentType: 'other',
                title: req.body.title || req.file.originalname.replace(/\.[^.]+$/, '') || 'Uploaded Document',
                summary: 'Document uploaded successfully. AI analysis is temporarily unavailable.',
                medicines: [],
                keyMetrics: []
            };
        }

        // Ensure documentType matches the Mongoose enum
        const docType = validTypes.includes(parsed.documentType) ? parsed.documentType : 'other';

        // Save as health record (always succeeds even if AI failed)
        const record = await HealthRecord.create({
            patient: req.user._id,
            title: parsed.title || req.body.title || 'Scanned Document',
            type: docType,
            description: parsed.summary || '',
            fileUrl: `/uploads/${req.file.filename}`,
            fileName: req.file.originalname,
            source: aiError ? 'manual_upload' : 'ai_ocr',
            isVerified: false,
            aiParsedData: {
                medicines: parsed.medicines || [],
                diagnosis: parsed.diagnosis || '',
                doctorName: parsed.doctorName || '',
                summary: parsed.summary || '',
                keyMetrics: (parsed.keyMetrics || []).map(m => ({
                    name: m.name, value: m.value, unit: m.unit, status: m.status
                }))
            }
        });

        // Auto-create medicines from parsed prescription data
        const createdMedicines = [];
        if (parsed.medicines && parsed.medicines.length > 0) {
            for (const med of parsed.medicines) {
                try {
                    const medicine = await Medicine.create({
                        patient: req.user._id,
                        name: med.name,
                        dosage: med.dosage || 'As prescribed',
                        frequency: med.frequency || 'once_daily',
                        timings: med.timings || ['09:00 AM'],
                        prescribedBy: parsed.doctorName || '',
                        notes: `Auto-extracted from ${parsed.title || 'scanned document'}`,
                        isActive: true
                    });
                    createdMedicines.push(medicine);
                } catch (medErr) {
                    console.error('⚠️ Failed to create medicine:', med.name, medErr.message);
                }
            }
        }

        const response = {
            message: aiError
                ? 'Document saved to vault. AI analysis unavailable.'
                : 'Document scanned and processed successfully',
            record,
            extractedData: parsed,
            medicinesCreated: createdMedicines.length,
            medicines: createdMedicines
        };

        if (aiError) {
            response.aiWarning = aiError;
        }

        res.json(response);
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────
// AI Health Analysis
// ────────────────────────────────────────────────────────────────────
router.post('/analyze', protect, async (req, res) => {
    try {
        const records = await HealthRecord.find({ patient: req.user._id }).sort({ uploadedAt: -1 }).limit(10);
        const medicines = await Medicine.find({ patient: req.user._id, isActive: true });
        const user = await User.findById(req.user._id);

        const patientContext = {
            name: user.name,
            age: user.age,
            bloodGroup: user.bloodGroup,
            allergies: user.allergies,
            chronicIllnesses: user.chronicIllnesses,
            currentMedications: medicines.map(m => `${m.name} ${m.dosage} (${m.frequency})`),
            recentRecords: records.map(r => ({
                title: r.title,
                type: r.type,
                date: r.uploadedAt,
                metrics: r.aiParsedData?.keyMetrics || [],
                diagnosis: r.aiParsedData?.diagnosis || '',
                summary: r.aiParsedData?.summary || ''
            }))
        };

        const prompt = `You are an AI health advisor. Analyze this patient's health data comprehensively and return ONLY valid JSON (no markdown):

    Patient Data: ${JSON.stringify(patientContext)}

    Return this JSON structure:
    {
      "healthScore": <number 0-1000>,
      "scoreLabel": "Excellent" or "Good" or "Fair" or "Needs Attention",
      "insights": [
        { "type": "positive" or "warning" or "info", "title": "short title", "message": "detailed insight" }
      ],
      "riskFactors": [
        { "condition": "condition name", "riskLevel": "low" or "medium" or "high", "recommendation": "what to do" }
      ],
      "dietRecommendations": ["recommendation 1", "recommendation 2"],
      "exerciseRecommendations": ["recommendation 1"],
      "drugInteractions": ["any potential drug interaction warnings"],
      "nextCheckupSuggestion": "when to get next checkup and what tests"
    }`;

        const result = await callGemini(prompt);
        let analysis;
        try {
            const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(jsonStr);
        } catch (e) {
            analysis = { healthScore: 700, scoreLabel: 'Good', insights: [{ type: 'info', title: 'Analysis', message: result }] };
        }

        // Update user health score
        if (analysis.healthScore) {
            user.healthScore = analysis.healthScore;
            await user.save();
        }

        res.json(analysis);
    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────
// AI Chat (multilingual health assistant)
// ────────────────────────────────────────────────────────────────────
router.post('/chat', protect, async (req, res) => {
    try {
        const { message, language } = req.body;
        const user = await User.findById(req.user._id);
        const medicines = await Medicine.find({ patient: req.user._id, isActive: true });
        const records = await HealthRecord.find({ patient: req.user._id }).sort({ uploadedAt: -1 }).limit(5);

        const context = {
            patientName: user.name,
            age: user.age,
            bloodGroup: user.bloodGroup,
            healthScore: user.healthScore,
            allergies: user.allergies,
            conditions: user.chronicIllnesses,
            activeMedicines: medicines.map(m => `${m.name} ${m.dosage}`),
            recentRecords: records.map(r => ({ title: r.title, summary: r.aiParsedData?.summary, date: r.uploadedAt }))
        };

        const prompt = `You are HealthVault AI, a friendly multilingual health assistant. 
    The patient's data: ${JSON.stringify(context)}
    
    Rules:
    - If the user speaks in Hindi or Marathi, respond in the SAME language
    - Be empathetic, clear, and actionable
    - Always add relevant emojis
    - NEVER diagnose, always suggest consulting a doctor when needed
    - Reference the patient's actual data when answering
    - Keep responses concise (under 150 words)
    
    User message: "${message}"`;

        const result = await callGemini(prompt);
        res.json({ reply: result });
    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
