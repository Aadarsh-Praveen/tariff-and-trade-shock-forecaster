/**
 * Shared theme color tokens for inline styles.
 * These reference CSS variables defined in globals.css,
 * which automatically switch between dark and light themes.
 * 
 * USE THESE when you need inline `style={}` props.
 * USE TAILWIND CLASSES when possible (text-foreground, bg-card, etc.)
 * 
 * The globals.css fix means Tailwind classes now work natively:
 *   text-foreground → resolves to hsl(270 27% 93%) in dark, hsl(220 43% 4%) in light
 *   bg-card → resolves correctly in both themes
 *   text-t1, text-t2, bg-coral-soft, etc. → all work
 * 
 * Only use these `c` tokens for inline styles on elements where
 * Tailwind classes get overridden (e.g., Recharts, native <input>, etc.)
 */

export const c = {
  // Text hierarchy — maps to Tailwind: text-t1, text-t2, text-t3, text-t4
  t1: 'hsl(var(--foreground))',
  t2: 'color-mix(in srgb, hsl(var(--foreground)) 65%, transparent)',
  t3: 'hsl(var(--muted-foreground))',
  t4: 'color-mix(in srgb, hsl(var(--muted-foreground)) 50%, transparent)',

  // Surfaces — maps to Tailwind: bg-background, bg-card, bg-secondary, bg-input
  pageBg: 'hsl(var(--background))',
  cardBg: 'hsl(var(--card))',
  secondary: 'hsl(var(--secondary))',
  input: 'hsl(var(--input))',

  // Borders — maps to Tailwind: border-border
  border: 'hsl(var(--border))',
  borderSubtle: 'color-mix(in srgb, hsl(var(--border)) 60%, transparent)',

  // Severity / accent colors — maps to: text-coral, text-amber, text-green, text-blue, text-purple
  coral: 'hsl(var(--risk-high))',
  amber: 'hsl(var(--risk-medium))',
  green: 'hsl(var(--risk-low))',
  blue: 'hsl(var(--risk-blue))',
  purple: 'hsl(var(--risk-purple))',
  red: 'hsl(var(--risk-high))',
  critical: 'hsl(var(--risk-critical))',

  // Severity soft backgrounds — maps to: bg-coral-soft, bg-amber-soft, etc.
  coralSoft: 'color-mix(in srgb, hsl(var(--risk-high)) 15%, transparent)',
  coralFaint: 'color-mix(in srgb, hsl(var(--risk-high)) 7%, transparent)',
  amberSoft: 'color-mix(in srgb, hsl(var(--risk-medium)) 15%, transparent)',
  amberFaint: 'color-mix(in srgb, hsl(var(--risk-medium)) 7%, transparent)',
  greenSoft: 'color-mix(in srgb, hsl(var(--risk-low)) 15%, transparent)',
  greenFaint: 'color-mix(in srgb, hsl(var(--risk-low)) 7%, transparent)',
  blueSoft: 'color-mix(in srgb, hsl(var(--risk-blue)) 15%, transparent)',
  blueFaint: 'color-mix(in srgb, hsl(var(--risk-blue)) 7%, transparent)',
  purpleSoft: 'color-mix(in srgb, hsl(var(--risk-purple)) 15%, transparent)',
  purpleFaint: 'color-mix(in srgb, hsl(var(--risk-purple)) 7%, transparent)',

  // Severity borders
  coralBorder: 'color-mix(in srgb, hsl(var(--risk-high)) 30%, transparent)',
  amberBorder: 'color-mix(in srgb, hsl(var(--risk-medium)) 30%, transparent)',
  greenBorder: 'color-mix(in srgb, hsl(var(--risk-low)) 30%, transparent)',
  blueBorder: 'color-mix(in srgb, hsl(var(--risk-blue)) 30%, transparent)',
  purpleBorder: 'color-mix(in srgb, hsl(var(--risk-purple)) 30%, transparent)',

  // Header / sidebar specific
  headerBg: 'color-mix(in srgb, hsl(var(--card)) 92%, transparent)',
  sidebarBg: 'hsl(var(--sidebar))',

  // Chart-specific (Recharts needs raw values)
  grid: 'color-mix(in srgb, hsl(var(--muted-foreground)) 15%, transparent)',
  axis: 'color-mix(in srgb, hsl(var(--muted-foreground)) 30%, transparent)',
  tick: 'color-mix(in srgb, hsl(var(--foreground)) 50%, transparent)',
  tickLabel: 'color-mix(in srgb, hsl(var(--foreground)) 65%, transparent)',
  trackBg: 'color-mix(in srgb, hsl(var(--muted-foreground)) 10%, transparent)',
} as const

// Card style shorthand for inline use
export const cardStyle = {
  backgroundColor: c.cardBg,
  border: `1px solid ${c.border}`,
} as const

// Severity color getter for dynamic use
export function getRiskColor(level: string): string {
  switch (level) {
    case 'critical':
      return c.critical
    case 'high':
      return c.coral
    case 'medium':
      return c.amber
    case 'low':
      return c.green
    default:
      return c.t2
  }
}

// Driver color by percentage
export function getDriverColor(pct: number): string {
  if (pct > 70) return c.coral
  if (pct > 50) return c.amber
  return c.blue
}

// Get severity background (soft variant)
export function getRiskBgSoft(level: string): string {
  switch (level) {
    case 'critical':
    case 'high':
      return c.coralSoft
    case 'medium':
      return c.amberSoft
    case 'low':
      return c.greenSoft
    default:
      return c.secondary
  }
}

// Get severity border
export function getRiskBorder(level: string): string {
  switch (level) {
    case 'critical':
    case 'high':
      return c.coralBorder
    case 'medium':
      return c.amberBorder
    case 'low':
      return c.greenBorder
    default:
      return c.border
  }
}
