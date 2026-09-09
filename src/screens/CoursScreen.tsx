import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStyles, useThemeColors } from '../context/ThemeContext';
import { getAllCours, deleteCours, type Cours } from '../services/CoursService';
import { syncNotifications } from '../services/AlarmeService';
import { JOURS, jourIndex, nomJour, type Jour } from '../constants/jour';
import { minutesDepuisMinuit } from '../utils/date';
import { RADIUS, SPACING } from '../constants/theme';
import CoursForm from '../components/cours/CoursForm';
import EmptyState from '../components/ui/EmptyState';

type Filtre = Jour | 'Tous';

export default function CoursScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('Tous');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cours | null>(null);

  const charger = useCallback(async (silencieux = false) => {
    if (!silencieux) setLoading(true);
    try {
      setCours(await getAllCours());
    } catch (err) {
      console.error('Erreur de chargement des cours :', err);
      Alert.alert('Erreur', 'Impossible de charger l’emploi du temps.');
    } finally {
      setLoading(false);
      setRafraichissement(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const listeFiltree = useMemo(() => {
    const source = filtre === 'Tous' ? cours : cours.filter((c) => c.jour === filtre);
    return [...source].sort((a, b) => {
      const ordreJour = JOURS.indexOf(a.jour as Jour) - JOURS.indexOf(b.jour as Jour);
      return ordreJour !== 0 ? ordreJour : a.heure_debut.localeCompare(b.heure_debut);
    });
  }, [cours, filtre]);

  const sections = useMemo(() => {
    if (filtre !== 'Tous') {
      return listeFiltree.length > 0
        ? [{ title: filtre, data: listeFiltree }]
        : [];
    }
    return JOURS.map((jour) => ({
      title: jour,
      data: listeFiltree.filter((c) => c.jour === jour),
    })).filter((s) => s.data.length > 0);
  }, [filtre, listeFiltree]);

  const supprimer = (coursItem: Cours) => {
    Alert.alert(
      'Supprimer ce cours ?',
      `« ${coursItem.matiere} » du ${coursItem.jour} à ${coursItem.heure_debut} sera supprimé. Les rappels correspondants seront annulés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCours(coursItem.id);
              await syncNotifications();
              charger(true);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer ce cours.');
            }
          },
        },
      ],
    );
  };

  const ouvrirAjout = () => {
    setEditing(null);
    setShowForm(true);
  };

  const ouvrirEdition = (c: Cours) => {
    setEditing(c);
    setShowForm(true);
  };

  const renderItem = ({ item }: { item: Cours }) => {
    const maintenant = new Date();
    const estAujourdhui = item.jour === nomJour(maintenant);
    const dans = estAujourdhui
      ? minutesDepuisMinuit(item.heure_debut) - (maintenant.getHours() * 60 + maintenant.getMinutes())
      : null;
    const enCours =
      estAujourdhui &&
      minutesDepuisMinuit(item.heure_debut) <= maintenant.getHours() * 60 + maintenant.getMinutes() &&
      maintenant.getHours() * 60 + maintenant.getMinutes() < minutesDepuisMinuit(item.heure_fin);

    return (
      <TouchableOpacity
        style={styles.carte}
        onPress={() => ouvrirEdition(item)}
        activeOpacity={0.7}
      >
        <View style={styles.blocHeure}>
          <Text style={[styles.heureDebut, { color: colors.text }]}>{item.heure_debut}</Text>
          <Text style={[styles.heureFin, { color: colors.textLight }]}>{item.heure_fin}</Text>
        </View>
        <View style={styles.infos}>
          <View style={styles.ligneMatiere}>
            <Text style={[styles.matiere, { color: colors.text }]} numberOfLines={1}>
              {item.matiere}
            </Text>
            {enCours ? (
              <View style={[styles.tagEnCours, { backgroundColor: colors.success }]}>
                <Text style={styles.tagEnCoursTexte}>En cours</Text>
              </View>
            ) : dans !== null && dans >= 0 && dans < 180 ? (
              <Text style={[styles.tagBientot, { color: colors.warning }]}>Dans {dans} min</Text>
            ) : null}
          </View>
          <Text style={[styles.detail, { color: colors.textLight }]} numberOfLines={1}>
            📍 {item.salle}
            {item.professeur ? ` · ${item.professeur}` : ''}
          </Text>
        </View>
        <View style={styles.actionsCarte}>
          <TouchableOpacity onPress={() => ouvrirEdition(item)} hitSlop={10} style={styles.boutonIcone}>
            <Ionicons name="pencil-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => supprimer(item)} hitSlop={10} style={styles.boutonIcone}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const aujourdhuiIdx = jourIndex(new Date());

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>📚 Mes cours</Text>
          <Text style={[styles.sousTitre, { color: colors.textLight }]}>
            {cours.length} cours actifs
          </Text>
        </View>
        <TouchableOpacity
          style={styles.boutonAjout}
          onPress={ouvrirAjout}
          accessibilityLabel="Ajouter un cours"
        >
          <Ionicons name="add" size={26} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filtres par jour */}
      <View style={styles.filtres}>
        {(['Tous', ...JOURS] as const).map((j, index) => {
          const estAujourdhui = index > 0 && index - 1 === aujourdhuiIdx;
          const actif = filtre === j;
          return (
            <TouchableOpacity
              key={j}
              style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFiltre(j as Filtre)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                {index === 0 ? 'Tous' : estAujourdhui ? 'Auj.' : j.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && cours.length === 0 ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centre}>
          <EmptyState
            icon="calendar-outline"
            titre={cours.length === 0 ? 'Aucun cours' : `Rien le ${filtre}`}
            message={
              cours.length === 0
                ? 'Ajoutez votre premier cours pour commencer à organiser votre semaine.'
                : 'Aucun cours prévu ce jour-là.'
            }
            actionLabel="Ajouter un cours"
            onAction={ouvrirAjout}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitre, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.sectionCompte, { color: colors.textLight }]}>
                {section.data.length} cours
              </Text>
            </View>
          )}
          renderItem={renderItem}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={async () => {
                setRafraichissement(true);
                await charger(true);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              titre="Aucun résultat"
              message="Modifiez votre filtre ou ajoutez un cours."
            />
          }
        />
      )}

      <CoursForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => charger(true)}
        editingCours={editing}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centre: { flex: 1, justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: 10,
      paddingBottom: 6,
    },
    title: { fontSize: 24, fontWeight: '800' },
    sousTitre: { fontSize: 13, marginTop: 2 },
    boutonAjout: {
      backgroundColor: colors.primary,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    filtres: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: SPACING.md,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    liste: { paddingHorizontal: SPACING.md, paddingBottom: 24 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 14,
      marginBottom: 8,
    },
    sectionTitre: { fontSize: 16, fontWeight: '800' },
    sectionCompte: { fontSize: 12, fontWeight: '600' },
    carte: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    blocHeure: { width: 54, alignItems: 'center' },
    heureDebut: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
    heureFin: { fontSize: 12, marginTop: 1 },
    infos: { flex: 1, marginHorizontal: 8 },
    ligneMatiere: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    matiere: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
    tagEnCours: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    tagEnCoursTexte: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    tagBientot: { fontSize: 11, fontWeight: '700' },
    detail: { fontSize: 12, marginTop: 3 },
    actionsCarte: { flexDirection: 'row' },
    boutonIcone: { padding: 4, marginLeft: 6 },
  });
