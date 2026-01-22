import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying Contract...");
  console.log(`📡 Network: ${network.name}`);

  // Validate we have signers
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account found");
  }
  console.log(`📝 Deploying with account: ${deployer.address}`);

  // 1. Deploy
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();

  // Wait for deployment with timeout
  const deployTx = landRegistry.deploymentTransaction();
  if (deployTx) {
    console.log(`⏳ Waiting for deployment transaction: ${deployTx.hash}`);
    await deployTx.wait(1); // Wait for 1 confirmation
  }

  await landRegistry.waitForDeployment();
  const address = await landRegistry.getAddress();

  if (!address || address === ethers.ZeroAddress) {
    throw new Error("Contract deployment failed - invalid address");
  }

  console.log(`✅ LandRegistry deployed to: ${address}`);

  // 2. Save Config to Frontend
  try {
    const configDir = path.resolve(__dirname, "../client/src/utils");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, "contractConfig.json");
    const configData = {
      address: address,
      network: network.name,
      chainId: network.config.chainId,
      abi: JSON.parse(landRegistry.interface.formatJson()),
      deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log(`📁 Config saved to: ${configPath}`);
  } catch (fileError) {
    console.warn("⚠️ Failed to save config file:", fileError);
    // Don't throw - deployment succeeded, config save is secondary
  }

  // 3. Seed Data (Only for Localhost)
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("🌱 Seeding dummy lands...");
    try {
      const tx1 = await landRegistry.registerLand(
        "Plot 101, City Center",
        ethers.parseEther("1.5"),
        "ipfs://test1",
      );
      await tx1.wait();

      const tx2 = await landRegistry.registerLand(
        "Plot 202, Riverside",
        ethers.parseEther("3.0"),
        "ipfs://test2",
      );
      await tx2.wait();

      console.log("🌱 Seeding complete!");
    } catch (seedError) {
      console.error("❌ Seeding failed:", seedError);
      // Don't throw - deployment succeeded, seeding is optional
    }
  }

  return address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment successful! Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });
