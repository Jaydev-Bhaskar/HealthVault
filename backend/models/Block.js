/**
 * HealthVault AI — Simulated Blockchain Ledger
 * 
 * Implements a SHA-256 hash chain stored in MongoDB.
 * Every access event (grant, revoke, view, upload) is recorded as an
 * immutable block. Each block's hash is derived from the previous block's
 * hash, creating a tamper-evident audit trail.
 * 
 * This is a real chain — if any block is modified, all subsequent hashes
 * break, which can be verified by the /verify endpoint.
 */
const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    // Transaction data
    action: { 
        type: String, 
        enum: ['ACCESS_GRANTED', 'ACCESS_REVOKED', 'RECORD_VIEWED', 'RECORD_UPLOADED', 'MEDICINE_ADDED', 'EMERGENCY_ACCESS', 'GENESIS', 'ACCESS_GRANTED_QR', 'ACCESS_EDITED'],
        required: true
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    details: { type: String, default: '' },
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
    // Chain integrity
    previousHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    nonce: { type: Number, default: 0 },
    blockchainTx: { type: String, default: null }
});

module.exports = mongoose.model('Block', blockSchema);
