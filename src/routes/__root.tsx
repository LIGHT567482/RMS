import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/lib/auth";
import {
  useStore,
  getSchool,
  defaultSchool,
  getTheme,
  setTheme,
  ensureInitialized,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
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
      { title: "Report Management System (RMS)" },
      {
        name: "description",
        content: "Offline report management system for school report cards. Staff use only.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap",
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
  const school = useStore(getSchool);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Initialize storage with default subjects and school info on first load
    ensureInitialized();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const storedTheme = getTheme();
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme ?? (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const vars: Array<[string, string | undefined]> = [
      ["--primary", school.primaryColor || defaultSchool.primaryColor],
      ["--secondary", school.secondaryColor || defaultSchool.secondaryColor],
      ["--accent", school.accentColor || defaultSchool.accentColor],
    ];

    if (theme === "light") {
      vars.push(["--background", school.backgroundColor || defaultSchool.backgroundColor]);
      vars.push(["--foreground", school.foregroundColor || defaultSchool.foregroundColor]);
    } else {
      if (school.backgroundColorDark) {
        vars.push(["--background", school.backgroundColorDark]);
      }
      if (school.foregroundColorDark) {
        vars.push(["--foreground", school.foregroundColorDark]);
      }
    }

    vars.forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });

    if (school.primaryColor && school.accentColor) {
      root.style.setProperty(
        "--gradient-hero",
        `linear-gradient(135deg, ${school.primaryColor} 0%, ${school.accentColor} 50%, ${school.primaryColor} 100%)`,
      );
    }

    document.title = school.name
      ? `Report Management System (RMS) — ${school.name}`
      : "Report Management System (RMS)";
  }, [school]);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
          <Button
            size="icon"
            variant="ghost"
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setThemeState(theme === "dark" ? "light" : "dark")}
            className={
              theme === "dark"
                ? "bg-white text-slate-900 shadow-lg shadow-black/10 border border-slate-200/80 hover:bg-slate-100"
                : "bg-slate-900 text-white shadow-lg shadow-slate-900/20 border border-slate-700/80 hover:bg-slate-800"
            }
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <Outlet />
        <Toaster />
      </div>
    </AuthProvider>
  );
}
