import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDatabase } from '../db/database';

export default function StatsScreen() {
  const [stats, setStats] = useState<any>({
    semaine: { sessions: 0, total: 0 },
    mois: { sessions: 0, total: 0 },
    parMethode: {} as Record<string, number>,
    parMatiere: {} as Record<string, number>,
  });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const db = await getDatabase();
    
    // Cette semaine (lundi à aujourd'hui)
    const now = new Date();
    const debutSemaine = new Date(now);
    debutSemaine.setDate(now.getDate() - now.getDay() + 1);
    debutSemaine.setHours(0, 0, 0, 0);
    
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total semaine
    const semaineStats = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(duree_secondes), 0) as total, COUNT(*) as count 
       FROM session_revision WHERE debut >= ?`,
      [debutSemaine.toISOString()]
    );
    
    // Total mois
    const moisStats = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(duree_secondes), 0) as total, COUNT(*) as count 
       FROM session_revision WHERE debut >= ?`,
      [debutMois.toISOString()]
    );
    
    // Par méthode
    const parMethode = await db.getAllAsync<{ methode: string; total: number }>(
      `SELECT methode, COALESCE(SUM(duree_secondes), 0) as total 
       FROM session_revision GROUP BY methode ORDER BY total DESC`
    );
    
    // Par matière (jointure avec cours)
    const parMatiere = await db.getAllAsync<{ matiere: string; total: number }>(
      `SELECT COALESCE(c.matiere, 'Sans matière') as matiere, 
              COALESCE(SUM(s.duree_secondes), 0) as total 
       FROM session_revision s 
       LEFT JOIN cours c ON s.cours_id = c.id 
       GROUP BY c.matiere ORDER BY total DESC`
    );
    
    const methodes: Record<string, number> = {};
    parMethode.forEach(m => { methodes[m.methode] = m.total; });
    
    const matieres: Record<string, number> = {};
    parMatiere.forEach(m => { matieres[m.matiere] = m.total; });
    
    setStats({
      semaine: { sessions: semaineStats?.count || 0, total: semaineStats?.total || 0 },
      mois: { sessions: moisStats?.count || 0, total: moisStats?.total || 0 },
      parMethode: methodes,
      parMatiere: matieres,
    });
  };

  const formatHeures = (secondes: number) => {
    const h = Math.floor(secondes / 3600);
    const m = Math.floor((secondes % 3600) / 60);
    if (h === 0) return `${m} min`;
    return `${h}h ${m} min`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📊 Statistiques</Text>

        {/* Semaine */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Cette semaine</Text>
          <View style={styles.row}>
            <Text style={styles.bigNumber}>{formatHeures(stats.semaine.total)}</Text>
            <Text style={styles.subtext}>{stats.semaine.sessions} sessions</Text>
          </View>
        </View>

        {/* Mois */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗓️ Ce mois</Text>
          <View style={styles.row}>
            <Text style={styles.bigNumber}>{formatHeures(stats.mois.total)}</Text>
            <Text style={styles.subtext}>{stats.mois.sessions} sessions</Text>
          </View>
        </View>

        {/* Par méthode */}
        {Object.keys(stats.parMethode).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧠 Par méthode</Text>
            {Object.entries(stats.parMethode).map(([methode, total]) => (
              <View key={methode} style={styles.barContainer}>
                <Text style={styles.barLabel}>{methode}</Text>
                <View style={styles.barRow}>
                  <View style={[styles.bar, { width: `${Math.min(100, (total as number) / 3600 * 10)}%` }]} />
                  <Text style={styles.barValue}>{formatHeures(total as number)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Par matière */}
        {Object.keys(stats.parMatiere).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Par matière</Text>
            {Object.entries(stats.parMatiere).map(([matiere, total]) => (
              <View key={matiere} style={styles.barContainer}>
                <Text style={styles.barLabel}>{matiere}</Text>
                <View style={styles.barRow}>
                  <View style={[styles.bar, { width: `${Math.min(100, (total as number) / 3600 * 10)}%` }]} />
                  <Text style={styles.barValue}>{formatHeures(total as number)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: '#4A90D9' },
  subtext: { fontSize: 14, color: '#8E8E93' },
  barContainer: { marginBottom: 10 },
  barLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 8, backgroundColor: '#4A90D9', borderRadius: 4, minWidth: 4 },
  barValue: { fontSize: 12, color: '#8E8E93' },
});