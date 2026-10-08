const { ethers } = require('ethers');

// Polygon Amoy RPC URL
const RPC_URL = "https://rpc-amoy.polygon.technology/";

// ABI for the smart contract
const ABI = [
    "function addRecord(string memory _recordHash) public"
];

/**
 * Anchor a record hash to the Polygon Amoy blockchain.
 * 
 * @param {string} recordHash The hash of the record to anchor
 * @returns {Promise<string|null>} The transaction hash if successful, or null if failed
 */
async function anchorRecord(recordHash) {
    try {
        console.log('[DEBUG] anchorRecord started');
        console.log('[DEBUG] recordHash:', recordHash);
        
        const privateKey = process.env.PRIVATE_KEY;
        const contractAddress = process.env.CONTRACT_ADDRESS;

        if (!privateKey || !contractAddress) {
            console.error('Error: Missing PRIVATE_KEY or CONTRACT_ADDRESS in environment variables.');
            return null;
        }

        const maskedKey = privateKey.length > 8 ? `${privateKey.substring(0, 4)}...${privateKey.substring(privateKey.length - 4)}` : '***';
        console.log('[DEBUG] Environment Vars check:');
        console.log('[DEBUG] PRIVATE_KEY (masked):', maskedKey);
        console.log('[DEBUG] CONTRACT_ADDRESS:', contractAddress);

        // 1. Connect provider using JsonRpcProvider
        console.log('[DEBUG] Connecting to provider...');
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // 2. Create wallet using PRIVATE_KEY
        console.log('[DEBUG] Initializing wallet...');
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('[DEBUG] Wallet Address derived:', wallet.address);

        // 3. Create contract instance using CONTRACT_ADDRESS and ABI
        console.log('[DEBUG] Initializing contract at:', contractAddress);
        const contract = new ethers.Contract(contractAddress, ABI, wallet);

        // 4. Call contract.addRecord(recordHash)
        console.log('[DEBUG] Sending transaction to contract...');
        const tx = await contract.addRecord(recordHash);
        console.log('[DEBUG] Transaction sent, hash:', tx.hash);

        // 5. Wait for transaction confirmation
        console.log('[DEBUG] Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('[DEBUG] Transaction confirmed in block:', receipt.blockNumber);

        // 6. Return transaction hash
        return receipt.hash;
    } catch (error) {
        console.error('[DEBUG] Error anchoring record to blockchain:', error);
        return null;
    }
}

module.exports = {
    anchorRecord
};
