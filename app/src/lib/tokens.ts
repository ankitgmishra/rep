/**
 * Cadra Design System Tokens
 * Leonardo da Vinci-inspired design tokens: architectural, minimalist, pristine white, black ink.
 */

export const tokens = {
  colors: {
    background: {
      base: "#ffffff",
      surface: "#ffffff",
      surfaceSubtle: "#fafaf9",
      surfaceRaised: "#f4f4f2",
      border: "#e5e3dd",
      borderStrong: "#111111",
    },
    text: {
      primary: "#111111",
      secondary: "#404040",
      muted: "#737373",
      faint: "#a3a3a3",
      inverse: "#ffffff",
    },
    brand: {
      primary: "#111111",
      primaryHover: "#262626",
      accent: "#171717",
    },
    status: {
      success: "#15803d",
      warning: "#b45309",
      danger: "#b91c1c",
      info: "#0369a1",
    },
  },
  radius: {
    none: "rounded-none",
    sm: "rounded-sm", // 2px
    md: "rounded", // 4px
    lg: "rounded-md", // 6px
  },
} as const;

export type DesignTokens = typeof tokens;
