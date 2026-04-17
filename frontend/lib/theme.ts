/**
 * Design token reference — JEE College Find.
 *
 * ## Next.js equivalent of React Native's Context API for theming
 *
 * In React Native you create a ThemeContext that passes colors/fonts down the tree.
 * Here the same job is split across three layers that already exist in this project:
 *
 * | React Native               | This project                                    |
 * |----------------------------|-------------------------------------------------|
 * | `theme.ts` colors object   | CSS custom properties in `app/globals.css`      |
 * | `ThemeContext.Provider`     | `<ThemeProvider>` in `app/layout.tsx`           |
 * | `useContext(ThemeContext)`  | `useTheme()` from `next-themes`                 |
 * | `style={{ color: colors.primary }}` | `className="text-primary"` (Tailwind)  |
 *
 * CSS variables cascade automatically — you never need to manually thread
 * theme values through props. Tailwind classes like `bg-primary` / `text-foreground`
 * reference those variables and update instantly when `.dark` is toggled.
 *
 * ### Reading the current theme in a component
 * ```tsx
 * "use client"
 * import { useTheme } from "next-themes"
 *
 * export function MyComponent() {
 *   const { theme, setTheme, resolvedTheme } = useTheme()
 *   // resolvedTheme is "light" | "dark" (resolves "system" to the actual value)
 * }
 * ```
 *
 * This file provides TypeScript constants for the few places that need
 * programmatic token access (e.g. choosing a CSS class name at runtime).
 */

// ---------------------------------------------------------------------------
// Chance badge classes
// Defined with full dark-mode support in app/globals.css under @layer components.
// ---------------------------------------------------------------------------

export const chanceBadge = {
  high: "chance-high",
  medium: "chance-medium",
  low: "chance-low",
} as const

export type ChanceLevel = keyof typeof chanceBadge

// ---------------------------------------------------------------------------
// Semantic CSS variable names (for reference / tooling)
// ---------------------------------------------------------------------------

/** All CSS variable names used in globals.css */
export const cssVars = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  radius: "--radius",
} as const
