import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
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
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <BottomTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
