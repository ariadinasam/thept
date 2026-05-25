import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "THEPT — Reserva de estacionamento em tempo real" },
      { name: "description", content: "Encontre e reserve vagas de estacionamento em Fortaleza-CE em tempo real. Pague pela carteira e navegue direto pelo Waze ou Google Maps." },
      { name: "author", content: "THEPT" },
      { property: "og:title", content: "THEPT — Encontre e reserve seu estacionamento" },
      { property: "og:description", content: "Vagas em tempo real em Fortaleza-CE. Reserve, pague e siga." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "THEPT" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "THEPT — Encontre e reserve seu estacionamento" },
      { name: "twitter:description", content: "Vagas em tempo real em Fortaleza-CE. Reserve, pague e siga." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "THEPT",
          url: "https://thept.lovable.app",
          description: "Reserva de estacionamento em tempo real em Fortaleza-CE.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://thept.lovable.app/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </AuthProvider>
  );
}
