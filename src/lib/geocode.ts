// Geocoding helpers — supports CEP (ViaCEP) and free-text via Mapbox.

import { getMapboxToken } from "@/server/config.functions";

export interface GeocodeResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const CEP_REGEX = /^\d{5}-?\d{3}$/;

export function isCep(input: string) {
  return CEP_REGEX.test(input.trim());
}

let _token: string | null = null;
async function token() {
  if (_token) return _token;
  const { token: t } = await getMapboxToken();
  _token = t;
  return t;
}

export async function geocodeCep(cep: string): Promise<GeocodeResult | null> {
  const clean = cep.replace(/\D/g, "");
  const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!r.ok) return null;
  const j = await r.json();
  if (j.erro) return null;
  const address = `${j.logradouro || ""}${j.bairro ? ", " + j.bairro : ""}, ${j.localidade} - ${j.uf}, ${clean.slice(0, 5)}-${clean.slice(5)}`;
  // Use Mapbox to get lat/lng for the CEP-derived address
  const t = await token();
  if (!t) return { name: address, address, latitude: 0, longitude: 0 };
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${t}&country=BR&limit=1`;
  const g = await fetch(url);
  const gj = await g.json();
  const f = gj.features?.[0];
  if (!f) return { name: address, address, latitude: 0, longitude: 0 };
  return { name: address, address, latitude: f.center[1], longitude: f.center[0] };
}

export async function geocodeText(text: string): Promise<GeocodeResult[]> {
  const t = await token();
  if (!t) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${t}&country=BR&limit=5&language=pt`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.features ?? []).map((f: any) => ({
    name: f.text,
    address: f.place_name,
    latitude: f.center[1],
    longitude: f.center[0],
  }));
}

export function gpsLinks(lat: number, lng: number, label?: string) {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return {
    waze: `https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes&zoom=17`,
    gmaps: `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}&destination_place_id=${q}`,
    gmapsSearch: `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`,
  };
}
