export type ThemeKey = "default" | "forest" | "sunset" | "ocean" | "white" | "brown";

export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  swatch: [string, string, string];
  tokens: {
    bg: string;
    contentBg: string;
    sidebarBg: string;
    sidebarText: string;
    sidebarMuted: string;
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
      bg: "#edf3fb",
      contentBg: "#f7faff",
      sidebarBg: "#1a2434",
      sidebarText: "#e6edf9",
      sidebarMuted: "#a6b5cc",
      panel: "#ffffff",
      panelSoft: "#f2f6fd",
      line: "#d8e2ef",
      text: "#1d2a3c",
      muted: "#65758c",
      accent: "#3b82f6",
      accentStrong: "#2563eb",
      accentContrast: "#eaf2ff",
      surfaceShadow: "0 10px 20px rgba(15, 23, 42, 0.06)",
      bgGradientA: "rgba(59, 130, 246, 0.09)",
      bgGradientB: "rgba(14, 165, 233, 0.07)",
      bgGradientBase: "linear-gradient(180deg, #f4f8ff 0%, #edf3fb 100%)"
    }
  },
  {
    key: "forest",
    label: "Forest",
    swatch: ["#10231b", "#1e3a2d", "#34d399"],
    tokens: {
      bg: "#edf7f1",
      contentBg: "#f8fcf9",
      sidebarBg: "#1f3328",
      sidebarText: "#e6f2ea",
      sidebarMuted: "#abc3b4",
      panel: "#ffffff",
      panelSoft: "#f2f9f4",
      line: "#d5e8dc",
      text: "#1f3127",
      muted: "#627c6c",
      accent: "#2f8f60",
      accentStrong: "#22724b",
      accentContrast: "#e7f8ef",
      surfaceShadow: "0 10px 20px rgba(16, 54, 35, 0.06)",
      bgGradientA: "rgba(47, 143, 96, 0.1)",
      bgGradientB: "rgba(134, 239, 172, 0.08)",
      bgGradientBase: "linear-gradient(180deg, #f6fcf8 0%, #edf7f1 100%)"
    }
  },
  {
    key: "sunset",
    label: "Sunset",
    swatch: ["#2a1510", "#4a251c", "#f97316"],
    tokens: {
      bg: "#fdf2ea",
      contentBg: "#fff8f3",
      sidebarBg: "#3c251a",
      sidebarText: "#f6e9df",
      sidebarMuted: "#d4b6a2",
      panel: "#fffdfb",
      panelSoft: "#fdf1e8",
      line: "#eed8ca",
      text: "#3b2a20",
      muted: "#8a6a58",
      accent: "#c56d3c",
      accentStrong: "#a9562c",
      accentContrast: "#fff0e8",
      surfaceShadow: "0 10px 20px rgba(94, 44, 20, 0.08)",
      bgGradientA: "rgba(197, 109, 60, 0.11)",
      bgGradientB: "rgba(251, 191, 36, 0.08)",
      bgGradientBase: "linear-gradient(180deg, #fff8f3 0%, #fdf2ea 100%)"
    }
  },
  {
    key: "ocean",
    label: "Ocean",
    swatch: ["#0a2740", "#113858", "#60a5fa"],
    tokens: {
      bg: "#edf6ff",
      contentBg: "#f7fbff",
      sidebarBg: "#1f344a",
      sidebarText: "#e3eefb",
      sidebarMuted: "#aac0d8",
      panel: "#ffffff",
      panelSoft: "#f1f7fd",
      line: "#d5e4f1",
      text: "#1b3148",
      muted: "#607b95",
      accent: "#3f83c3",
      accentStrong: "#2f679a",
      accentContrast: "#e8f4ff",
      surfaceShadow: "0 10px 20px rgba(19, 63, 97, 0.07)",
      bgGradientA: "rgba(63, 131, 195, 0.1)",
      bgGradientB: "rgba(125, 211, 252, 0.08)",
      bgGradientBase: "linear-gradient(180deg, #f8fcff 0%, #edf6ff 100%)"
    }
  },
  {
    key: "white",
    label: "White",
    swatch: ["#ffffff", "#e2e8f0", "#2563eb"],
    tokens: {
      bg: "#f8fafc",
      contentBg: "#ffffff",
      sidebarBg: "#edf2f8",
      sidebarText: "#0f172a",
      sidebarMuted: "#64748b",
      panel: "#ffffff",
      panelSoft: "#f7fafc",
      line: "#e2e8f0",
      text: "#0f172a",
      muted: "#64748b",
      accent: "#2563eb",
      accentStrong: "#1d4ed8",
      accentContrast: "#eff6ff",
      surfaceShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
      bgGradientA: "rgba(148, 163, 184, 0.12)",
      bgGradientB: "rgba(226, 232, 240, 0.2)",
      bgGradientBase: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
    }
  },
  {
    key: "brown",
    label: "Brown",
    swatch: ["#20130f", "#38231b", "#d48b4e"],
    tokens: {
      bg: "#f9f1ea",
      contentBg: "#fffaf6",
      sidebarBg: "#3a2419",
      sidebarText: "#f7ece5",
      sidebarMuted: "#d4b19f",
      panel: "#fffdfb",
      panelSoft: "#f8eee7",
      line: "#e6d4c6",
      text: "#3d2b22",
      muted: "#8f6f5d",
      accent: "#d48b4e",
      accentStrong: "#bf6d33",
      accentContrast: "#fff2e8",
      surfaceShadow: "0 10px 20px rgba(115, 74, 51, 0.07)",
      bgGradientA: "rgba(212, 139, 78, 0.12)",
      bgGradientB: "rgba(191, 109, 51, 0.07)",
      bgGradientBase: "linear-gradient(180deg, #fffaf6 0%, #f9f1ea 100%)"
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
  root.style.setProperty("--content-bg", theme.tokens.contentBg);
  root.style.setProperty("--sidebar-bg", theme.tokens.sidebarBg);
  root.style.setProperty("--sidebar-text", theme.tokens.sidebarText);
  root.style.setProperty("--sidebar-muted", theme.tokens.sidebarMuted);
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
