import { Link } from "@tanstack/react-router";
import { MapPin, Star, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { availabilityStatus, getCategory } from "@/lib/categories";

export interface ParkingItem {
  id: string;
  name: string;
  address: string;
  category: string;
  available_spots: number;
  total_spots: number;
  price_per_hour: number;
  has_special_spots: boolean;
  rating: number | null;
  latitude: number;
  longitude: number;
}

export function LocationCard({ item }: { item: ParkingItem }) {
  const cat = getCategory(item.category);
  const status = availabilityStatus(item.available_spots, item.total_spots);
  const Icon = cat.icon;
  const toneClass = status.tone === "destructive"
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : status.tone === "warning"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-primary/15 text-primary border-primary/30";

  return (
    <Link to="/location/$id" params={{ id: item.id }} className="group block">
      <Card className="overflow-hidden border-border/60 bg-gradient-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-glow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold">{item.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            </div>
          </div>
          {item.rating != null && (
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {item.rating}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={`border ${toneClass}`} variant="outline">
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.available_spots}/{item.total_spots} vagas
            </span>
            {item.has_special_spots && (
              <Badge variant="outline" className="border-border/60 text-xs">PCD</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold text-primary">R${item.price_per_hour}<span className="text-xs font-normal text-muted-foreground">/h</span></span>
            <Navigation className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
