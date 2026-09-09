import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Routes de la navigation par onglets (les noms sont publics — garder les accents). */
export type RootTabParamList = {
  Accueil: undefined;
  Cours: undefined;
  Tâches: undefined;
  Étude: undefined;
  Stats: undefined;
  Réglages: undefined;
};

/** Nom d'icône Ionicons typé. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Table des icônes de la barre d'onglets. */
export const TAB_ICONS: Record<
  keyof RootTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Accueil: { active: 'home', inactive: 'home-outline' },
  Cours: { active: 'book', inactive: 'book-outline' },
  Tâches: { active: 'checkbox', inactive: 'checkbox-outline' },
  Étude: { active: 'timer', inactive: 'timer-outline' },
  Stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Réglages: { active: 'settings', inactive: 'settings-outline' },
};
