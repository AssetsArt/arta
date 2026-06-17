import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The dark-chrome palette (shadcn "zinc dark"). `accent` is the one themeable
// value. We expose it both as a JS object (for inline-styled chrome that needs
// dynamic alpha tints) and as the --color-accent CSS var (so Tailwind's accent
// utility classes track the picker too).
export interface DarkTokens {
  bg: string;
  panel: string;
  card: string;
  panel2: string;
  border: string;
  borderSoft: string;
  text: string;
  dim: string;
  faint: string;
  accent: string;
  green: string;
  amber: string;
  red: string;
  yellow: string;
}

export interface LightTokens {
  bg: string;
  fg: string;
  mutedFg: string;
  faint: string;
  border: string;
  muted: string;
  primary: string;
  primaryFg: string;
}

export const LIGHT: LightTokens = {
  bg: "#ffffff",
  fg: "#09090b",
  mutedFg: "#71717a",
  faint: "#a1a1aa",
  border: "#e4e4e7",
  muted: "#f4f4f5",
  primary: "#18181b",
  primaryFg: "#fafafa",
};

export function darkTokens(accent: string): DarkTokens {
  return {
    bg: "#09090b",
    panel: "#0c0c0e",
    card: "#131316",
    panel2: "#1c1c20",
    border: "#27272a",
    borderSoft: "#1f1f23",
    text: "#fafafa",
    dim: "#a1a1aa",
    faint: "#71717a",
    accent,
    green: "#34d399",
    amber: "#fbbf24",
    red: "#f87171",
    yellow: "#facc15",
  };
}

export const ACCENT_PRESETS = ["#38bdf8", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];
export const MONO = "var(--font-mono)";
export const SANS = "var(--font-sans)";

interface ThemeCtx {
  c: DarkTokens;
  l: LightTokens;
  accent: string;
  grid: boolean;
  setAccent: (a: string) => void;
  setGrid: (g: boolean) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState(ACCENT_PRESETS[0]);
  const [grid, setGrid] = useState(true);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accent);
  }, [accent]);

  const value = useMemo<ThemeCtx>(
    () => ({ c: darkTokens(accent), l: LIGHT, accent, grid, setAccent, setGrid }),
    [accent, grid]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
