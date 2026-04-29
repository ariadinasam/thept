import { Link } from "@tanstack/react-router";
import { Instagram, Mail, Handshake, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <MapPin className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold">THEPT</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              There's parking there? Encontre vagas de estacionamento perto de você em segundos.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conecte-se</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/partner" className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                  <Handshake className="h-4 w-4" /> Seja parceiro
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                  <Mail className="h-4 w-4" /> Entre em contato
                </Link>
              </li>
              <li>
                <a
                  href="https://instagram.com/thept"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Navegação</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/" className="text-foreground transition-colors hover:text-primary">Buscar vagas</Link></li>
              <li><Link to="/partners" className="text-foreground transition-colors hover:text-primary">Parceiros</Link></li>
              <li><Link to="/saved" className="text-foreground transition-colors hover:text-primary">Locais salvos</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} THEPT — Todos os direitos reservados a <span className="font-medium text-foreground">Ariadina</span>.
        </div>
      </div>
    </footer>
  );
}
