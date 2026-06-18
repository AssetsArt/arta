import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The viewer chrome palette — a Vercel "Geist" design system. The whole UI is
// driven by these tokens, in both dark (default) and light mode. `accent` is the
// one freely themeable value; it's exposed both as a JS object (for inline-styled
// chrome that needs dynamic alpha tints) and as the --color-accent CSS var (so
// Tailwind's accent utility classes track the picker too).
//
// Field names are kept stable across the codebase: the original `bg/panel/card/
// panel2/border/text/dim/faint/...` set maps onto Geist's bg / elevations / fg
// ramp, and the newer `bgElev2/border2/borderStrong/accent2/accentSoft/invBg/
// invFg/...` fields expose the rest of the Geist scale for components that want it.
export type Mode = "dark" | "light";

export interface DarkTokens {
  // surfaces
  bg: string;
  panel: string; // = bg-elev
  card: string; // = bg-elev-2
  panel2: string; // = bg-hover
  bgElev: string;
  bgElev2: string;
  bgHover: string;
  // borders
  border: string;
  borderSoft: string;
  border2: string;
  borderStrong: string;
  // foreground ramp
  text: string; // = fg
  dim: string; // = fg-2
  faint: string; // = fg-3
  // accent
  accent: string;
  accent2: string;
  accentSoft: string;
  // inverted (primary buttons, logo, done-step)
  invBg: string;
  invFg: string;
  // semantic
  green: string;
  amber: string;
  red: string;
  yellow: string;
  blue: string;
  purple: string;
  teal: string;
  // misc
  shadow: string;
  gridDot: string;
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

// The prototype always renders inside a real device frame on a white "screen",
// independent of the viewer's own theme — these tokens style that device shell.
export const LIGHT: LightTokens = {
  bg: "#ffffff",
  fg: "#171717",
  mutedFg: "#5f5f5f",
  faint: "#969696",
  border: "#ebebeb",
  muted: "#fafafa",
  primary: "#171717",
  primaryFg: "#ffffff",
};

const DARK = (accent: string): DarkTokens => ({
  bg: "#000000",
  panel: "#0a0a0a",
  card: "#141414",
  panel2: "#1c1c1c",
  bgElev: "#0a0a0a",
  bgElev2: "#141414",
  bgHover: "#1c1c1c",
  border: "#242424",
  borderSoft: "#1c1c1c",
  border2: "#2e2e2e",
  borderStrong: "#3a3a3a",
  text: "#ededed",
  dim: "#a0a0a0",
  faint: "#6e6e6e",
  accent,
  accent2: "#52a8ff",
  accentSoft: "rgba(0,112,243,.14)",
  invBg: "#ededed",
  invFg: "#000000",
  green: "#5bbb6e",
  amber: "#f5b14c",
  red: "#ff5f56",
  yellow: "#f5b14c",
  blue: "#52a8ff",
  purple: "#c08cf0",
  teal: "#3ad0c0",
  shadow: "0 1px 2px rgba(0,0,0,.6),0 8px 24px rgba(0,0,0,.45)",
  gridDot: "rgba(255,255,255,.035)",
});

const LIGHTC = (accent: string): DarkTokens => ({
  bg: "#ffffff",
  panel: "#ffffff",
  card: "#fafafa",
  panel2: "#f4f4f4",
  bgElev: "#ffffff",
  bgElev2: "#fafafa",
  bgHover: "#f4f4f4",
  border: "#ebebeb",
  borderSoft: "#f0f0f0",
  border2: "#e2e2e2",
  borderStrong: "#d4d4d4",
  text: "#171717",
  dim: "#5f5f5f",
  faint: "#969696",
  accent,
  accent2: "#0060d8",
  accentSoft: "rgba(0,112,243,.08)",
  invBg: "#171717",
  invFg: "#ffffff",
  green: "#1a8a3a",
  amber: "#c77b00",
  red: "#d93934",
  yellow: "#c77b00",
  blue: "#0070f3",
  purple: "#8a4cc0",
  teal: "#0d9488",
  shadow: "0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.08)",
  gridDot: "rgba(0,0,0,.04)",
});

export function tokens(mode: Mode, accent: string): DarkTokens {
  return mode === "light" ? LIGHTC(accent) : DARK(accent);
}

// Kept for any caller that still wants the dark set directly.
export function darkTokens(accent: string): DarkTokens {
  return DARK(accent);
}

export const ACCENT_PRESETS = ["#0070f3", "#7c5cff", "#34d399", "#fb923c", "#f472b6"];
export const MONO = "var(--font-mono)";
export const SANS = "var(--font-sans)";

interface ThemeCtx {
  c: DarkTokens;
  l: LightTokens;
  mode: Mode;
  accent: string;
  grid: boolean;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setAccent: (a: string) => void;
  setGrid: (g: boolean) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const readMode = (): Mode => {
  if (typeof localStorage === "undefined") return "dark";
  return localStorage.getItem("hs-mode") === "light" ? "light" : "dark";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState(ACCENT_PRESETS[0]);
  const [grid, setGrid] = useState(true);
  const [mode, setModeState] = useState<Mode>(readMode);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem("hs-mode", m);
    } catch {
      /* ignore */
    }
  };
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accent);
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo<ThemeCtx>(
    () => ({ c: tokens(mode, accent), l: LIGHT, mode, accent, grid, setMode, toggleMode, setAccent, setGrid }),
    [mode, accent, grid]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
