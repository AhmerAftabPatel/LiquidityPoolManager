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




