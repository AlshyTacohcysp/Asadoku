import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStyles, useThemeColors } from '../context/ThemeContext';
import { getDatabase } from '../db/database';
import { formatDuree } from '../utils/format';
import { RADIUS, SPACING } from '../constants/theme';
import EmptyState from '../components/ui/EmptyState';
import type { RootTabParamList } from '../navigation/types';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'Stats'>;

interface Stats {
  totalSecondes: number;
  totalSessions: number;
  joursEtudies: number;
  semaine: { secondes: number; sessions: number };
  mois: { secondes: number; sessions: number };
  parMethode: Array<{ cle: string; secondes: number }>;
  parMatiere: Array<{ cle: string; secondes: number }>;
}

async function recupererStats(): Promise<Stats> {
  const db = await getDatabase();
  const maintenant = new Date();

  const debutSemaine = startOfWeek(maintenant, { weekStartsOn: 1 });
  const debutMois = startOfMonth(maintenant);

  const total = await db.getFirstAsync<{ s: number; c: number; j: number }>(
    `SELECT COALESCE(SUM(duree_secondes),0) as s, COUNT(*) as c,
            COUNT(DISTINCT substr(debut,1,10)) as j
     FROM session_revision`,
  );
  const semaine = await db.getFirstAsync<{ s: number; c: number }>(
    'SELECT COALESCE(SUM(duree_secondes),0) as s, COUNT(*) as c FROM session_revision WHERE debut >= ?',
    [debutSemaine.toISOString()],
  );
  const mois = await db.getFirstAsync<{ s: number; c: number }>(
    'SELECT COALESCE(SUM(duree_secondes),0) as s, COUNT(*) as c FROM session_revision WHERE debut >= ?',
    [debutMois.toISOString()],
  );

  const parMethode = await db.getAllAsync<{ methode: string; s: number }>(
    `SELECT methode, COALESCE(SUM(duree_secondes),0) as s
     FROM session_revision GROUP BY methode ORDER BY s DESC`,
  );
  const parMatiere = await db.getAllAsync<{ matiere: string; s: number }>(
    `SELECT COALESCE(c.matiere, 'Sans matière') as matiere, COALESCE(SUM(sr.duree_secondes),0) as s
     FROM session_revision sr
     LEFT JOIN cours c ON c.id = sr.cours_id
     GROUP BY COALESCE(c.matiere, 'Sans matière')
     ORDER BY s DESC`,
  );

  return {
    totalSecondes: total?.s ?? 0,
    totalSessions: total?.c ?? 0,
    joursEtudies: total?.j ?? 0,
    semaine: { secondes: semaine?.s ?? 0, sessions: semaine?.c ?? 0 },
    mois: { secondes: mois?.s ?? 0, sessions: mois?.c ?? 0 },
    parMethode: (parMethode ?? []).map((r) => ({ cle: r.methode, secondes: r.s })),
    parMatiere: (parMatiere ?? []).map((r) => ({ cle: r.matiere, secondes: r.s })),
  };
}

export default function StatsScreen() {
  const navigation = useNavigation<Navigation>();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [stats, setStats] = useState<Stats | null>(null);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => {
    try {
      setStats(await recupererStats());
    } catch (err) {
      console.error('Erreur de chargement des statistiques :', err);
    } finally {
      setRafraichissement(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  if (!stats) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const vide = stats.totalSessions === 0;
  const plageSemaine = `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: fr })} – ${format(new Date(), 'd MMM', { locale: fr })}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={async () => { setRafraichissement(true); await charger(); }} tintColor={colors.primary} />}
      >
        <Text style={[styles.title, { color: colors.text }]}>📊 Statistiques</Text>

        {vide ? (
          <View style={styles.videCarte}>
            <EmptyState
              icon="bar-chart-outline"
              titre="Aucune donnée pour l'instant"
              message="Vos sessions de révision apparaîtront ici dès la première utilisation du minuteur."
              actionLabel="Lancer une session"
              onAction={() => navigation.navigate('Étude')}
            />
          </View>
        ) : (
          <>
            {/* Cette semaine */}
            <View style={[styles.card, { borderColor: colors.border }]}>
              <View style={styles.enTete}>
                <Text style={[styles.cardTitre, { color: colors.text }]}>Cette semaine</Text>
                <Text style={[styles.plage, { color: colors.textLight }]}>{plageSemaine}</Text>
              </View>
              <View style={styles.chiffres}>
                <View style={styles.chiffre}>
                  <Text style={[styles.chiffreValeur, { color: colors.primary }]}>{formatDuree(stats.semaine.secondes)}</Text>
                  <Text style={[styles.chiffreLabel, { color: colors.textLight }]}>révisées</Text>
                </View>
                <View style={styles.chiffre}>
                  <Text style={[styles.chiffreValeur, { color: colors.text }]}>{stats.semaine.sessions}</Text>
                  <Text style={[styles.chiffreLabel, { color: colors.textLight }]}>session(s)</Text>
                </View>
              </View>
            </View>

            {/* Mois & total */}
            <View style={styles.grille}>
              <View style={[styles.card, styles.grilleCard, { borderColor: colors.border }]}>
                <Text style={[styles.cardTitre, { color: colors.text }]}>Ce mois</Text>
                <Text style={[styles.grilleValeur, { color: colors.primary }]}>{formatDuree(stats.mois.secondes)}</Text>
                <Text style={[styles.grilleMeta, { color: colors.textLight }]}>{stats.mois.sessions} session(s)</Text>
              </View>
              <View style={[styles.card, styles.grilleCard, { borderColor: colors.border }]}>
                <Text style={[styles.cardTitre, { color: colors.text }]}>Au total</Text>
                <Text style={[styles.grilleValeur, { color: colors.primary }]}>{formatDuree(stats.totalSecondes)}</Text>
                <Text style={[styles.grilleMeta, { color: colors.textLight }]}>
                  {stats.joursEtudies} jour(s) · {stats.totalSessions} session(s)
                </Text>
              </View>
            </View>

            {/* Répartition par méthode */}
            {stats.parMethode.length > 0 && (
              <BarsCarte
                titre="🧠 Par méthode"
                couleurs={['#4A90D9', '#50C878', '#FF9500', '#AF52DE', '#FFCC00']}
                donnees={stats.parMethode}
                styles={styles}
                colors={colors}
              />
            )}

            {/* Répartition par matière */}
            {stats.parMatiere.length > 0 && (
              <BarsCarte
                titre="📚 Par matière"
                couleurs={['#4A90D9', '#50C878', '#FF9500', '#AF52DE', '#FFCC00']}
                donnees={stats.parMatiere}
                styles={styles}
                colors={colors}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BarsCarte({
  titre,
  donnees,
  couleurs,
  styles,
  colors,
}: {
  titre: string;
  donnees: Array<{ cle: string; secondes: number }>;
  couleurs: string[];
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const max = Math.max(...donnees.map((d) => d.secondes), 1);
  const affichees = donnees.slice(0, 6);
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.cardTitre, { color: colors.text }]}>{titre}</Text>
      {affichees.map((d, i) => {
        const largeur = Math.max(4, Math.round((d.secondes / max) * 100));
        return (
          <View key={d.cle} style={styles.barreLigne}>
            <View style={styles.barreTitreLigne}>
              <Text style={[styles.barreLabel, { color: colors.text }]} numberOfLines={1}>
                {d.cle}
              </Text>
              <Text style={[styles.barreValeur, { color: colors.textLight }]}>{formatDuree(d.secondes)}</Text>
            </View>
            <View style={styles.barrePiste}>
              <View style={[styles.barre, { width: `${largeur}%`, backgroundColor: couleurs[i % couleurs.length] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    contenu: { padding: SPACING.md, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
    videCarte: { paddingVertical: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: StyleSheet.hairlineWidth,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    grille: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    grilleCard: { flex: 1 },
    enTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    plage: { fontSize: 12, textTransform: 'capitalize' },
    cardTitre: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
    chiffres: { flexDirection: 'row', gap: 24 },
    chiffre: { flex: 1 },
    chiffreValeur: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
    chiffreLabel: { fontSize: 12, marginTop: 2 },
    grilleValeur: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    grilleMeta: { fontSize: 12, marginTop: 4 },
    barreLigne: { marginBottom: 12 },
    barreTitreLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    barreLabel: { flex: 1, fontSize: 13, fontWeight: '700', marginRight: 8 },
    barrePiste: { height: 9, backgroundColor: colors.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
    barre: { height: 9, borderRadius: 5 },
    barreValeur: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  });
