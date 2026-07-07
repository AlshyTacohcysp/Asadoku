import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAllCours, deleteCours, Cours } from '../services/CoursService';
import { JOURS } from '../constants/jour';
import CoursForm from '../components/cours/CoursForm';

export default function CoursScreen() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJour, setSelectedJour] = useState<string>('Tous');
  const [showForm, setShowForm] = useState(false);
  const [editingCours, setEditingCours] = useState<Cours | null>(null);

  const loadCours = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCours();
      setCours(data);
    } catch (error) {
      console.error('Erreur chargement cours:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCours(); }, [loadCours]);

  const handleDelete = (id: number, matiere: string) => {
    Alert.alert('Supprimer', `Supprimer "${matiere}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteCours(id); loadCours(); } },
    ]);
  };

  const handleEdit = (cours: Cours) => {
    setEditingCours(cours);
    setShowForm(true);
  };

  const coursFiltres = selectedJour === 'Tous' ? cours : cours.filter(c => c.jour === selectedJour);

  const coursGroupes = coursFiltres.reduce((acc, c) => {
    if (!acc[c.jour]) acc[c.jour] = [];
    acc[c.jour].push(c);
    return acc;
  }, {} as Record<string, Cours[]>);

  const renderItem = ({ item }: { item: Cours }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.matiere}>{item.matiere}</Text>
          <Text style={styles.info}>{item.jour} • {item.heure_debut}-{item.heure_fin}</Text>
          <Text style={styles.info}>📍 {item.salle} 👨‍🏫 {item.professeur}</Text>
        </View>
        <TouchableOpacity onPress={() => handleEdit(item)} style={{ marginRight: 12 }}>
          <Ionicons name="pencil-outline" size={20} color="#4A90D9" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.matiere)}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Mes cours</Text>
        <TouchableOpacity onPress={() => { setEditingCours(null); setShowForm(true); }}>
          <Ionicons name="add-circle" size={32} color="#4A90D9" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Tous', ...JOURS]}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filtre, selectedJour === item && styles.filtreActive]}
              onPress={() => setSelectedJour(item)}
            >
              <Text style={[styles.filtreText, selectedJour === item && styles.filtreTextActive]}>
                {item === 'Tous' ? 'Tous' : item.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {selectedJour === 'Tous' ? (
        <FlatList
          data={Object.keys(coursGroupes)}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCours} />}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.jourTitle}>{item}</Text>
              {coursGroupes[item].map(c => <View key={c.id}>{renderItem({ item: c })}</View>)}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={coursFiltres}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCours} />}
        />
      )}

      <CoursForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCoursAdded={loadCours}
        editingCours={editingCours}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  filtre: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA' },
  filtreActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  filtreText: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  filtreTextActive: { color: '#fff' },
  jourTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  matiere: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  info: { fontSize: 13, color: '#666', marginBottom: 2 },
});