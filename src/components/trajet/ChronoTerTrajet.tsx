import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChronometreTrajet() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [moyenne, setMoyenne] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} min ${sec} s`;
  };

  const start = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMoyenne(Math.round((moyenne + elapsed) / 2));
  };

  const reset = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      {moyenne > 0 && <Text style={styles.moyenne}>Moyenne : {formatTime(moyenne)}</Text>}
      <View style={styles.buttons}>
        {!running ? (
          <TouchableOpacity style={styles.btn} onPress={start}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.btnText}>Démarrer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#FF3B30' }]} onPress={stop}>
            <Ionicons name="stop" size={24} color="#fff" />
            <Text style={styles.btnText}>Arriver</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnOutline} onPress={reset}>
          <Text style={styles.btnOutlineText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  timer: { fontSize: 48, fontWeight: '800', fontFamily: 'monospace', color: '#1A1A1A' },
  moyenne: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A90D9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#4A90D9' },
  btnOutlineText: { color: '#4A90D9', fontSize: 16, fontWeight: '700' },
});