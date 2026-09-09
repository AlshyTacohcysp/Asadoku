import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import BottomTabs from './src/navigation/BottomTabs';
import { createTables } from './src/db/migrations';
import { seedDatabase } from './src/db/seed';
import {
  configureAlarmCategory,
  hasNotificationPermission,
  requestPermissions,
  setupNotifications,
  snoozeAlarm,
  syncNotifications,
} from './src/services/AlarmeService';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { todayISO } from './src/utils/date';
import AppErrorBoundary from './src/components/ui/AppErrorBoundary';

const LAST_SYNC_KEY = 'last_notif_sync';

export default function App() {
  const [rebootKey, setRebootKey] = useState(0);

  return (
    // `key` permet au garde-fou d'erreur de remonter toute l'application.
    <AppErrorBoundary key={rebootKey} onRetry={() => setRebootKey((k) => k + 1)}>
      <ThemeProvider>
        <ContenuApp />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

function ContenuApp() {
  const { colors, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);

  // -------------------------------------------------------------------------
  // Démarrage : schéma SQLite, seed unique, notifications, planification.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let actif = true;

    async function demarrer() {
      try {
        await createTables();
        await seedDatabase();
        await setupNotifications();
        await configureAlarmCategory();

        // On ne re-demande la permission qu'une fois ; pas de harcèlement si
        // l'utilisateur a déjà refusé (il peut l'activer dans Réglages).
        const dejaAccordee = await hasNotificationPermission();
        const permission = dejaAccordee || (await requestPermissions());
        if (permission) {
          await syncNotifications();
          await AsyncStorage.setItem(LAST_SYNC_KEY, todayISO()).catch(() => {});
        }

        if (actif) setIsReady(true);
      } catch (err) {
        console.error('❌ Erreur au démarrage :', err);
        if (actif) setError(String(err));
      }
    }
    demarrer();

    return () => {
      actif = false;
    };
  }, [essai]);

  // -------------------------------------------------------------------------
  // Réponses aux actions des notifications (Snooze / OK).
  // -------------------------------------------------------------------------
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
        if (response.actionIdentifier === 'snooze' && typeof data.coursId === 'number') {
          await snoozeAlarm(
            response.notification.request.identifier,
            data.coursId,
            String(data.matiere || 'Cours'),
            String(data.salle || ''),
            String(data.professeur || ''),
          );
        }
      },
    );
    return () => subscription.remove();
  }, []);

  // -------------------------------------------------------------------------
  // Resynchronisation quotidienne : au retour au premier plan, si le jour a
  // changé, l'échéancier (alarmes + rappels) est recalculé depuis la base.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (etat) => {
      if (etat !== 'active') return;
      (async () => {
        try {
          const [dernierSync, permission] = await Promise.all([
            AsyncStorage.getItem(LAST_SYNC_KEY),
            hasNotificationPermission(),
          ]);
          const aujourdhui = todayISO();
          if (permission && dernierSync !== aujourdhui) {
            await syncNotifications();
            await AsyncStorage.setItem(LAST_SYNC_KEY, aujourdhui).catch(() => {});
          }
        } catch (err) {
          console.warn('⚠️ Resynchronisation impossible :', err);
        }
      })();
    });
    return () => subscription.remove();
  }, []);

  // -------------------------------------------------------------------------
  // Écrans de démarrage / d'erreur (thémés).
  // -------------------------------------------------------------------------
  const navigationTheme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  if (error) {
    return (
      <View style={[styles.centre, { backgroundColor: colors.background }]}>
        <Text style={[styles.erreurTitre, { color: colors.danger }]}>😕 Une erreur est survenue</Text>
        <Text style={[styles.erreurDetail, { color: colors.textLight }]}>{error}</Text>
        <Pressable
          style={[styles.reessayer, { backgroundColor: colors.primary }]}
          onPress={() => {
            setError(null);
            setEssai((e) => e + 1);
          }}
        >
          <Text style={[styles.reessayerTexte, { color: colors.onPrimary }]}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.centre, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.chargement, { color: colors.textLight }]}>Préparation de votre journée…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <BottomTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  chargement: { marginTop: 14, fontSize: 15 },
  erreurTitre: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  erreurDetail: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  reessayer: { marginTop: 18, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 999 },
  reessayerTexte: { fontSize: 15, fontWeight: '700' },
});
