/**
 * The Rooms - Unified Design System
 * 
 * This file contains all design tokens and base component styles
 * to ensure consistency across all portals.
 * 
 * All apps should extend from packages/ui/src/tailwind.config.ts
 * and use CSS variables from packages/ui/src/globals.css
 */

// ─── Design Tokens ─────────────────────────────────────────────────────────

/**
 * Color tokens using HSL values for CSS variable compatibility
 * Usage: background: hsl(var(--primary));
 */
export const colors = {
    // Semantic color tokens
    primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
    },
    secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
    },
    destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
    },
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",

    // UI surface colors
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
    },
    popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
    },
    muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
    },
    accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
    },

    // Border & Input
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",

    // Room status colors (should use CSS variables for dark mode)
    room: {
        vacant: "hsl(var(--room-vacant))",
        occupied: "hsl(var(--room-occupied))",
        maintenance: "hsl(var(--room-maintenance))",
        blocked: "hsl(var(--room-blocked))",
    },
} as const;

/**
 * Typography tokens
 */
export const typography = {
    fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        heading: ["DM Sans", "system-ui", "sans-serif"],
    },
    fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1.2" }],
    },
    fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
    },
} as const;

/**
 * Spacing scale (base 4px)
 */
export const spacing = {
    0: "0",
    0.5: "2px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
} as const;

/**
 * Border radius tokens
 */
export const radius = {
    none: "0",
    sm: "calc(var(--radius) - 4px)",
    DEFAULT: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    lg: "var(--radius)",
    xl: "calc(var(--radius) + 4px)",
    "2xl": "calc(var(--radius) + 8px)",
    full: "9999px",
} as const;

/**
 * Shadow tokens
 */
export const shadows = {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

// ─── Component Base Styles ────────────────────────────────────────────────

/**
 * Button component tokens
 */
export const buttonBase = {
    padding: "0.625rem 1.25rem",
    borderRadius: "var(--radius)",
    fontWeight: "500",
    fontSize: "0.875rem",
    minHeight: "44px",
    minWidth: "44px",
    transition: "all 150ms ease",
    focusRing: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const;

export const buttonSizes = {
    sm: {
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        minHeight: "36px",
        borderRadius: "calc(var(--radius) - 2px)",
    },
    default: {
        padding: "0.625rem 1.25rem",
        fontSize: "0.875rem",
        minHeight: "44px",
    },
    lg: {
        padding: "0.75rem 2rem",
        fontSize: "1rem",
        minHeight: "48px",
        borderRadius: "calc(var(--radius) + 2px)",
    },
    icon: {
        padding: "0.625rem",
        minHeight: "44px",
        minWidth: "44px",
    },
    "icon-sm": {
        padding: "0.5rem",
        minHeight: "36px",
        minWidth: "36px",
    },
} as const;

/**
 * Input component tokens
 */
export const inputBase = {
    height: "44px",
    padding: "0.625rem 1rem",
    borderRadius: "var(--radius)",
    fontSize: "1rem",
    border: "1px solid hsl(var(--input))",
    background: "hsl(var(--background))",
    focusRing: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const;

/**
 * Card component tokens
 */
export const cardBase = {
    borderRadius: "calc(var(--radius) + 4px)",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    padding: "1.5rem",
} as const;

/**
 * Badge component tokens
 */
export const badgeBase = {
    padding: "0.125rem 0.625rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    borderRadius: "9999px",
    lineHeight: "1.25rem",
} as const;

// ─── Exported CSS Variables Map ──────────────────────────────────────────

/**
 * Recommended CSS variable values for globals.css
 * These should be defined in :root and .dark selectors
 */
export const cssVariables = {
    light: {
        "--background": "0 0% 98%",
        "--foreground": "200 5% 21%",
        "--card": "0 0% 100%",
        "--card-foreground": "200 5% 21%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "200 5% 21%",
        "--primary": "200 5% 21%",
        "--primary-foreground": "40 18% 96%",
        "--secondary": "11 70% 60%",
        "--secondary-foreground": "0 0% 100%",
        "--muted": "200 6% 46%",
        "--muted-foreground": "200 6% 46%",
        "--accent": "200 10% 87%",
        "--accent-foreground": "200 5% 21%",
        "--destructive": "0 84% 60%",
        "--destructive-foreground": "0 0% 100%",
        "--success": "158 84% 38%",
        "--warning": "38 92% 50%",
        "--border": "0 0% 90%",
        "--input": "0 0% 90%",
        "--ring": "200 5% 21%",
        "--radius": "0.5rem",
        // Room status colors
        "--room-vacant": "158 84% 38%",
        "--room-occupied": "0 84% 60%",
        "--room-maintenance": "38 92% 50%",
        "--room-blocked": "200 6% 46%",
    },
    dark: {
        "--background": "220 10% 10%",
        "--foreground": "40 18% 96%",
        "--card": "220 10% 14%",
        "--card-foreground": "40 18% 96%",
        "--popover": "220 10% 14%",
        "--popover-foreground": "40 18% 96%",
        "--primary": "40 18% 96%",
        "--primary-foreground": "200 5% 21%",
        "--secondary": "11 70% 60%",
        "--secondary-foreground": "0 0% 100%",
        "--muted": "200 10% 46%",
        "--muted-foreground": "200 10% 60%",
        "--accent": "200 10% 24%",
        "--accent-foreground": "40 18% 96%",
        "--destructive": "0 62% 50%",
        "--destructive-foreground": "0 0% 100%",
        "--success": "158 84% 38%",
        "--warning": "38 92% 50%",
        "--border": "200 10% 20%",
        "--input": "200 10% 20%",
        "--ring": "40 18% 96%",
        "--radius": "0.5rem",
        // Room status colors (dark mode - slightly muted)
        "--room-vacant": "158 64% 32%",
        "--room-occupied": "0 64% 50%",
        "--room-maintenance": "38 72% 45%",
        "--room-blocked": "200 6% 56%",
    },
} as const;

// ─── Status Color Maps ────────────────────────────────────────────────────

/**
 * Booking status colors
 */
export const bookingStatusColors = {
    PENDING: { bg: "hsl(var(--warning))", text: "#ffffff", label: "Pending" },
    CONFIRMED: { bg: "hsl(var(--success))", text: "#ffffff", label: "Confirmed" },
    CHECKED_IN: { bg: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))", label: "Checked In" },
    CHECKED_OUT: { bg: "hsl(var(--muted))", text: "#ffffff", label: "Checked Out" },
    CANCELLED: { bg: "hsl(var(--destructive))", text: "#ffffff", label: "Cancelled" },
} as const;

/**
 * Room status colors
 */
export const roomStatusColors = {
    VACANT: { bg: "hsl(var(--room-vacant))", text: "#ffffff", label: "Vacant" },
    OCCUPIED: { bg: "hsl(var(--room-occupied))", text: "#ffffff", label: "Occupied" },
    MAINTENANCE: { bg: "hsl(var(--room-maintenance))", text: "#ffffff", label: "Maintenance" },
    BLOCKED: { bg: "hsl(var(--room-blocked))", text: "#ffffff", label: "Blocked" },
} as const;

/**
 * Payment status colors
 */
export const paymentStatusColors = {
    PENDING: { bg: "hsl(var(--warning))", text: "#ffffff", label: "Pending" },
    PARTIAL: { bg: "hsl(var(--secondary))", text: "#ffffff", label: "Partial" },
    PAID: { bg: "hsl(var(--success))", text: "#ffffff", label: "Paid" },
    REFUNDED: { bg: "hsl(var(--border))", text: "hsl(var(--foreground))", label: "Refunded" },
    FAILED: { bg: "hsl(var(--destructive))", text: "#ffffff", label: "Failed" },
} as const;

// ─── Animation Tokens ────────────────────────────────────────────────────

export const animations = {
    transition: {
        fast: "150ms ease",
        default: "200ms ease",
        slow: "300ms ease",
    },
    keyframes: {
        fadeIn: {
            from: { opacity: "0" },
            to: { opacity: "1" },
        },
        fadeInUp: {
            from: { opacity: "0", transform: "translateY(10px)" },
            to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
            from: { transform: "translateX(100%)" },
            to: { transform: "translateX(0)" },
        },
        scaleIn: {
            from: { opacity: "0", transform: "scale(0.95)" },
            to: { opacity: "1", transform: "scale(1)" },
        },
    },
} as const;

// ─── Z-Index Scale ──────────────────────────────────────────────────────

export const zIndex = {
    dropdown: "50",
    sticky: "100",
    overlay: "150",
    modal: "200",
    popover: "250",
    toast: "300",
} as const;

// ─── Complete Design System Export ──────────────────────────────────────

export const designSystem = {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    button: {
        base: buttonBase,
        sizes: buttonSizes,
    },
    input: {
        base: inputBase,
    },
    card: {
        base: cardBase,
    },
    badge: {
        base: badgeBase,
    },
    animations,
    zIndex,
} as const;

export default designSystem;
