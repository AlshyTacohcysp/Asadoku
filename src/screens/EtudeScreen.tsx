import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAllCours, Cours } from '../services/CoursService';
import { saveSession, getSessions, SessionRevision } from '../services/RevisionService';

const METHODES = [
  { id: 'Pomodoro', nom: 'Pomodoro', icon: 'timer-outline', travail: 25*60, pause: 5*60, desc: '25 min + 5 min pause' },
  { id: 'Feynman', nom: 'Feynman', icon: 'chatbubble-outline', travail: 30*60, pause: 10*60, desc: 'Expliquer à voix haute' },
  { id: 'MindMap', nom: 'Mind Map', icon: 'git-branch-outline', travail: 45*60, pause: 15*60, desc: 'Carte mentale' },
  { id: 'Exercices', nom: 'Exercices', icon: 'create-outline', travail: 60*60, pause: 10*60, desc: 'Exercices pratiques' },
  { id: 'Lecture', nom: 'Lecture', icon: 'book-outline', travail: 30*60, pause: 10*60, desc: 'Lecture active' },
  { id: 'Flashcards', nom: 'Flashcards', icon: 'card-outline', travail: 20*60, pause: 5*60, desc: 'Flashcards' },
];

export default function EtudeScreen() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [selectedCours, setSelectedCours] = useState<number | null>(null);
  const [selectedMethode, setSelectedMethode] = useState('Pomodoro');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25*60);
  const [isPause, setIsPause] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [historique, setHistorique] = useState<SessionRevision[]>([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMethode = METHODES.find(m => m.id === selectedMethode)!;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const loadData = async () => {
    const [coursData, sessions] = await Promise.all([getAllCours(), getSessions()]);
    setCours(coursData);
    setHistorique(sessions);
  };

  const startTimer = () => {
    if (!sessionStart) setSessionStart(new Date().toISOString());
    setTimerRunning(true); setTimerPaused(false);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); handleTimerEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => { setTimerPaused(true); if (intervalRef.current) clearInterval(intervalRef.current); };
  const resumeTimer = () => {
    setTimerPaused(false);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); handleTimerEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const duree = currentMethode.travail - timeLeft;
    saveSession({
      cours_id: selectedCours, todo_id: null, methode: selectedMethode,
      debut: sessionStart || new Date().toISOString(), fin: new Date().toISOString(),
      duree_secondes: duree, notes,
    });
    loadData();
    setTimerRunning(false); setTimerPaused(false);
    setTimeLeft(currentMethode.travail); setIsPause(false);
    setCycles(0); setSessionStart(null); setNotes(''); setShowNotes(false);
  };

  const handleTimerEnd = () => {
    if (!isPause) {
      setCycles(c => c + 1); setIsPause(true);
      setTimeLeft(currentMethode.pause);
      Alert.alert('⏰ Pause !', `Cycle ${cycles+1} terminé. Pause de ${currentMethode.pause/60} min.`);
      setTimerRunning(false);
    } else {
      setIsPause(false); setTimeLeft(currentMethode.travail);
      Alert.alert('🔔 Reprise !', 'La pause est terminée !');
      setTimerRunning(false);
    }
  };

  const selectMethode = (id: string) => {
    if (timerRunning) { Alert.alert('Attention', 'Arrêtez le minuteur avant.'); return; }
    setSelectedMethode(id);
    setTimeLeft(METHODES.find(m => m.id === id)!.travail);
    setIsPause(false);
  };

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const formatDuree = (s: number) => { const m = Math.floor(s/60); return m < 60 ? `${m} min` : `${Math.floor(m/60)}h${m%60>0?' '+(m%60)+'min':''}`; };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>⏱️ Étude</Text>
        <TouchableOpacity onPress={() => setShowHistorique(!showHistorique)}>
          <Text style={{ color: '#4A90D9', fontWeight: '600' }}>{showHistorique ? 'Minuteur' : 'Historique'}</Text>
        </TouchableOpacity>
      </View>
      {showHistorique ? (
        <ScrollView style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>📋 Sessions récentes</Text>
          {historique.length === 0 ? <Text style={{ textAlign: 'center', color: '#8E8E93' }}>Aucune session</Text> :
            historique.map(s => (
              <View key={s.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '600' }}>{s.methode}</Text>
                <Text style={{ color: '#4A90D9', fontWeight: '600' }}>{formatDuree(s.duree_secondes)}</Text>
                <Text style={{ fontSize: 12, color: '#8E8E93' }}>{new Date(s.debut).toLocaleDateString('fr-FR')}</Text>
              </View>
            ))
          }
        </ScrollView>
      ) : (
        <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 30 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Méthode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {METHODES.map(m => (
              <TouchableOpacity key={m.id} style={[styles.methodeCard, selectedMethode===m.id && { backgroundColor: '#4A90D9' }]} onPress={() => selectMethode(m.id)}>
                <Ionicons name={m.icon as any} size={24} color={selectedMethode===m.id?'#fff':'#4A90D9'} />
                <Text style={{ fontWeight: '700', marginTop: 6, color: selectedMethode===m.id?'#fff':'#4A90D9' }}>{m.nom}</Text>
                <Text style={{ fontSize: 11, textAlign: 'center', color: selectedMethode===m.id?'#fff':'#8E8E93' }}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Matière</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity style={[styles.coursBtn, selectedCours===null && { backgroundColor: '#4A90D9' }]} onPress={() => setSelectedCours(null)}>
              <Text style={{ color: selectedCours===null?'#fff':'#1A1A1A' }}>Sans</Text>
            </TouchableOpacity>
            {cours.map(c => (
              <TouchableOpacity key={c.id} style={[styles.coursBtn, selectedCours===c.id && { backgroundColor: '#4A90D9' }]} onPress={() => setSelectedCours(c.id)}>
                <Text style={{ color: selectedCours===c.id?'#fff':'#1A1A1A' }}>{c.matiere}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>{isPause ? '🟢 PAUSE' : '🔴 TRAVAIL'}</Text>
            <Text style={{ fontSize: 64, fontWeight: '800', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</Text>
            <Text style={{ color: '#8E8E93', marginTop: 8 }}>Cycles : {cycles}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              {!timerRunning ? (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, gap: 8 }} onPress={startTimer}>
                  <Ionicons name="play" size={24} color="#fff" /><Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Démarrer</Text>
                </TouchableOpacity>
              ) : timerPaused ? (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, gap: 8 }} onPress={resumeTimer}>
                  <Ionicons name="play" size={24} color="#fff" /><Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Reprendre</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9500', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, gap: 8 }} onPress={pauseTimer}>
                  <Ionicons name="pause" size={24} color="#fff" /><Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Pause</Text>
                </TouchableOpacity>
              )}
              {timerRunning && (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: '#FF3B30', gap: 8 }} onPress={stopTimer}>
                  <Ionicons name="stop" size={24} color="#FF3B30" /><Text style={{ color: '#FF3B30', fontSize: 18, fontWeight: '700' }}>Arrêter</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E8F0FE' }} onPress={() => setShowNotes(!showNotes)}>
              <Text style={{ color: '#4A90D9', fontWeight: '600' }}>📝 Notes</Text>
            </TouchableOpacity>
            {showNotes && (
              <TextInput
                style={{ backgroundColor: '#F5F7FA', borderRadius: 12, padding: 14, marginTop: 12, fontSize: 14, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E5EA', width: '100%' }}
                value={notes} onChangeText={setNotes}
                placeholder="Vos notes..." placeholderTextColor="#C7C7CC" multiline
              />
            )}
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
  methodeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginRight: 10, width: 140, alignItems: 'center', borderWidth: 2, borderColor: '#E5E5EA' },
  coursBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
});