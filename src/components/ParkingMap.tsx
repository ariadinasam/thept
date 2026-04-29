import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { getMapboxToken } from "@/server/config.functions";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  available: number;
  price: number;
}

interface Props {
  markers: MapMarker[];
  center?: [number, number];
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function ParkingMap({ markers, center, onMarkerClick, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getMapboxToken().then(({ token }) => {
      if (!token) setError("Token do Mapbox não configurado.");
      else setToken(token);
    }).catch(() => setError("Falha ao carregar mapa."));
  }, []);

  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center ?? [-46.6500, -23.5630],
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [token, center]);

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
      el.onclick = () => onMarkerClick?.(m.id);
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
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [markers, onMarkerClick, center]);

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-surface text-sm text-muted-foreground ${className}`}>
        {error}
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-2xl shadow-elegant ${className}`} />;
}
