import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { AuthProvider } from "@/lib/auth";
import {
  useStore,
  getSchool,
  defaultSchool,
  getTheme,
  setTheme,
  ensureInitialized,
} from "@/lib/storage";
import { loadBrandingIntoStorage } from "@/lib/branding";
import { Toaster } from "@/components/ui/sonner";

const ThemeContext = createContext<{
  theme: "light" | "dark";
  toggleTheme: () => void;
} | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeContext");
  }
  return context;
}

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

function logBackgroundImageApplication(theme: "light" | "dark", imageUrl: string | undefined, shouldUseImage: boolean) {
  if (typeof document === "undefined") return;
  console.log(
    `[RMS Background] theme=${theme}, shouldUseImage=${shouldUseImage}, imageUrl=${
      imageUrl ? `${imageUrl.slice(0, 100)}${imageUrl.length > 100 ? "..." : ""}` : "none"
    }`,
  );
  console.log(`[RMS Background] body.backgroundImage=${document.body.style.backgroundImage}`);
}

function RootComponent() {
  const school = useStore(getSchool);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Initialize storage with default subjects and school info on first load,
    // then apply any packaged or public branding values.
    ensureInitialized();
    loadBrandingIntoStorage().catch(() => {
      // Branding load is optional and should not block rendering.
    });
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
      vars.push(["--background", school.backgroundColorDark || defaultSchool.backgroundColorDark]);
      vars.push(["--foreground", school.foregroundColorDark || defaultSchool.foregroundColorDark]);
    }

    vars.forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });

    const lightImage = school.backgroundImageUrlLight;
    const darkImage = school.backgroundImageUrlDark;
    const useLightImage = school.useBackgroundImageLight ?? false;
    const useDarkImage = school.useBackgroundImageDark ?? false;
    const shouldUseImage = theme === "light" ? useLightImage && Boolean(lightImage) : useDarkImage && Boolean(darkImage);
    const imageUrl = theme === "light" ? lightImage : darkImage;

    const backgroundImageValue = shouldUseImage && imageUrl ? `url("${imageUrl}")` : "none";
    root.style.setProperty("--app-background-image", backgroundImageValue);
    root.style.setProperty("--app-background-size", shouldUseImage ? "cover" : "");
    root.style.setProperty("--app-background-position", shouldUseImage ? "center" : "");
    root.style.setProperty("--app-background-repeat", shouldUseImage ? "no-repeat" : "");
    root.style.setProperty("--app-background-attachment", shouldUseImage ? "fixed" : "");

    document.body.style.backgroundImage = backgroundImageValue;
    document.body.style.backgroundSize = shouldUseImage ? "cover" : "";
    document.body.style.backgroundPosition = shouldUseImage ? "center" : "";
    document.body.style.backgroundRepeat = shouldUseImage ? "no-repeat" : "";
    document.body.style.backgroundAttachment = shouldUseImage ? "fixed" : "";
    logBackgroundImageApplication(theme, imageUrl, shouldUseImage);

    if (school.primaryColor && school.accentColor) {
      root.style.setProperty(
        "--gradient-hero",
        `linear-gradient(135deg, ${school.primaryColor} 0%, ${school.accentColor} 50%, ${school.primaryColor} 100%)`,
      );
    }

    document.title = school.name
      ? `Report Management System (RMS) — ${school.name}`
      : "Report Management System (RMS)";
  }, [school, theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
      }}
    >
      <AuthProvider>
        <div className="min-h-screen">
          <Outlet />
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}
