"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

export interface Land {
  id: bigint;
  location: string;
  price: bigint;
  isForSale: boolean;
  seller: string;
  coordinates?: [number, number];
}

interface MapProps {
  lands: Land[];
  onBuyLand: (id: bigint) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isRegistering?: boolean;
  selectedCoords?: [number, number] | null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function Map({
  lands,
  onBuyLand,
  onMapClick,
  isRegistering,
  selectedCoords,
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[500px] bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-gray-500">Loading map...</span>
      </div>
    );
  }

  // Parse location string to get coordinates
  const parseCoordinates = (location: string): [number, number] | null => {
    try {
      const match = location.match(/Lat:\s*([\d.-]+),\s*Lng:\s*([\d.-]+)/);
      if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatPrice = (price: bigint): string => {
    return (Number(price) / 1e18).toFixed(4);
  };

  return (
    <MapContainer
      center={[20.5937, 78.9629]} // Center of India
      zoom={5}
      className="w-full h-[500px] rounded-lg shadow-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />

      {/* Show existing lands */}
      {lands.map((land) => {
        const coords = parseCoordinates(land.location);
        if (!coords) return null;

        return (
          <Marker key={land.id.toString()} position={coords}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">
                  Land #{land.id.toString()}
                </h3>
                <p className="text-sm text-gray-600 mb-1">📍 {land.location}</p>
                <p className="text-sm font-semibold mb-2">
                  💰 {formatPrice(land.price)} ETH
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Owner: {land.seller.slice(0, 6)}...{land.seller.slice(-4)}
                </p>
                {land.isForSale ? (
                  <button
                    onClick={() => onBuyLand(land.id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Buy Land
                  </button>
                ) : (
                  <span className="block text-center text-gray-500 text-sm py-2">
                    Not for sale
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Show selected coordinates when registering */}
      {isRegistering && selectedCoords && (
        <Marker position={selectedCoords}>
          <Popup>
            <div className="p-2">
              <p className="font-semibold">New Land Location</p>
              <p className="text-sm text-gray-600">
                Lat: {selectedCoords[0].toFixed(4)}, Lng:{" "}
                {selectedCoords[1].toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
