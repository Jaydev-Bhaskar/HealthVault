/**
 * HealthVault AI — Blockchain Service
 * 
 * Core blockchain logic: hashing, genesis block creation,
 * adding new blocks, and full-chain verification.
 */
const crypto = require('crypto');
const Block = require('../models/Block');
const { anchorRecord } = require('./anchorService');

class BlockchainService {

    /**
     * Compute SHA-256 hash of a block's data
     */
    static computeHash(index, timestamp, action, patientId, actorId, details, previousHash, nonce) {
        const data = `${index}${timestamp}${action}${patientId}${actorId}${details}${previousHash}${nonce}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Get the latest block in the chain
     */
    static async getLatestBlock() {
        const latest = await Block.findOne().sort({ index: -1 });
        if (!latest) {
            return this.createGenesisBlock();
        }
        return latest;
    }

    /**
     * Create the genesis (first) block
     */
    static async createGenesisBlock() {
        const existing = await Block.findOne({ index: 0 });
        if (existing) return existing;

        const timestamp = new Date();
        const hash = this.computeHash(0, timestamp, 'GENESIS', 'system', 'system', 'HealthVault AI Genesis Block', '0', 0);
        
        const genesis = await Block.create({
            index: 0,
            timestamp,
            action: 'GENESIS',
            details: 'HealthVault AI Genesis Block — Chain Initialized',
            previousHash: '0',
            hash,
            nonce: 0
        });
        return genesis;
    }

    /**
     * Add a new block to the chain (mine it)
     */
    static async addBlock({ action, patientId, actorId, actorRole, details, recordId }) {
        const latest = await this.getLatestBlock();
        const index = latest.index + 1;
        const timestamp = new Date();
        const previousHash = latest.hash;

        // Simple proof-of-work: find nonce where hash starts with "00"
        let nonce = 0;
        let hash = '';
        do {
            hash = this.computeHash(index, timestamp, action, patientId || '', actorId || '', details || '', previousHash, nonce);
            nonce++;
        } while (!hash.startsWith('00'));
        nonce--; // correct the last increment

        const block = await Block.create({
            index,
            timestamp,
            action,
            patientId,
            actorId,
            actorRole,
            details,
            recordId,
            previousHash,
            hash,
            nonce
        });

        // Anchor the new block hash to Polygon Amoy (non-blocking for main flow)
        anchorRecord(block.hash)
            .then(async (txHash) => {
                if (txHash) {
                    block.blockchainTx = txHash;
                    await block.save();
                }
            })
            .catch(error => {
                console.error("Failed to anchor block:", error.message);
            });

        return block;
    }

    /**
     * Verify the entire chain's integrity
     */
    static async verifyChain() {
        const blocks = await Block.find().sort({ index: 1 });
        if (blocks.length === 0) return { valid: true, blockCount: 0 };

        for (let i = 1; i < blocks.length; i++) {
            const current = blocks[i];
            const previous = blocks[i - 1];

            // Check chain linkage
            if (current.previousHash !== previous.hash) {
                return {
                    valid: false,
                    brokenAt: current.index,
                    reason: `Block ${current.index} previousHash doesn't match Block ${previous.index} hash`
                };
            }

            // Verify the block's own hash
            const recalculated = this.computeHash(
                current.index, current.timestamp, current.action,
                current.patientId || '', current.actorId || '',
                current.details || '', current.previousHash, current.nonce
            );
            if (recalculated !== current.hash) {
                return {
                    valid: false,
                    brokenAt: current.index,
                    reason: `Block ${current.index} hash has been tampered with`
                };
            }
        }

        return { valid: true, blockCount: blocks.length };
    }

    /**
     * Get recent blocks for a specific patient
     */
    static async getPatientLedger(patientId, limit = 50) {
        return Block.find({ patientId })
            .sort({ index: -1 })
            .limit(limit)
            .populate('actorId', 'name role doctorCode')
            .lean();
    }
}

module.exports = BlockchainService;
