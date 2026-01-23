import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import {
  LandMetadata,
  uploadMetadataToIPFS,
  getPlaceholderImage,
} from "./pinataService";
import governmentData from "./governmentLandData.json";

interface GovLand {
  surveyNumber: string;
  location: string;
  district: string;
  state: string;
  area: string;
  landType: string;
  price: string;
  description: string;
  coordinates: { lat: number; lng: number };
}

// Check if IPFS upload is enabled
const USE_IPFS =
  process.env.PINATA_JWT && process.env.PINATA_JWT !== "your_pinata_jwt_here"
    ? true
    : false;

async function createLandMetadata(land: GovLand): Promise<LandMetadata> {
  return {
    name: `Government Land - ${land.surveyNumber}`,
    description: land.description,
    image: getPlaceholderImage(land.landType),
    attributes: [
      { trait_type: "Survey Number", value: land.surveyNumber },
      { trait_type: "District", value: land.district },
      { trait_type: "State", value: land.state },
      { trait_type: "Area", value: land.area },
      { trait_type: "Land Type", value: land.landType },
      { trait_type: "Price (ETH)", value: parseFloat(land.price) },
      { trait_type: "Owner", value: "Government of India" },
    ],
    properties: {
      location: land.location,
      area: land.area,
      surveyNumber: land.surveyNumber,
      district: land.district,
      state: land.state,
      owner: "Government of India",
      landType: land.landType,
      coordinates: land.coordinates,
    },
  };
}

async function main() {
  console.log("🚀 Deploying Contract with Government Lands...");
  console.log(`📡 Network: ${network.name}`);
  console.log(
    `📁 IPFS Upload: ${USE_IPFS ? "Enabled" : "Disabled (using mock URIs)"}`,
  );

  // Get deployer (Government account)
  const [government] = await ethers.getSigners();
  if (!government) {
    throw new Error("No deployer account found");
  }
  console.log(`🏛️ Government Account: ${government.address}`);

  // 1. Deploy Contract
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();

  const deployTx = landRegistry.deploymentTransaction();
  if (deployTx) {
    console.log(`⏳ Waiting for deployment: ${deployTx.hash}`);
    await deployTx.wait(1);
  }

  await landRegistry.waitForDeployment();
  const contractAddress = await landRegistry.getAddress();
  console.log(`✅ LandRegistry deployed to: ${contractAddress}`);

  // 2. Register Government Lands
  console.log("\n🏛️ Registering Government Lands...\n");

  const lands = governmentData.governmentLands as GovLand[];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < lands.length; i++) {
    const land = lands[i];
    try {
      console.log(
        `[${i + 1}/${lands.length}] Registering ${land.surveyNumber} - ${
          land.district
        }, ${land.state}...`,
      );

      let tokenURI: string;

      if (USE_IPFS) {
        // Upload metadata to IPFS
        const metadata = await createLandMetadata(land);
        tokenURI = await uploadMetadataToIPFS(metadata);
      } else {
        // Use mock URI for local testing
        tokenURI = `https://land-registry.gov.in/metadata/${land.surveyNumber}`;
      }

      const priceInWei = ethers.parseEther(land.price);
      const tx = await landRegistry.registerLand(
        land.location,
        priceInWei,
        tokenURI,
      );
      await tx.wait();

      console.log(`   ✅ Registered: Token ID ${i}, Price: ${land.price} ETH`);
      successCount++;

      // Small delay to avoid rate limiting
      if (USE_IPFS) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`   ❌ Failed to register ${land.surveyNumber}:`, error);
      failCount++;
    }
  }

  console.log(`\n📊 Registration Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);

  // 3. Save Config to Frontend
  const configDir = path.resolve(__dirname, "../client/src/utils");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, "contractConfig.json");
  const configData = {
    address: contractAddress,
    network: network.name,
    chainId: network.config.chainId,
    abi: JSON.parse(landRegistry.interface.formatJson()),
    governmentAddress: government.address,
    deployedAt: new Date().toISOString(),
    totalLands: successCount,
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log(`\n📁 Config saved to: ${configPath}`);

  // 4. Save land data for frontend reference
  const landDataPath = path.join(configDir, "landData.json");
  fs.writeFileSync(landDataPath, JSON.stringify(governmentData, null, 2));
  console.log(`📁 Land data saved to: ${landDataPath}`);

  console.log(`\n🎉 Deployment complete!`);
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Government: ${government.address}`);
  console.log(`   Total Lands: ${successCount}`);

  return contractAddress;
}

main()
  .then((address) => {
    console.log(`\n✅ All done! Contract: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });
