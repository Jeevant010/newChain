import { ethers } from "hardhat";
import walletService from "./walletService";

async function listAccounts() {
  console.log("\n📋 Available Hardhat Accounts:\n");
  const signers = await ethers.getSigners();

  for (let i = 0; i < signers.length; i++) {
    const address = await signers[i].getAddress();
    const balance = await ethers.provider.getBalance(address);
    console.log(`  [${i}] ${address}`);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "list":
      await listAccounts();
      break;

    case "login":
      const accountIndex = parseInt(args[1] || "0", 10);
      await walletService.login(accountIndex);
      break;

    case "logout":
      walletService.logout();
      break;

    case "status":
      const session = walletService.getSession();
      if (session?.isLoggedIn) {
        const balance = await walletService.getBalance();
        console.log("\n🔐 Wallet Status: LOGGED IN");
        console.log(`   Address: ${session.address}`);
        console.log(`   Balance: ${balance} ETH`);
        console.log(
          `   Connected: ${new Date(session.connectedAt).toLocaleString()}`,
        );
      } else {
        console.log("\n🔓 Wallet Status: NOT LOGGED IN");
      }
      break;

    default:
      console.log(`
Wallet Management Commands:
  npx hardhat run scripts/wallet.ts --network localhost list     - List all accounts
  npx hardhat run scripts/wallet.ts --network localhost login 0  - Login with account index
  npx hardhat run scripts/wallet.ts --network localhost logout   - Logout current wallet
  npx hardhat run scripts/wallet.ts --network localhost status   - Check login status
      `);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
