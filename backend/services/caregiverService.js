const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const Medicine = require('../models/Medicine');
const FamilyRiskService = require('./familyRiskService');

class CaregiverService {
    /**
     * Aggregates family data purely by querying existing structures
     * without modifying schemas or breaking auth boundaries.
     */
    static async getDashboardData(ownerId) {
        // Fetch owner and strictly limit scope to familyMembers
        const owner = await User.findById(ownerId).populate('familyMembers', 'name bloodGroup age healthScore role healthId');
        
        if (!owner || !owner.familyMembers || owner.familyMembers.length === 0) {
            return { members: [] };
        }

        // Parallel processing of all family members to optimize DB queries
        const memberDashboards = await Promise.all(owner.familyMembers.map(async (member) => {
            // Safe linking: Query HealthRecords and Medicines purely by { patient: member._id }
            
            // Limit to 1 latest record
            const latestRecord = await HealthRecord.findOne({ patient: member._id })
                                                 .sort({ uploadedAt: -1 })
                                                 .lean();

            // Fetch active medicines
            const activeMedicines = await Medicine.find({ patient: member._id, isActive: true })
                                                .lean();

            // Call AI non-breaking extension
            const riskLevel = await FamilyRiskService.evaluateRisk(member, latestRecord, activeMedicines);

            return {
                _id: member._id,
                name: member.name,
                bloodGroup: member.bloodGroup,
                age: member.age,
                healthScore: member.healthScore,
                riskLevel,
                latestRecord: latestRecord || null,
                medicines: activeMedicines || []
            };
        }));

        return { members: memberDashboards };
    }
}

module.exports = CaregiverService;
