# Trader Joe V2.1 Liquidity Management

Automated liquidity management script for Trader Joe V2.1 (LB) pools on Avalanche.

## Overview

This script automates the process of managing liquidity positions in Trader Joe V2.1 Liquidity Book (LB) pools. It supports:
- Adding liquidity with uniform distribution across multiple bins
- Removing liquidity from all active positions
- Automatic token approvals and gas management

## Prerequisites

- Node.js v16+
- npm or yarn
- An Avalanche C-Chain wallet with:
  - JOE tokens
  - AVAX for gas and liquidity
  - Private key access

## Core Features
- Add liquidity with uniform distribution across multiple bins
- Remove liquidity from all active positions
- Automatic token approvals and gas management
- Comprehensive error handling and logging

## Installation

1. Clone the repository:
2. Install dependencies:
3. Configure environment:
4. Edit `.env` with your values:

## Configuration

### Environment Variables
- `PRIVATE_KEY`: Your wallet's private key
- `RPC_URL`: Avalanche C-Chain RPC URL
- `MIN_AVAX_FOR_GAS`: Minimum AVAX to keep for gas fees

## Core Functions

### 1. Add Liquidity

 **Purpose**: Adds liquidity to multiple bins around a target price point
- **Process**:
  1. Checks token balances (JOE and AVAX)
  2. Approves tokens if needed
  3. Calculates uniform distribution across bins
  4. Submits transaction to add liquidity
- **Parameters**:
  - `targetBin`: Central bin ID for liquidity distribution
  - Distribution Range: ±10 bins by default

### 2. Remove Liquidity
- **Purpose**: Removes liquidity from all active bins
- **Process**:
  1. Uses `balanceOfBatch` to efficiently check all bins
  2. Removes liquidity from all non-zero balance positions
  3. Executes in a single transaction

## How It Works

### Bin System
- Each bin represents a price range
- Bin step (default: 20) determines price increment between bins
- Liquidity is distributed across multiple bins for better trading efficiency

### Distribution Strategy
- Uses uniform distribution across multiple bins
- Helps reduce impermanent loss
- Improves trading opportunities

### Transaction Flow
1. **Approval Phase**
   - Check and approve JOE tokens
   - Check and approve WAVAX tokens
   - Only approves if current allowance is insufficient

2. **Execution Phase**
   - Calculate optimal distribution
   - Submit transaction with appropriate gas settings
   - Wait for confirmation

3. **Monitoring**
   - Logs transaction submission
   - Confirms transaction success
   - Reports gas usage and final status

## Error Handling
- Checks for insufficient balances
- Validates network connection
- Handles transaction failures
- Provides detailed error logging

## Gas Management
- Dynamically calculates gas based on number of bins
- Reserves minimum AVAX for gas fees
- Adjusts gas limit based on operation complexity

## Best Practices
1. Always maintain sufficient AVAX for gas
2. Monitor transaction logs for success/failure
3. Check balances before operations
4. Use appropriate slippage tolerance


## Troubleshooting
- Check wallet balance for sufficient funds
- Verify network connection and RPC URL
- Ensure proper token approvals
- Monitor gas prices during high network activity

