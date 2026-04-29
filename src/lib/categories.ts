import { Building2, Hospital, Utensils, Music, Stethoscope, ParkingSquare, Landmark, ShoppingBag, type LucideIcon } from "lucide-react";

export const CATEGORIES: Record<string, { label: string; icon: LucideIcon }> = {
  shopping: { label: "Shopping", icon: ShoppingBag },
  hospital: { label: "Hospital", icon: Hospital },
  clinic: { label: "Clínica", icon: Stethoscope },
  restaurant: { label: "Restaurante", icon: Utensils },
  entertainment: { label: "Entretenimento", icon: Music },
  parking: { label: "Estacionamento", icon: ParkingSquare },
  landmark: { label: "Atração", icon: Landmark },
  default: { label: "Local", icon: Building2 },
};

export function getCategory(key: string) {
  return CATEGORIES[key] ?? CATEGORIES.default;
}

export function availabilityStatus(available: number, total: number) {
  if (available === 0) return { label: "Lotado", tone: "destructive" as const };
  const ratio = available / total;
  if (ratio < 0.15) return { label: "Quase lotado", tone: "warning" as const };
  return { label: "Disponível", tone: "success" as const };
}
