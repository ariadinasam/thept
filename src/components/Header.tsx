import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, User, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <MapPin className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">THEPT</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }} activeOptions={{ exact: true }}>
            Buscar
          </Link>
          <Link to="/partners" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
            Parceiros
          </Link>
          {user && (
            <Link to="/wallet" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
              Carteira
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/wallet" })} className="hidden sm:inline-flex">
                <Wallet className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/profile" })}>
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => nav({ to: "/auth" })} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
