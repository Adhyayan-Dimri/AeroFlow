import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { X, MapPin, Compass, Navigation, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const AIRPORT_COORDS = [28.5562, 77.1000];

export default function LocationMap({ userCoords, showRoute = false, onClose }) {
  const [mapCenter, setMapCenter] = useState(AIRPORT_COORDS);
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (userCoords && isClient) {
      const parts = userCoords.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setMapCenter([parts[0], parts[1]]);
      }
    }
  }, [userCoords, isClient]);

  if (!userCoords || !isClient) return null;

  const parts = userCoords.split(",").map(Number);
  const userLat = !isNaN(parts[0]) ? parts[0] : 28.6139;
  const userLng = !isNaN(parts[1]) ? parts[1] : 77.2090;
  const routePositions = [[userLat, userLng], AIRPORT_COORDS];

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="map-expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-md relative isolate z-0"
          >
            {}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <span>Live Route: User Location → IGI Airport T3</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
                className="px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Minimize route map"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Close Map</span>
              </button>
            </div>

            {}
            <div style={{ height: "240px" }} className="w-full relative">
              <MapContainer
                center={mapCenter}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
                attributionControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[userLat, userLng]}>
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className="text-slate-900 font-bold block">📍 Your Location</strong>
                      <span className="text-slate-600">{userCoords}</span>
                    </div>
                  </Popup>
                </Marker>

                <Polyline
                  positions={routePositions}
                  pathOptions={{ color: "#06B6D4", weight: 4, opacity: 0.85, dashArray: "6, 6" }}
                />

                <Marker position={AIRPORT_COORDS}>
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className="text-slate-900 font-bold block">✈️ IGI Airport Terminal 3</strong>
                      <span className="text-slate-600">New Delhi, Delhi 110037</span>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="map-collapsed"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between p-2.5 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-800 dark:text-cyan-300 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-medium">GPS Location Active ({userCoords})</span>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-200 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Compass className="w-3.5 h-3.5" /> Show Airport Route Map
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
