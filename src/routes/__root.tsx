import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

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
      { title: "THEPT" },
      { name: "description", content: "Tem Vaga Lá? – A solução inteligente para você nunca mais perder tempo procurando estacionamento. Localize vagas em tempo real e reserve seu lugar com apenas al" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "THEPT" },
      { property: "og:description", content: "Tem Vaga Lá? – A solução inteligente para você nunca mais perder tempo procurando estacionamento. Localize vagas em tempo real e reserve seu lugar com apenas al" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "THEPT" },
      { name: "twitter:description", content: "Tem Vaga Lá? – A solução inteligente para você nunca mais perder tempo procurando estacionamento. Localize vagas em tempo real e reserve seu lugar com apenas al" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8fb83c4f-547f-43cd-ae32-9efd7905dc1c/id-preview-79ad1af8--721965ad-06d7-4bec-95a7-8b65c81686ae.lovable.app-1777425076766.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8fb83c4f-547f-43cd-ae32-9efd7905dc1c/id-preview-79ad1af8--721965ad-06d7-4bec-95a7-8b65c81686ae.lovable.app-1777425076766.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
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
  return <Outlet />;
}
