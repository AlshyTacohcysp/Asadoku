import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAllCours, Cours } from '../services/CoursService';
import { saveSession, getSessions, SessionRevision } from '../services/RevisionService';

const METHODES = [
  { id: 'Pomodoro', nom: 'Pomodoro', icon: 'timer-outline', travail: 25 * 60, pause: 5 * 60, desc: '25 min travail + 5 min pause' },
  { id: 'Feynman', nom: 'Feynman', icon: 'chatbubble-outline', travail: 30 * 60, pause: 10 * 60, desc: 'Expliquer à voix haute' },
  { id: 'MindMap', nom: 'Mind Map', icon: 'git-branch-outline', travail: 45 * 60, pause: 15 * 60, desc: 'Carte mentale' },
  { id: 'Exercices', nom: 'Exercices', icon: 'create-outline', travail: 60 * 60, pause: 10 * 60, desc: 'Exercices pratiques' },
  { id: 'Lecture', nom: 'Lecture', icon: 'book-outline', travail: 30 * 60, pause: 10 * 60, desc: 'Lecture active' },
  { id: 'Flashcards', nom: 'Flashcards', icon: 'card-outline', travail: 20 * 60, pause: 5 * 60, desc: 'Flashcards' },
];

export default function EtudeScreen() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [selectedCours, setSelectedCours] = useState<number | null>(null);
  const [selectedMethode, setSelectedMethode] = useState<string>('Pomodoro');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isPause, setIsPause] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [historique, setHistorique] = useState<SessionRevision[]>([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentMethode = METHODES.find(m => m.id === selectedMethode)!;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [coursData, sessions] = await Promise.all([getAllCours(), getSessions()]);
    setCours(coursData);
    setHistorique(sessions);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startTimer = () => {
    if (!sessionStart) setSessionStart(new Date().toISOString());
    setTimerRunning(true);
    setTimerPaused(false);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resumeTimer = () => {
    setTimerPaused(false);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const duree = currentMethode.travail - timeLeft;
    saveSession({
      cours_id: selectedCours,
      todo_id: null,
      methode: selectedMethode,
      debut: sessionStart || new Date().toISOString(),
      fin: new Date().toISOString(),
      duree_secondes: duree,
      notes: '',
    });
    loadData();
    setTimerRunning(false);
    setTimerPaused(false);
    setTimeLeft(currentMethode.travail);
    setIsPause(false);
    setCycles(0);
    setSessionStart(null);
  };

  const handleTimerEnd = () => {
    if (!isPause) {
      setCycles(c => c + 1);
      setIsPause(true);
      setTimeLeft(currentMethode.pause);
      Alert.alert('⏰ Pause !', `Cycle ${cycles + 1} terminé. Prenez ${currentMethode.pause / 60} min de pause.`);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerRunning(false);
    } else {
      setIsPause(false);
      setTimeLeft(currentMethode.travail);
      Alert.alert('🔔 Reprise !', 'La pause est terminée. Au travail !');
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerRunning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectMethode = (id: string) => {
    if (timerRunning) {
      Alert.alert('Attention', 'Arrêtez le minuteur avant de changer de méthode.');
      return;
    }
    setSelectedMethode(id);
    const m = METHODES.find(met => met.id === id)!;
    setTimeLeft(m.travail);
    setIsPause(false);
  };

  const formatDuree = (s: number) => {
    const min = Math.floor(s / 60);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return `${h}h${min % 60 > 0 ? ' ' + (min % 60) + 'min' : ''}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>⏱️ Étude</Text>
        <TouchableOpacity onPress={() => setShowHistorique(!showHistorique)}>
          <Text style={styles.historiqueBtn}>{showHistorique ? 'Minuteur' : 'Historique'}</Text>
        </TouchableOpacity>
      </View>

      {showHistorique ? (
        <ScrollView style={styles.histoList}>
          <Text style={styles.sectionTitle}>📋 Sessions récentes</Text>
          {historique.length === 0 ? (
            <Text style={styles.empty}>Aucune session enregistrée</Text>
          ) : (
            historique.map(s => (
              <View key={s.id} style={styles.histoCard}>
                <Text style={styles.histoMethode}>{s.methode}</Text>
                <Text style={styles.histoDuree}>{formatDuree(s.duree_secondes)}</Text>
                <Text style={styles.histoDate}>{new Date(s.debut).toLocaleDateString('fr-FR')}</Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Sélection méthode */}
          <Text style={styles.sectionTitle}>Méthode de révision</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodesRow}>
            {METHODES.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodeCard, selectedMethode === m.id && styles.methodeCardActive]}
                onPress={() => selectMethode(m.id)}
              >
                <Ionicons name={m.icon as any} size={24} color={selectedMethode === m.id ? '#fff' : '#4A90D9'} />
                <Text style={[styles.methodeNom, selectedMethode === m.id && { color: '#fff' }]}>{m.nom}</Text>
                <Text style={[styles.methodeDesc, selectedMethode === m.id && { color: '#fff' }]}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sélection cours */}
          <Text style={styles.sectionTitle}>Matière (optionnel)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.coursBtn, selectedCours === null && styles.coursBtnActive]}
              onPress={() => setSelectedCours(null)}
            >
              <Text style={[styles.coursBtnText, selectedCours === null && { color: '#fff' }]}>Sans matière</Text>
            </TouchableOpacity>
            {cours.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.coursBtn, selectedCours === c.id && styles.coursBtnActive]}
                onPress={() => setSelectedCours(c.id)}
              >
                <Text style={[styles.coursBtnText, selectedCours === c.id && { color: '#fff' }]}>{c.matiere}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Minuteur */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>{isPause ? '🟢 PAUSE' : '🔴 TRAVAIL'}</Text>
            <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
            <Text style={styles.cycles}>Cycles : {cycles}</Text>

            <View style={styles.timerButtons}>
              {!timerRunning ? (
                <TouchableOpacity style={styles.startBtn} onPress={startTimer}>
                  <Ionicons name="play" size={28} color="#fff" />
                  <Text style={styles.startBtnText}>Démarrer</Text>
                </TouchableOpacity>
              ) : timerPaused ? (
                <TouchableOpacity style={styles.startBtn} onPress={resumeTimer}>
                  <Ionicons name="play" size={28} color="#fff" />
                  <Text style={styles.startBtnText}>Reprendre</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#FF9500' }]} onPress={pauseTimer}>
                  <Ionicons name="pause" size={28} color="#fff" />
                  <Text style={styles.startBtnText}>Pause</Text>
                </TouchableOpacity>
              )}
              {timerRunning && (
                <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
                  <Ionicons name="stop" size={28} color="#FF3B30" />
                  <Text style={styles.stopBtnText}>Arrêter</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  historiqueBtn: { fontSize: 14, color: '#4A90D9', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  methodesRow: { marginBottom: 8 },
  methodeCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginRight: 10,
    width: 150, alignItems: 'center', borderWidth: 2, borderColor: '#E5E5EA',
  },
  methodeCardActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  methodeNom: { fontSize: 14, fontWeight: '700', marginTop: 6, color: '#4A90D9' },
  methodeDesc: { fontSize: 11, color: '#8E8E93', textAlign: 'center', marginTop: 4 },
  coursBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  coursBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  coursBtnText: { fontSize: 13, color: '#1A1A1A' },
  timerContainer: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 30, marginTop: 10, elevation: 4 },
  timerLabel: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  timer: { fontSize: 64, fontWeight: '800', color: '#1A1A1A', fontFamily: 'monospace' },
  cycles: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
  timerButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
  startBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, gap: 8 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: '#FF3B30', gap: 8 },
  stopBtnText: { color: '#FF3B30', fontSize: 18, fontWeight: '700' },
  histoList: { flex: 1, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 40, fontSize: 15 },
  histoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histoMethode: { fontSize: 15, fontWeight: '600' },
  histoDuree: { fontSize: 14, color: '#4A90D9', fontWeight: '600' },
  histoDate: { fontSize: 12, color: '#8E8E93' },
});