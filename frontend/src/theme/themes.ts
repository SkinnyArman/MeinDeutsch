export type ThemeKey = "default" | "forest" | "sunset" | "ocean" | "white";

export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  swatch: [string, string, string];
  tokens: {
    bg: string;
    panel: string;
    panelSoft: string;
    line: string;
    text: string;
    muted: string;
    accent: string;
    accentStrong: string;
    accentContrast: string;
    surfaceShadow: string;
    bgGradientA: string;
    bgGradientB: string;
    bgGradientBase: string;
  };
}

export const THEME_STORAGE_KEY = "meindeutsch_theme";

export const THEMES: ThemeDefinition[] = [
  {
    key: "default",
    label: "Default",
    swatch: ["#111319", "#1a1f28", "#22d3ee"],
    tokens: {
      bg: "#020617",
      panel: "#111319",
      panelSoft: "#1a1f28",
      line: "#323b4a",
      text: "#e7edf7",
      muted: "#9aa6ba",
      accent: "#22d3ee",
      accentStrong: "#06b6d4",
      accentContrast: "#0e2933",
      surfaceShadow: "none",
      bgGradientA: "color-mix(in srgb, var(--accent) 22%, transparent)",
      bgGradientB: "color-mix(in srgb, var(--accent) 12%, transparent)",
      bgGradientBase: "var(--bg)"
    }
  },
  {
    key: "forest",
    label: "Forest",
    swatch: ["#10231b", "#1e3a2d", "#34d399"],
    tokens: {
      bg: "#08130f",
      panel: "#10231b",
      panelSoft: "#142d22",
      line: "#2d4a3c",
      text: "#ddeee3",
      muted: "#92b5a1",
      accent: "#34d399",
      accentStrong: "#10b981",
      accentContrast: "#052e1f",
      surfaceShadow: "none",
      bgGradientA: "color-mix(in srgb, var(--accent) 22%, transparent)",
      bgGradientB: "color-mix(in srgb, var(--accent) 12%, transparent)",
      bgGradientBase: "var(--bg)"
    }
  },
  {
    key: "sunset",
    label: "Sunset",
    swatch: ["#2a1510", "#4a251c", "#f97316"],
    tokens: {
      bg: "#1a0d0a",
      panel: "#2a1510",
      panelSoft: "#341a13",
      line: "#5b2f26",
      text: "#fbe8dd",
      muted: "#d3aa97",
      accent: "#f97316",
      accentStrong: "#ea580c",
      accentContrast: "#431407",
      surfaceShadow: "none",
      bgGradientA: "color-mix(in srgb, var(--accent) 22%, transparent)",
      bgGradientB: "color-mix(in srgb, var(--accent) 12%, transparent)",
      bgGradientBase: "var(--bg)"
    }
  },
  {
    key: "ocean",
    label: "Ocean",
    swatch: ["#0a2740", "#113858", "#60a5fa"],
    tokens: {
      bg: "#04111f",
      panel: "#0a2740",
      panelSoft: "#113858",
      line: "#2b5a83",
      text: "#dcedff",
      muted: "#90b6dd",
      accent: "#60a5fa",
      accentStrong: "#3b82f6",
      accentContrast: "#0b1f3b",
      surfaceShadow: "none",
      bgGradientA: "color-mix(in srgb, var(--accent) 22%, transparent)",
      bgGradientB: "color-mix(in srgb, var(--accent) 12%, transparent)",
      bgGradientBase: "var(--bg)"
    }
  },
  {
    key: "white",
    label: "White",
    swatch: ["#ffffff", "#e2e8f0", "#2563eb"],
    tokens: {
      bg: "#f7f9ff",
      panel: "#ffffff",
      panelSoft: "#f8fbff",
      line: "#d8e2f0",
      text: "#10213b",
      muted: "#556987",
      accent: "#2563eb",
      accentStrong: "#1d4ed8",
      accentContrast: "#eff6ff",
      surfaceShadow: "0 10px 26px rgba(37, 99, 235, 0.08)",
      bgGradientA: "rgba(37, 99, 235, 0.18)",
      bgGradientB: "rgba(236, 72, 153, 0.16)",
      bgGradientBase: "linear-gradient(180deg, #fefeff 0%, #f4f8ff 42%, #eef4ff 100%)"
    }
  }
];

export const THEME_MAP: Record<ThemeKey, ThemeDefinition> = THEMES.reduce(
  (acc, theme) => {
    acc[theme.key] = theme;
    return acc;
  },
  {} as Record<ThemeKey, ThemeDefinition>
);

export const applyThemeTokens = (theme: ThemeDefinition): void => {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.tokens.bg);
  root.style.setProperty("--panel", theme.tokens.panel);
  root.style.setProperty("--panel-soft", theme.tokens.panelSoft);
  root.style.setProperty("--line", theme.tokens.line);
  root.style.setProperty("--text", theme.tokens.text);
  root.style.setProperty("--muted", theme.tokens.muted);
  root.style.setProperty("--accent", theme.tokens.accent);
  root.style.setProperty("--accent-strong", theme.tokens.accentStrong);
  root.style.setProperty("--accent-contrast", theme.tokens.accentContrast);
  root.style.setProperty("--surface-shadow", theme.tokens.surfaceShadow);
  root.style.setProperty("--bg-gradient-a", theme.tokens.bgGradientA);
  root.style.setProperty("--bg-gradient-b", theme.tokens.bgGradientB);
  root.style.setProperty("--bg-gradient-base", theme.tokens.bgGradientBase);
  root.setAttribute("data-theme", theme.key);
};
