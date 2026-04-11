/**
 * Prediction Service for Health Simulator
 * Handles trend calculation and future forecasting
 */

const calculateTrend = (logs, field) => {
    if (logs.length < 2) return 0;
    
    // Get first and last log values
    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    
    let firstVal, lastVal;
    
    if (field === 'bp') {
        firstVal = (firstLog.bp.systolic + firstLog.bp.diastolic) / 2;
        lastVal = (lastLog.bp.systolic + lastLog.bp.diastolic) / 2;
    } else {
        firstVal = firstLog[field];
        lastVal = lastLog[field];
    }
    
    const days = Math.max(1, (new Date(lastLog.date) - new Date(firstLog.date)) / (1000 * 60 * 60 * 24));
    return (lastVal - firstVal) / days;
};

const getRiskScore = (bp, sugar, sleep) => {
    const bpRiskVal = (bp.systolic / 120) + (bp.diastolic / 80);
    const diabetesRiskVal = sugar / 140;
    const fatigueRiskVal = 8 - sleep;

    const getStatus = (val, thresholdLow, thresholdHigh) => {
        if (val < thresholdLow) return 'Low';
        if (val < thresholdHigh) return 'Moderate';
        return 'High';
    };

    return {
        bpRisk: getStatus(bpRiskVal, 2.1, 2.4),
        diabetesRisk: getStatus(diabetesRiskVal, 0.9, 1.2),
        fatigueRisk: getStatus(fatigueRiskVal, 1, 3)
    };
};

const generateSuggestions = (risks, bp, sugar, sleep) => {
    const suggestions = [];
    if (risks.bpRisk !== 'Low' || bp.systolic > 130) suggestions.push("Reduce salt intake and monitor BP daily.");
    if (risks.diabetesRisk !== 'Low' || sugar > 140) suggestions.push("Reduce sugar intake and processed carbs.");
    if (risks.fatigueRisk !== 'Low' || sleep < 7) suggestions.push("Aim for 7-8 hours of quality sleep.");
    if (bp.systolic > 140 || sugar > 180) suggestions.push("Schedule a follow-up consultation soon.");
    
    if (suggestions.length === 0) suggestions.push("Maintain your current healthy lifestyle!");
    
    return suggestions;
};

const generateExplanation = (risks, trends, mode = 'current') => {
    if (mode === 'improved') {
        let solution = "The improved path shows the power of preventive care. ";
        const improvements = [];
        if (trends.bp > 0) improvements.push("Stabilizing BP via reduced sodium");
        if (trends.sugar > 0) improvements.push("Regulating sugar levels via diet");
        if (trends.sleep < 0) improvements.push("Recovering health via 8+ hours of sleep");
        
        if (improvements.length > 0) {
            solution += `By ${improvements.join(' and ')}, the patient reaches a safer metabolic zone. `;
        } else {
            solution += "Continued adherence to these healthy habits maintains a low-risk profile. ";
        }
        solution += "This scenario represents the 'Target Zone' for best long-term outcomes.";
        return solution;
    }

    let explanation = "Clinical Analysis: Based on recent trends, ";
    const concerns = [];
    
    if (trends.bp > 0) concerns.push("blood pressure is increasing");
    if (trends.sugar > 0) concerns.push("blood sugar levels are rising");
    if (trends.sleep < 0) concerns.push("sleep duration is declining");
    
    if (concerns.length > 0) {
        explanation += `the patient's ${concerns.join(' and ')}. `;
    } else {
        explanation += "the patient's vitals are currently stable. ";
    }
    
    if (risks.bpRisk === 'High' || risks.diabetesRisk === 'High' || risks.fatigueRisk === 'High') {
        explanation += "Current lifestyle trajectory leads to High Risk zones. Medical intervention or lifestyle correction is advised.";
    } else {
        explanation += "The patient is currently in a safe zone, but monitoring is recommended.";
    }
    
    return explanation;
};

const mapRecordsToLogs = (records) => {
    const virtualLogs = [];
    
    records.forEach(record => {
        if (!record.aiParsedData || !record.aiParsedData.keyMetrics) return;
        
        const logEntry = {
            date: record.uploadedAt,
            bp: { systolic: null, diastolic: null },
            sugar: null,
            sleepHours: null,
            source: 'record',
            recordTitle: record.title
        };

        record.aiParsedData.keyMetrics.forEach(metric => {
            const name = metric.name.toLowerCase();
            const val = parseFloat(metric.value);
            if (isNaN(val)) return;

            if (name.includes('blood sugar') || name.includes('glucose')) {
                logEntry.sugar = val;
            } else if (name.includes('systolic')) {
                logEntry.bp.systolic = val;
            } else if (name.includes('diastolic')) {
                logEntry.bp.diastolic = val;
            } else if (name.includes('sleep') || name.includes('fatigue')) {
                logEntry.sleepHours = val;
            }
        });

        // Only add if at least one relevant metric was found
        if (logEntry.sugar || logEntry.bp.systolic || logEntry.bp.diastolic || logEntry.sleepHours) {
            virtualLogs.push(logEntry);
        }
    });

    return virtualLogs;
};

const predictHealth = (logs, days, mode = 'current', healthRecords = []) => {
    // Map records to logs and merge
    const virtualLogs = mapRecordsToLogs(healthRecords);
    const combinedLogs = [...logs, ...virtualLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (combinedLogs.length === 0) return { timeline: [], risks: {}, suggestions: [], explanation: "No data available" };

    const lastLog = combinedLogs[combinedLogs.length - 1];
    
    // Trends using combined data
    const trends = {
        bp: calculateTrend(combinedLogs, 'bp'),
        sugar: calculateTrend(combinedLogs, 'sugar'),
        sleep: calculateTrend(combinedLogs, 'sleepHours')
    };

    const timeline = [];
    
    // Ensure we have baseline values even if missing from last log
    const baseBP = {
        systolic: lastLog.bp?.systolic || 120,
        diastolic: lastLog.bp?.diastolic || 80
    };
    const baseSugar = lastLog.sugar || 100;
    const baseSleep = lastLog.sleepHours || 7;

    for (let i = 1; i <= days; i += 5) {
        let predBP = {
            systolic: Math.round(baseBP.systolic + (trends.bp * i)),
            diastolic: Math.round(baseBP.diastolic + (trends.bp * 0.7 * i))
        };
        let predSugar = Math.round(baseSugar + (trends.sugar * i));
        let predSleep = Math.max(4, Math.min(10, baseSleep + (trends.sleep * i)));

        if (mode === 'improved') {
            predBP.systolic = Math.round(predBP.systolic * 0.9);
            predBP.diastolic = Math.round(predBP.diastolic * 0.9);
            predSugar = Math.round(predSugar * 0.85);
            predSleep = Math.min(8, predSleep + 1);
        }

        timeline.push({
            day: i,
            bp: predBP.systolic,
            bpDiastolic: predBP.diastolic,
            sugar: predSugar,
            sleep: Math.round(predSleep * 10) / 10
        });
    }

    const finalDay = timeline[timeline.length - 1];
    const risks = getRiskScore(
        { systolic: finalDay.bp, diastolic: finalDay.bpDiastolic },
        finalDay.sugar,
        finalDay.sleep
    );

    return {
        timeline,
        risks,
        suggestions: generateSuggestions(risks, { systolic: finalDay.bp }, finalDay.sugar, finalDay.sleep),
        explanation: generateExplanation(risks, trends, mode),
        integratedRecords: virtualLogs.map(v => v.recordTitle)
    };
};

module.exports = {
    predictHealth
};
