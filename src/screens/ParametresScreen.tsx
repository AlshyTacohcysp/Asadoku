import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllCours } from '../services/CoursService';
import { scheduleAllAlarms } from '../services/AlarmeService';

export default function ParametresScreen() {
  const [nom, setNom] = useState('');
  const [tempsPrep, setTempsPrep] = useState(20);
  const [tempsTrajet, setTempsTrajet] = useState(15);
  const [marge, setMarge] = useState(5);
  const [adresseDomicile, setAdresseDomicile] = useState('');
  const [adresseEtablissement, setAdresseEtablissement] = useState('');
  const [methodeDefaut, setMethodeDefaut] = useState('Pomodoro');

  useEffect(() => { loadParams(); }, []);

  const loadParams = async () => {
    setNom((await AsyncStorage.getItem('profil_nom')) || '');
    setTempsPrep(Number(await AsyncStorage.getItem('temps_preparation')) || 20);
    setTempsTrajet(Number(await AsyncStorage.getItem('temps_trajet')) || 15);
    setMarge(Number(await AsyncStorage.getItem('marge')) || 5);
    setAdresseDomicile((await AsyncStorage.getItem('adresse_domicile')) || '');
    setAdresseEtablissement((await AsyncStorage.getItem('adresse_etablissement')) || '');
    setMethodeDefaut((await AsyncStorage.getItem('methode_defaut')) || 'Pomodoro');
  };

  const saveAndReschedule = async () => {
    await AsyncStorage.setItem('profil_nom', nom);
    await AsyncStorage.setItem('temps_preparation', String(tempsPrep));
    await AsyncStorage.setItem('temps_trajet', String(tempsTrajet));
    await AsyncStorage.setItem('marge', String(marge));
    await AsyncStorage.setItem('adresse_domicile', adresseDomicile);
    await AsyncStorage.setItem('adresse_etablissement', adresseEtablissement);
    await AsyncStorage.setItem('methode_defaut', methodeDefaut);
    const allCours = await getAllCours();
    await scheduleAllAlarms(allCours, tempsPrep, tempsTrajet, marge);
    Alert.alert('✅', 'Paramètres sauvegardés et alarmes reprogrammées !');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>⚙️ Paramètres</Text>

        <View style={styles.card}>
          <Text style={styles.label}>👤 Nom</Text>
          <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Votre nom" placeholderTextColor="#C7C7CC" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🏠 Adresse domicile</Text>
          <TextInput style={styles.input} value={adresseDomicile} onChangeText={setAdresseDomicile} placeholder="Votre adresse" placeholderTextColor="#C7C7CC" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🏫 Adresse établissement</Text>
          <TextInput style={styles.input} value={adresseEtablissement} onChangeText={setAdresseEtablissement} placeholder="Adresse de votre école" placeholderTextColor="#C7C7CC" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>📚 Méthode de révision par défaut</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {['Pomodoro','Feynman','MindMap','Exercices','Lecture','Flashcards'].map(m => (
              <TouchableOpacity key={m} style={[styles.coursBtn, methodeDefaut===m && styles.coursBtnActive]} onPress={() => setMethodeDefaut(m)}>
                <Text style={[styles.coursBtnText, methodeDefaut===m && { color: '#fff' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>⏰ Temps de préparation</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => setTempsPrep(Math.max(5, tempsPrep-5))}><Text style={styles.btnText}>-5</Text></TouchableOpacity>
            <Text style={styles.value}>{tempsPrep} min</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setTempsPrep(tempsPrep+5)}><Text style={styles.btnText}>+5</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🚶 Temps de trajet</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => setTempsTrajet(Math.max(1, tempsTrajet-5))}><Text style={styles.btnText}>-5</Text></TouchableOpacity>
            <Text style={styles.value}>{tempsTrajet} min</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setTempsTrajet(tempsTrajet+5)}><Text style={styles.btnText}>+5</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🛡️ Marge de sécurité</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => setMarge(Math.max(0, marge-5))}><Text style={styles.btnText}>-5</Text></TouchableOpacity>
            <Text style={styles.value}>{marge} min</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setMarge(Math.min(30, marge+5))}><Text style={styles.btnText}>+5</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📐 Calcul de l'alarme</Text>
          <Text style={styles.infoText}>Heure cours - Prépa ({tempsPrep}min) - Trajet ({tempsTrajet}min) - Marge ({marge}min)</Text>
          <Text style={styles.infoText}>= Alarme {tempsPrep+tempsTrajet+marge} min avant le cours</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveAndReschedule}>
          <Text style={styles.saveBtnText}>💾 Sauvegarder et reprogrammer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14, elevation: 2 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', color: '#1A1A1A' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  btn: { backgroundColor: '#4A90D9', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  value: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', minWidth: 80, textAlign: 'center' },
  coursBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  coursBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  coursBtnText: { fontSize: 13, color: '#1A1A1A' },
  infoCard: { backgroundColor: '#E8F0FE', borderRadius: 14, padding: 18, marginBottom: 24 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#4A90D9', marginBottom: 4 },
  saveBtn: { backgroundColor: '#34C759', borderRadius: 14, padding: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});