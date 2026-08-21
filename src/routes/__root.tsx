import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import ssnLogo from "@/assets/ssn-logo.png.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Page not found</h2>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-foreground">Something went wrong</h1>
        <button onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SSN Live" },
      { name: "description", content: "SSN Live — real-time high school football stats, rosters, and game archive from the Sabercat Sports Network." },
      { property: "og:title", content: "SSN Live" },
      { property: "og:description", content: "Live football coverage from Sabercat Sports Network." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: ssnLogo.url },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // Defer so we never run router/auth work inside the auth callback (avoids supabase auth lock deadlock)
      setTimeout(() => {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={ssnLogo.url} alt="SSN" className="h-10 w-10 object-contain drop-shadow-[0_0_8px_oklch(0.62_0.18_145_/_0.4)]" />
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide">SSN <span className="text-primary">Live</span></div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sabercat Sports Network</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 font-display text-sm">
          {[
            { to: "/", label: "Home" },
            { to: "/articles", label: "Articles" },
            { to: "/sports", label: "Sports" },
            { to: "/watch", label: "Watch" },
          ].map((l) => (
            <Link key={l.to} to={l.to}
              className="px-3 py-2 rounded-md text-foreground/80 hover:text-primary hover:bg-secondary transition-colors duration-200"
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "px-3 py-2 rounded-md text-primary bg-secondary" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  const navigate = useNavigate();
  const clicks = useRef<number[]>([]);

  // Hidden staff access: click the small "·" five times within 3 seconds to reach /auth.
  function onSecretClick() {
    const now = Date.now();
    clicks.current = [...clicks.current, now].filter((t) => now - t < 3000);
    if (clicks.current.length >= 5) {
      clicks.current = [];
      navigate({ to: "/auth" });
    }
  }

  return (
    <footer className="border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        <div className="font-display text-sm text-foreground tracking-widest">SSN LIVE</div>
        <div className="mt-2">
          Sabercat Sports Network
          <span
            onClick={onSecretClick}
            aria-hidden="true"
            className="mx-2 cursor-default select-none opacity-40 hover:opacity-60"
          >
            ·
          </span>
          Live high school football coverage
        </div>
      </div>
    </footer>
  );
}
