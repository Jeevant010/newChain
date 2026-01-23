import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface WalletSession {
  address: string;
  connectedAt: number;
  isLoggedIn: boolean;
}

const SESSION_FILE = path.join(__dirname, "../.wallet-session.json");

export class WalletService {
  private session: WalletSession | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const data = fs.readFileSync(SESSION_FILE, "utf8");
        this.session = JSON.parse(data);
      }
    } catch {
      this.session = null;
    }
  }

  private saveSession(): void {
    if (this.session) {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(this.session, null, 2));
    } else {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
    }
  }

  async login(accountIndex: number = 0): Promise<string> {
    const signers = await ethers.getSigners();

    if (accountIndex >= signers.length) {
      throw new Error(
        `Invalid account index. Available: 0-${signers.length - 1}`,
      );
    }

    const signer = signers[accountIndex];
    const address = await signer.getAddress();
    const balance = await ethers.provider.getBalance(address);

    this.session = {
      address,
      connectedAt: Date.now(),
      isLoggedIn: true,
    };
    this.saveSession();

    console.log("✅ Wallet Login Successful!");
    console.log(`   Address: ${address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    return address;
  }

  logout(): void {
    if (!this.session?.isLoggedIn) {
      console.log("⚠️ No wallet is currently logged in");
      return;
    }

    const address = this.session.address;
    this.session = null;
    this.saveSession();

    console.log("✅ Wallet Logout Successful!");
    console.log(`   Disconnected: ${address}`);
  }

  isLoggedIn(): boolean {
    return this.session?.isLoggedIn ?? false;
  }

  getSession(): WalletSession | null {
    return this.session;
  }

  async getBalance(): Promise<string> {
    if (!this.session?.isLoggedIn) {
      throw new Error("No wallet logged in");
    }
    const balance = await ethers.provider.getBalance(this.session.address);
    return ethers.formatEther(balance);
  }
}

export default new WalletService();
