import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/server/config.functions";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  available: number;
  price: number;
}

interface SearchPin {
  lat: number;
  lng: number;
  label?: string;
}

interface Props {
  markers: MapMarker[];
  center?: [number, number];
  searchPin?: SearchPin;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

// Module-scoped token cache to avoid re-fetching across instances
let tokenPromise: Promise<string> | null = null;
function fetchToken() {
  if (!tokenPromise) {
    tokenPromise = getMapboxToken().then((r) => r.token).catch(() => "");
  }
  return tokenPromise;
}

export function ParkingMap({ markers, center, searchPin, onMarkerClick, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const searchPinRef = useRef<mapboxgl.Marker | null>(null);
  const clickRef = useRef(onMarkerClick);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  clickRef.current = onMarkerClick;

  useEffect(() => {
    fetchToken().then((t) => {
      if (!t) setError("Token do Mapbox não configurado.");
      else setToken(t);
    });
  }, []);

  // Init map once
  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center ?? [-46.6500, -23.5630],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [token]);

  // Fly to new center when it changes (without re-creating the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo({ center, zoom: 14, duration: 800 });
  }, [center?.[0], center?.[1]]);

  // Search pin (where the user searched)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (searchPinRef.current) { searchPinRef.current.remove(); searchPinRef.current = null; }
    if (!searchPin) return;
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position: relative; transform: translate(-50%, -100%);">
        <div style="
          background: oklch(0.72 0.20 260);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(0,0,0,0.6);
          border: 3px solid white;
        ">
          <div style="transform: rotate(45deg); font-size: 18px;">📍</div>
        </div>
        <div style="
          position: absolute;
          top: 44px;
          left: 50%;
          transform: translateX(-50%);
          background: oklch(0.72 0.20 260);
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        ">Você buscou aqui</div>
      </div>`;
    const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([searchPin.lng, searchPin.lat])
      .setPopup(searchPin.label ? new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML(`<strong>${searchPin.label}</strong>`) : undefined)
      .addTo(map);
    searchPinRef.current = m;
  }, [searchPin?.lat, searchPin?.lng, searchPin?.label]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      const color = m.available === 0 ? "oklch(0.65 0.24 25)" : "oklch(0.82 0.22 145)";
      el.innerHTML = `
        <div style="
          background: ${color};
          color: oklch(0.14 0.01 240);
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          cursor: pointer;
          border: 2px solid oklch(0.14 0.01 240);
          white-space: nowrap;
        ">${m.available} vagas · R$${m.price}</div>`;
      el.onclick = () => clickRef.current?.(m.id);
      const marker = new mapboxgl.Marker(el)
        .setLngLat([m.lng, m.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
          `<strong>${m.name}</strong><br/><span style="opacity:0.7">${m.available} vagas disponíveis</span>`
        ))
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (markers.length > 0 && !center) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    }
  }, [markers]);

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-surface text-sm text-muted-foreground ${className}`}>
        {error}
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-2xl shadow-elegant ${className}`} />;
}
