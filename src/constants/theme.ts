/**
 * Design system unifié de l'application.
 *
 * Tous les écrans doivent consommer les couleurs depuis `useThemeColors()`
 * (cf. src/context/ThemeContext.tsx) — jamais de valeurs hexadécimales en dur.
 */

export interface AppPalette {
  /** Fond général des écrans */
  background: string;
  /** Cartes, modales, champs sur fond clair */
  surface: string;
  /** Fond légèrement différent (inputs, zones secondaires) */
  surfaceAlt: string;
  /** Texte principal */
  text: string;
  /** Texte secondaire / libellés */
  textLight: string;
  /** Placeholders */
  placeholder: string;
  /** Bordures / séparateurs */
  border: string;
  /** Couleur d'action principale */
  primary: string;
  /** Texte / icônes posés sur `primary` */
  onPrimary: string;
  /** Fond teinté de la couleur primaire (sélection, info) */
  primarySoft: string;
  /** Action positive (valider, démarrer, terminer) */
  success: string;
  /** Action destructive / erreur */
  danger: string;
  /** Attention */
  warning: string;
  /** Fond des overlays de modales */
  overlay: string;
  /** Ombre portée (couleur) */
  shadow: string;
}

export const LIGHT_PALETTE: AppPalette = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F8',
  text: '#1A1A1A',
  textLight: '#6E7686',
  placeholder: '#B3BAC7',
  border: '#E4E8EF',
  primary: '#4A90D9',
  onPrimary: '#FFFFFF',
  primarySoft: '#E8F0FE',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  overlay: 'rgba(15, 20, 32, 0.55)',
  shadow: '#000000',
};

export const DARK_PALETTE: AppPalette = {
  background: '#0E1320',
  surface: '#182032',
  surfaceAlt: '#202A40',
  text: '#EDF1F7',
  textLight: '#9FABC0',
  placeholder: '#5F6B80',
  border: '#2A3549',
  primary: '#6DB3FF',
  onPrimary: '#0E1320',
  primarySoft: '#1C3050',
  success: '#3FCF8E',
  danger: '#FF6B6B',
  warning: '#FFB454',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export type ThemeMode = 'light' | 'dark';

// ---------------------------------------------------------------------------
// Échelle de design (identique dans les deux thèmes)
// ---------------------------------------------------------------------------

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  huge: 56,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Ombre douce standard pour les cartes — à épandre dans un StyleSheet. */
export function cardShadow(palette: AppPalette, elevation = 2) {
  return {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation,
  };
}

/**
 * Squelette de styles partagés par tous les écrans afin de garantir une
 * IHM homogène (conteneur, cartes, champs, boutons…).
 */
export function baseStyles(palette: AppPalette) {
  return {
    screen: { flex: 1, backgroundColor: palette.background },
    card: {
      backgroundColor: palette.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      ...cardShadow(palette),
    },
    field: {
      backgroundColor: palette.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: FONT_SIZES.md,
    },
    fieldAlt: {
      backgroundColor: palette.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: FONT_SIZES.md,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    chipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    chipText: { fontSize: FONT_SIZES.sm, color: palette.text, fontWeight: '600' },
    chipTextActive: { color: palette.onPrimary },
    label: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: palette.textLight,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
      marginBottom: 6,
      marginTop: 4,
    },
    btnPrimary: {
      backgroundColor: palette.primary,
      borderRadius: RADIUS.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnPrimaryText: { color: palette.onPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' },
    btnSuccess: {
      backgroundColor: palette.success,
      borderRadius: RADIUS.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    btnSuccessText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '700' },
    btnDangerGhost: {
      borderRadius: RADIUS.md,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: palette.danger,
      alignItems: 'center' as const,
    },
  };
}

/** Styles partagés des écrans pour alléger chaque fichier. */
export type BaseStyles = ReturnType<typeof baseStyles>;
