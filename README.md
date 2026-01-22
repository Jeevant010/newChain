# Land Registry Blockchain Project

## Quick Start

### 1. Install Dependencies

```bash
cd c:\Desktop\newChain
npm install
```

### 2. Compile Smart Contracts

```bash
npx hardhat compile
```

### 3. Start Local Blockchain Node

Open a terminal and run:

```bash
npx hardhat node
```

Keep this terminal open! You'll see 20 test accounts with 10000 ETH each.

### 4. Deploy Contract (New Terminal)

Open a NEW terminal and run:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

### 5. Start Frontend (if exists)

```bash
cd client
npm install
npm run dev
```

## Test Accounts (Localhost)

When you run `npx hardhat node`, you get these test accounts:

- Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

## Useful Commands

```bash
npx hardhat compile      # Compile contracts
npx hardhat test         # Run tests
npx hardhat node         # Start local blockchain
npx hardhat clean        # Clear cache
```
