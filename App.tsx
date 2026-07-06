import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import BottomTabs from './src/navigation/BottomTabs';
import { createTables } from './src/db/migrations';
import { seedDatabase } from './src/db/seed';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        console.log('🗄️ Création des tables...');
        await createTables();
        
        console.log('🌱 Insertion des données de test...');
        await seedDatabase();
        
        console.log('✅ Base de données prête !');
        setIsReady(true);
      } catch (err) {
        console.error('❌ Erreur BDD :', err);
        setError(String(err));
      }
    }

    initDatabase();
  }, []);

  // Écran de chargement
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>Erreur : {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Chargement des données...</Text>
      </View>
    );
  }

  // Application normale
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <BottomTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}