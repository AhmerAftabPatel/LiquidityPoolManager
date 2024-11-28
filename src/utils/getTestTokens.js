import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// ES module configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Network and contract configurations
const NETWORKS = {
    AVALANCHE_TESTNET: {
        chainId: '43113',
        name: 'Avalanche Fuji Testnet',
        rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
        blockExplorer: 'https://testnet.snowtrace.io'
    }
};

const ADDRESSES = {
    TRADER_JOE: {
        ROUTER: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
        JOE_TOKEN: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    }
};

async function getTestTokens() {
    try {
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }

        // Connect to provider
        const provider = new ethers.providers.JsonRpcProvider(NETWORKS.AVALANCHE_TESTNET.rpcUrl);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        console.log('\nWallet Address:', wallet.address);
        console.log('Network:', NETWORKS.AVALANCHE_TESTNET.name);

        // Check initial balance
        const initialBalance = await provider.getBalance(wallet.address);
        console.log('\nInitial AVAX Balance:', ethers.utils.formatEther(initialBalance));

        // Get test AVAX from faucet
        console.log('\nRequesting test AVAX from faucet...');
        const faucetResponse = await fetch('https://faucet.avax-test.network/api/v1/drip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: wallet.address,
            }),
        });

        if (!faucetResponse.ok) {
            throw new Error(`Faucet request failed: ${faucetResponse.statusText}`);
        }

        console.log('Faucet request successful. Waiting for AVAX...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        // Check new balance
        const newBalance = await provider.getBalance(wallet.address);
        console.log('New AVAX Balance:', ethers.utils.formatEther(newBalance));

        // Get test JOE tokens
        console.log('\nMinting test JOE tokens...');
        const joeTokenABI = [
            "function mint(address to, uint256 amount) external",
            "function balanceOf(address account) external view returns (uint256)"
        ];

        const joeToken = new ethers.Contract(
            ADDRESSES.TRADER_JOE.JOE_TOKEN,
            joeTokenABI,
            wallet
        );

        // Mint test JOE tokens
        try {
            const mintTx = await joeToken.mint(
                wallet.address,
                ethers.utils.parseEther('1000')
            );
            console.log('Minting transaction hash:', mintTx.hash);
            await mintTx.wait();
            
            // Check JOE balance
            const joeBalance = await joeToken.balanceOf(wallet.address);
            console.log('JOE Token Balance:', ethers.utils.formatEther(joeBalance));
        } catch (error) {
            console.error('Error minting JOE tokens:', error.message);
        }

        console.log('\nTest token setup complete!');
        console.log('View wallet on explorer:', `${NETWORKS.AVALANCHE_TESTNET.blockExplorer}/address/${wallet.address}`);

    } catch (error) {
        console.error('\nError:', error.message);
        process.exit(1);
    }
}

// Run the script
getTestTokens();
