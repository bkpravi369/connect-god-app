export const COLORS = {
  // Primary - Luxury Sunset Crimson (Deep Maroon / Crimson)
  primary: {
    50: '#fff5f5',
    100: '#ffe3e3',
    200: '#ffc9c9',
    300: '#ffa8a8',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#8B0000', // Deep Maroon / Crimson
    900: '#700000',
    950: '#4a0000',
  },
  // Secondary - Radiant Amber & Deep Saffron
  secondary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#E65100', // Serene Deep Saffron
    700: '#C2410C',
    800: '#9a3412',
    900: '#7c2d12',
  },
  // Saffron & Warm Light Accents
  saffron: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#E65100', // Serene Deep Saffron
    800: '#9a3412',
    900: '#7c2d12',
  },
  // Accent - Radiant Sunset
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#E67E22',
    600: '#D35400',
  },
  // Gold Accents & Divine Aura
  gold: {
    50: '#fffdf0',
    100: '#fef9e7',
    200: '#fcf0c2',
    300: '#fae38e',
    400: '#f6d55b',
    500: '#D4AF37', // Pure Luxury Gold Accent
    600: '#E6B800', // Warm Divine Radiant Gold
    700: '#b89628',
    800: '#91741a',
    900: '#68510e',
  },
  parchment: {
    base: '#FAF8F5', // Soft Ivory / Pearl Background
    card: '#FDFBF7',
    border: '#D4AF37',
    borderLight: 'rgba(212, 175, 55, 0.3)',
    text: '#431407',
    subText: '#78350f',
  },
  divine: {
    400: '#dc2626',
    500: '#c41e3a',
    600: '#8B0000',
    700: '#700000',
    800: '#4a0000',
  },
  success: {
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    500: '#f59e0b',
    600: '#D35400',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
  neutral: {
    0: '#ffffff',
    50: '#FAF8F5', // Soft Ivory / Pearl Canvas
    100: '#f5f0e8',
    200: '#ebe4d8',
    300: '#d9cfbf',
    400: '#b5a794',
    500: '#8c7d6b',
    600: '#6b5e4e',
    700: '#4d4235',
    800: '#332b21',
    900: '#1c1610',
    950: '#0D0F14', // Deep Serene Dark
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  '3xl': 34,
  full: 9999,
} as const;

// Warm glowing and glassmorphism shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 7,
  },
  // Golden glow for divine cards & floating navigation
  glow: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  // Soft ambient divine aura
  divineAura: {
    shadowColor: '#E6B800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
} as const;

// Glassmorphism presets
export const GLASS = {
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
  },
  cardGlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    ...SHADOWS.glow,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.22)',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.22)',
  },
  tabBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.32)',
    ...SHADOWS.glow,
  },
} as const;

export const FONTS = {
  sans: 'Inter-Regular',
  sansMedium: 'Inter-Medium',
  sansSemiBold: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
  serif: 'Georgia',
  serifMedium: 'Georgia',
  serifBold: 'Georgia',
  malayalam: 'NotoMalayalam-Regular',
  malayalamBold: 'NotoMalayalam-Bold',
} as const;

// Luxury Sunset Crimson & Gold gradients
export const GRADIENTS = {
  sunsetCrimson: ['#8B0000', '#D35400', '#E67E22'] as const,
  sunset: ['#8B0000', '#D35400', '#E67E22'] as const,
  sunsetGold: ['#8B0000', '#D35400', '#D4AF37'] as const,
  saffron: ['#8B0000', '#E65100', '#E67E22'] as const,
  golden: ['#D35400', '#E6B800', '#D4AF37'] as const,
  warm: ['#700000', '#8B0000', '#D35400'] as const,
  divineHalo: ['rgba(212, 175, 55, 0.3)', 'rgba(230, 81, 0, 0.1)', 'transparent'] as const,
} as const;
