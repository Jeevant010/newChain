import { PinataSDK } from "pinata";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize Pinata
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
});

export interface LandMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  properties: {
    location: string;
    area: string;
    surveyNumber: string;
    district: string;
    state: string;
    owner: string;
    landType: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

export async function uploadMetadataToIPFS(
  metadata: LandMetadata,
): Promise<string> {
  try {
    const result = await pinata.upload.json(metadata);
    console.log(`✅ Metadata uploaded: ipfs://${result.IpfsHash}`);
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error("❌ Error uploading to IPFS:", error);
    throw error;
  }
}

export async function uploadImageToIPFS(imagePath: string): Promise<string> {
  try {
    const file = fs.readFileSync(imagePath);
    const blob = new Blob([file]);
    const fileObj = new File([blob], path.basename(imagePath), {
      type: "image/png",
    });

    const result = await pinata.upload.file(fileObj);
    console.log(`✅ Image uploaded: ipfs://${result.IpfsHash}`);
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error("❌ Error uploading image to IPFS:", error);
    throw error;
  }
}

export async function uploadBatchMetadata(
  metadataArray: LandMetadata[],
): Promise<string[]> {
  const ipfsUris: string[] = [];

  for (const metadata of metadataArray) {
    const uri = await uploadMetadataToIPFS(metadata);
    ipfsUris.push(uri);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return ipfsUris;
}

// Helper to generate a placeholder image URL for land
export function getPlaceholderImage(landType: string): string {
  const images: Record<string, string> = {
    agricultural:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
    residential:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    commercial:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    industrial:
      "https://images.unsplash.com/photo-1565715101086-e93e60a11c6f?w=800",
    forest:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800",
    government:
      "https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800",
  };
  return images[landType] || images.government;
}

export { pinata };
