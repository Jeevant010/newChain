"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import contractConfig from "../utils/contractConfig.json";

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-gray-500">Loading map...</span>
    </div>
  ),
});

interface Land {
  id: bigint;
  location: string;
  price: bigint;
  isForSale: boolean;
  seller: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: unknown[]) => void,
      ) => void;
    };
  }
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [lands, setLands] = useState<Land[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(
    null,
  );
  const [newLandPrice, setNewLandPrice] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const showNotification = useCallback(
    (message: string, type: "success" | "error") => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 5000);
    },
    [],
  );

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setContract(null);
    setProvider(null);
    setLands([]);
    setShowAccountMenu(false);
    showNotification("Wallet disconnected", "success");
  }, [showNotification]);

  const switchToHardhatNetwork = useCallback(async () => {
    if (!window.ethereum) return false;

    const hardhatChainId = "0x7A69"; // 31337 in hex

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hardhatChainId }],
      });
      return true;
    } catch (switchError: unknown) {
      // Chain not added, add it
      if ((switchError as { code: number }).code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hardhatChainId,
                chainName: "Hardhat Local",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: ["http://127.0.0.1:8545"],
                blockExplorerUrls: [],
              },
            ],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      showNotification("Please install MetaMask!", "error");
      return;
    }

    try {
      setIsLoading(true);
      setTransactionStatus("Switching to Hardhat network...");

      // Switch to Hardhat network first
      const switched = await switchToHardhatNetwork();
      if (!switched) {
        showNotification(
          "Please switch to Hardhat Local network (Chain ID: 31337)",
          "error",
        );
        setIsLoading(false);
        setTransactionStatus("");
        return;
      }

      setTransactionStatus("Connecting to wallet...");
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setProvider(browserProvider);

        const signer = await browserProvider.getSigner();
        const landContract = new Contract(
          contractConfig.address,
          contractConfig.abi,
          signer,
        );
        setContract(landContract);
        showNotification("Wallet connected successfully!", "success");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      showNotification("Failed to connect wallet", "error");
    } finally {
      setIsLoading(false);
      setTransactionStatus("");
    }
  }, [showNotification, switchToHardhatNetwork]);

  const switchAccount = async () => {
    if (!window.ethereum) return;

    try {
      setShowAccountMenu(false);
      // Request MetaMask to show account selection
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      // After permission granted, get the new account
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];

      if (accounts.length > 0 && accounts[0] !== account) {
        await connectWallet();
      }
    } catch (error) {
      console.error("Error switching account:", error);
      showNotification("Failed to switch account", "error");
    }
  };

  const fetchLands = useCallback(async () => {
    if (!contract) return;

    try {
      const allLands = await contract.getAllLands();
      const formattedLands: Land[] = allLands.map((land: Land) => ({
        id: land.id,
        location: land.location,
        price: land.price,
        isForSale: land.isForSale,
        seller: land.seller,
      }));
      setLands(formattedLands);
    } catch (error) {
      console.error("Error fetching lands:", error);
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      fetchLands();
    }
  }, [contract, fetchLands]);

  useEffect(() => {
    // Check if already connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = (await window.ethereum.request({
            method: "eth_accounts",
          })) as string[];
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };
    checkConnection();
  }, [connectWallet]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accountList[0] !== account) {
        // Account changed
        setAccount(accountList[0]);
        if (window.ethereum) {
          const browserProvider = new BrowserProvider(window.ethereum);
          setProvider(browserProvider);
          const signer = await browserProvider.getSigner();
          const landContract = new Contract(
            contractConfig.address,
            contractConfig.abi,
            signer,
          );
          setContract(landContract);
          showNotification(
            `Switched to ${accountList[0].slice(0, 6)}...${accountList[0].slice(
              -4,
            )}`,
            "success",
          );
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [account, disconnectWallet, showNotification]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isRegistering) {
      setSelectedCoords([lat, lng]);
    }
  };

  const registerLand = async () => {
    if (!contract || !selectedCoords || !newLandPrice) {
      showNotification("Please select location and enter price", "error");
      return;
    }

    try {
      setIsLoading(true);
      setTransactionStatus("Preparing transaction...");
      const location = `Lat: ${selectedCoords[0].toFixed(
        4,
      )}, Lng: ${selectedCoords[1].toFixed(4)}`;
      const priceInWei = parseEther(newLandPrice);
      const tokenURI = `https://example.com/land/${Date.now()}`;

      setTransactionStatus("Please confirm in MetaMask...");
      const tx = await contract.registerLand(location, priceInWei, tokenURI);
      setTransactionStatus(
        "Transaction submitted. Waiting for confirmation...",
      );
      await tx.wait();

      showNotification("Land registered successfully!", "success");
      setIsRegistering(false);
      setSelectedCoords(null);
      setNewLandPrice("");
      await fetchLands();
    } catch (error) {
      console.error("Error registering land:", error);
      showNotification("Failed to register land", "error");
    } finally {
      setIsLoading(false);
      setTransactionStatus("");
    }
  };

  const buyLand = async (landId: bigint) => {
    if (!contract) return;

    const land = lands.find((l) => l.id === landId);
    if (!land) return;

    try {
      setIsLoading(true);
      setTransactionStatus("Please confirm purchase in MetaMask...");
      const tx = await contract.buyLand(landId, { value: land.price });
      setTransactionStatus(
        "Transaction submitted. Waiting for confirmation...",
      );
      await tx.wait();

      showNotification("Land purchased successfully!", "success");
      await fetchLands();
    } catch (error: unknown) {
      console.error("Error buying land:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("You already own this")) {
        showNotification("You already own this land!", "error");
      } else {
        showNotification("Failed to purchase land", "error");
      }
    } finally {
      setIsLoading(false);
      setTransactionStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏠</span>
            <h1 className="text-2xl font-bold text-gray-800">Land Registry</h1>
          </div>

          {account ? (
            <div className="flex items-center gap-4">
              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {account.slice(0, 6)}...{account.slice(-4)}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={switchAccount}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      Switch Account
                    </button>
                    <button
                      onClick={disconnectWallet}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRegistering
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                {isRegistering ? "Cancel" : "Register Land"}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Registration Panel */}
        {isRegistering && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Register New Land
            </h2>
            <p className="text-gray-600 mb-4">
              Click on the map to select a location, then enter the price.
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Location
                </label>
                <input
                  title="Selected Location"
                  type="text"
                  readOnly
                  value={
                    selectedCoords
                      ? `Lat: ${selectedCoords[0].toFixed(
                          4,
                        )}, Lng: ${selectedCoords[1].toFixed(4)}`
                      : "Click on map to select"
                  }
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 w-64"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newLandPrice}
                  onChange={(e) => setNewLandPrice(e.target.value)}
                  placeholder="0.1"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-40"
                />
              </div>
              <button
                onClick={registerLand}
                disabled={isLoading || !selectedCoords || !newLandPrice}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Registering..." : "Register Land"}
              </button>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <Map
            lands={lands}
            onBuyLand={buyLand}
            onMapClick={handleMapClick}
            isRegistering={isRegistering}
            selectedCoords={selectedCoords}
          />
        </div>

        {/* Land Listings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Available Lands ({lands.filter((l) => l.isForSale).length})
          </h2>
          {lands.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {account
                ? "No lands registered yet. Be the first to register!"
                : "Connect your wallet to view and interact with lands."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lands.map((land) => (
                <div
                  key={land.id.toString()}
                  className={`border rounded-lg p-4 ${
                    land.isForSale
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">
                      Land #{land.id.toString()}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        land.isForSale
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {land.isForSale ? "For Sale" : "Sold"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    📍 {land.location}
                  </p>
                  <p className="text-lg font-semibold text-indigo-600 mb-2">
                    💰 {formatEther(land.price)} ETH
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Owner: {land.seller.slice(0, 6)}...{land.seller.slice(-4)}
                  </p>
                  {land.isForSale &&
                    account &&
                    land.seller.toLowerCase() !== account.toLowerCase() && (
                      <button
                        onClick={() => buyLand(land.id)}
                        disabled={isLoading}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "Processing..." : "Buy Now"}
                      </button>
                    )}
                  {land.seller.toLowerCase() === account?.toLowerCase() && (
                    <span className="block text-center text-indigo-600 font-medium py-2">
                      You own this land
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Land Registry DApp - Built with Next.js, Solidity & Hardhat</p>
          <p className="mt-1">
            Contract: {contractConfig.address.slice(0, 10)}...
            {contractConfig.address.slice(-8)}
          </p>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center min-w-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-gray-600 text-center">
              {transactionStatus || "Processing..."}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Please do not close this window
            </p>
          </div>
        </div>
      )}

      {/* Click outside to close account menu */}
      {showAccountMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </div>
  );
}
