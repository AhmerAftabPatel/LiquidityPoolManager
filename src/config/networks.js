/**
 * Network configurations
 */
export const NETWORKS = {
    AVALANCHE_TESTNET: {
        chainId: '43113',
        name: 'Avalanche Fuji Testnet',
        currency: 'AVAX',
        rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
        blockExplorer: 'https://testnet.snowtrace.io',
        params: {
            chainId: '43113',
            chainName: 'Avalanche Fuji Testnet',
            nativeCurrency: {
                name: 'Avalanche',
                symbol: 'AVAX',
                decimals: 18
            },
            rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://testnet.snowtrace.io/']
        }
    }
};
