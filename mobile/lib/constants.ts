export const BRAND = {
  cream: '#F5EFE0',
  sand: '#E8E0CE',
  ink: '#1A1A1A',
  stone: '#8A7F72',
  border: '#DDD5C4',
  orange: '#E8521C',
  maroon: '#6B1A1A',
  lime: '#A8D040',
  yellow: '#F0C030',
  pink: '#E840B0',
  forest: '#1A4A20',
} as const;

export const FONTS = {
  display: 'ArchivoBlack_400Regular',
  sans: 'DMSans_400Regular',
  sansLight: 'DMSans_300Light',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansItalic: 'DMSans_400Regular_Italic',
  sansBoldItalic: 'DMSans_700Bold_Italic',
} as const;

export const NAV_THEME = {
  light: {
    background: BRAND.cream,
    border: BRAND.border,
    card: BRAND.sand,
    notification: BRAND.orange,
    primary: BRAND.orange,
    text: BRAND.ink,
  },
  dark: {
    background: BRAND.ink,
    border: '#2A2A2A',
    card: '#1F1F1F',
    notification: BRAND.orange,
    primary: BRAND.orange,
    text: BRAND.cream,
  },
};
