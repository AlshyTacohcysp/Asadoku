import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator } from "react-native";
import BottomTabs from "./src/navigation/BottomTabs";
import { createTables } from "./src/db/migrations";
import { seedDatabase } from "./src/db/seed";
import {
  setupNotifications,
  requestPermissions,
  scheduleAllAlarms,
} from "./src/services/AlarmeService";
import { getAllCours } from "./src/services/CoursService";
import { snoozeAlarm } from "./src/services/AlarmeService";
import { getDatabase } from "./src/db/database";
import { ThemeProvider } from "./src/context/ThemeContext";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        await createTables();
        await seedDatabase();
        // Configurer les notifications
        await setupNotifications();
        // Gérer les actions des notifications (Snooze)
        Notifications.setNotificationCategoryAsync("alarm", [
          {
            identifier: "snooze",
            buttonTitle: "Snooze (5 min)",
            options: { opensAppToForeground: false },
          },
          {
            identifier: "ok",
            buttonTitle: "OK",
            options: { opensAppToForeground: false },
          },
        ]);

        // Écouter les réponses aux notifications
        Notifications.addNotificationResponseReceivedListener(
          async (response) => {
            const { coursId, matiere, salle, professeur } =
              response.notification.request.content.data || {};

            if (response.actionIdentifier === "snooze" && coursId) {
              await snoozeAlarm(
                response.notification.request.identifier,
                coursId,
                matiere || "Cours",
                salle || "",
                professeur || "",
              );
            }

            // Marquer comme déclenchée
            if (coursId) {
              const db = await getDatabase();
              await db.runAsync(
                "UPDATE alarme SET declenchee = 1, triggered_at = ? WHERE cours_id = ? AND declenchee = 0",
                [new Date().toISOString(), coursId],
              );
            }
          },
        );
        const hasPermission = await requestPermissions();
        if (hasPermission) {
          const allCours = await getAllCours();
          await scheduleAllAlarms(allCours);
        }
        setIsReady(true);
      } catch (err) {
        console.error("❌ Erreur BDD :", err);
        setError(String(err));
      }
    }
    initDatabase();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red", fontSize: 18 }}>Erreur : {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>
          Chargement des données...
        </Text>
      </View>
    );
  }

return (
  <ThemeProvider>
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <BottomTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  </ThemeProvider>
);}
