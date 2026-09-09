import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStyles, useTheme, useThemeColors, type ThemePref } from '../context/ThemeContext';
import { getParametres, saveParametres, totalAvanceMinutes } from '../services/ParametresService';
import {
  hasNotificationPermission,
  requestPermissions,
  setupNotifications,
  syncNotifications,
  type SyncResult,
} from '../services/AlarmeService';
import { exportData, importData } from '../services/ExportService';
import { formatHeureTexte } from '../utils/format';
import { RADIUS, SPACING } from '../constants/theme';

const METHODES_DISPONIBLES = ['Pomodoro', 'Feynman', 'MindMap', 'Exercices', 'Lecture', 'Flashcards'];
const SONS = [
  { id: 'default', nom: 'Défaut' },
  { id: 'alarm', nom: 'Alarme' },
  { id: 'notification', nom: 'Notification' },
  { id: 'ringtone', nom: 'Sonnerie' },
];
const PRESSIONS = [
  { id: 'system' as ThemePref, libelle: 'Auto' },
  { id: 'light' as ThemePref, libelle: 'Clair' },
  { id: 'dark' as ThemePref, libelle: 'Sombre' },
];

export default function ParametresScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { pref: prefTheme, setPref: setPrefTheme } = useTheme();

  const [nom, setNom] = useState('');
  const [adresseDomicile, setAdresseDomicile] = useState('');
  const [adresseEcole, setAdresseEcole] = useState('');
  const [methodeDefaut, setMethodeDefaut] = useState('Pomodoro');
  const [prep, setPrep] = useState(20);
  const [trajet, setTrajet] = useState(15);
  const [marge, setMarge] = useState(5);
  const [sonnerie, setSonnerie] = useState('default');
  const [sonPath, setSonPath] = useState('');

  const [notifsActivees, setNotifsActivees] = useState(false);
  const [occupé, setOccupé] = useState<'sauver' | 'exporter' | 'importer' | null>(null);

  const charger = useCallback(async () => {
    const [params, permission] = await Promise.all([getParametres(), hasNotificationPermission()]);
    setNom(params.nom);
    setAdresseDomicile(params.adresse_domicile);
    setAdresseEcole(params.adresse_etablissement);
    setMethodeDefaut(params.methode_defaut || 'Pomodoro');
    setPrep(params.temps_preparation);
    setTrajet(params.temps_trajet);
    setMarge(params.marge_securite);
    setSonnerie(params.sonnerie || 'default');
    setSonPath(params.sonnerie_path || '');
    setNotifsActivees(permission);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const sauvegarder = async () => {
    setOccupé('sauver');
    try {
      await saveParametres({
        nom: nom.trim() || 'Étudiant',
        adresse_domicile: adresseDomicile.trim(),
        adresse_etablissement: adresseEcole.trim(),
        methode_defaut: methodeDefaut,
        temps_preparation: prep,
        temps_trajet: trajet,
        marge_securite: marge,
        sonnerie,
        sonnerie_path: sonnerie === 'custom' ? sonPath : '',
      });

      // Les réglages d'alarme ont changé → échéancier recalculé.
      const resultat: SyncResult = await syncNotifications();
      if (resultat.permission) {
        Alert.alert(
          'Paramètres enregistrés ✅',
          `${resultat.cours} alarme(s) de cours et ${resultat.rappels} rappel(s) de tâches programmés.`,
        );
      } else {
        Alert.alert(
          'Paramètres enregistrés',
          'Les notifications sont désactivées : activez-les pour recevoir les alarmes de départ.',
        );
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d’enregistrer les paramètres.');
      console.error(err);
    } finally {
      setOccupé(null);
    }
  };

  const activerNotifications = async () => {
    await setupNotifications();
    const accordee = await requestPermissions();
    if (accordee) {
      await syncNotifications();
      setNotifsActivees(true);
      Alert.alert('Notifications activées ✅', 'Alarmes et rappels sont maintenant programmés.');
    } else {
      Alert.alert(
        'Notifications refusées',
        Platform.OS === 'ios'
          ? "Activez les notifications pour Asadoku dans Réglages > Notifications."
          : 'Activez les notifications pour Asadoku dans les réglages de l’appareil.',
      );
    }
  };

  const exporter = async () => {
    setOccupé('exporter');
    try {
      const { filename } = await exportData();
      Alert.alert('Export terminé ✅', `Le fichier « ${filename} » a été généré.`);
    } catch (err) {
      Alert.alert('Export impossible', 'Une erreur est survenue pendant l’export.');
      console.error(err);
    } finally {
      setOccupé(null);
    }
  };

  const importer = () => {
    Alert.alert(
      '⚠️ Remplacer les données ?',
      'L’import remplace TOUTES vos données actuelles (cours, tâches, historique). Une fois confirmé, il ne peut pas être annulé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          style: 'destructive',
          onPress: async () => {
            setOccupé('importer');
            try {
              const fait = await importData();
              if (fait) {
                await syncNotifications();
                await charger();
                Alert.alert('Import terminé ✅', 'Vos données ont été restaurées et les rappels reprogrammés.');
              }
            } catch {
              Alert.alert('Import impossible', 'Fichier invalide ou illisible.');
            } finally {
              setOccupé(null);
            }
          },
        },
      ],
    );
  };

  const choisirSon = async () => {
    try {
      const resultat = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (resultat.canceled || !resultat.assets[0]) return;
      const fichier = resultat.assets[0];
      const extension = fichier.name.split('.').pop() || 'm4a';
      const nouveauNom = `sonnerie_${Date.now()}.${extension}`;
      const nouveauChemin = `${FileSystem.documentDirectory}${nouveauNom}`;
      await FileSystem.copyAsync({ from: fichier.uri, to: nouveauChemin });
      setSonPath(nouveauChemin);
      setSonnerie('custom');
      Alert.alert(
        'Son personnalisé sélectionné 🎵',
        Platform.OS === 'ios'
          ? 'Il sera utilisé pour les alarmes de cours.'
          : 'Sur Android, le son dépend du canal système (le son par défaut sera utilisé tant que des sons natifs ne sont pas inclus).',
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de lire ce fichier audio.');
    }
  };

  const stepper = (label: string, valeur: number, setValeur: (n: number) => void, min: number, max: number, pas = 5, unite = 'min') => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.boutonStepper, { backgroundColor: colors.surfaceAlt }]}
          onPress={() => setValeur(Math.max(min, valeur - pas))}
          disabled={valeur <= min}
          accessibilityLabel={`Réduire de ${pas}`}
        >
          <Text style={[styles.boutonStepperTexte, { color: valeur <= min ? colors.placeholder : colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.valeur, { color: colors.text }]}>
          {valeur} {unite}
        </Text>
        <TouchableOpacity
          style={[styles.boutonStepper, { backgroundColor: colors.surfaceAlt }]}
          onPress={() => setValeur(Math.min(max, valeur + pas))}
          disabled={valeur >= max}
          accessibilityLabel={`Augmenter de ${pas}`}
        >
          <Text style={[styles.boutonStepperTexte, { color: valeur >= max ? colors.placeholder : colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const avance = totalAvanceMinutes({ temps_preparation: prep, temps_trajet: trajet, marge_securite: marge });
  const hAvance = Math.floor(avance / 60);
  const mAvance = avance % 60;
  const departExemple = new Date();
  departExemple.setHours(8, 0, 0, 0);
  departExemple.setMinutes(departExemple.getMinutes() - avance);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>⚙️ Paramètres</Text>

        {/* Profil */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <Text style={[styles.carteTitre, { color: colors.text }]}>👤 Profil</Text>
          <Text style={[styles.label, { color: colors.textLight }]}>Votre nom</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={nom}
            onChangeText={setNom}
            placeholder="Ex : Alex"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.label, { color: colors.textLight }]}>Adresse du domicile</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={adresseDomicile}
            onChangeText={setAdresseDomicile}
            placeholder="Optionnel"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.label, { color: colors.textLight }]}>Adresse de l’établissement</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={adresseEcole}
            onChangeText={setAdresseEcole}
            placeholder="Optionnel"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Méthode de révision par défaut */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <Text style={[styles.carteTitre, { color: colors.text }]}>📚 Révisions</Text>
          <Text style={[styles.label, { color: colors.textLight }]}>Méthode par défaut (onglet Étude)</Text>
          <View style={styles.wrap}>
            {METHODES_DISPONIBLES.map((m) => {
              const actif = methodeDefaut === m;
              return (
                <TouchableOpacity key={m} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setMethodeDefaut(m)}>
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Alarmes */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <Text style={[styles.carteTitre, { color: colors.text }]}>⏰ Alarmes de cours</Text>
          {stepper('Temps de préparation', prep, setPrep, 0, 120)}
          {stepper('Temps de trajet estimé', trajet, setTrajet, 0, 180)}
          {stepper('Marge de sécurité', marge, setMarge, 0, 60, 5)}
          <View style={[styles.info, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.infoTexte, { color: colors.primary }]}>
              📐 Exemple : pour un cours à 8 h 00, l’alarme sonne à {formatHeureTexte(`${String(departExemple.getHours()).padStart(2, '0')}:${String(departExemple.getMinutes()).padStart(2, '0')}`)} (soit {hAvance > 0 ? `${hAvance} h ` : ''}{mAvance} min avant).
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textLight }]}>Son des alarmes</Text>
          <View style={styles.wrap}>
            {SONS.map((s) => {
              const actif = sonnerie === s.id;
              return (
                <TouchableOpacity key={s.id} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => { setSonnerie(s.id); setSonPath(''); }}>
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{s.nom}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.chip, styles.chipSon, sonnerie === 'custom' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={choisirSon}
          >
            <Text style={[styles.chipTexte, { color: sonnerie === 'custom' ? colors.onPrimary : colors.text }]}>
              {sonnerie === 'custom' ? `✓ ${sonPath.split('/').pop() || 'Son personnalisé'}` : '🎵 Choisir un son personnalisé…'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.mention, { color: colors.textLight }]}>
            Les sons avancés dépendent des sons natifs inclus dans l’application ; « Défaut » reste le plus fiable.
          </Text>
        </View>

        {/* Notifications */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <View style={styles.ligneTitre}>
            <Text style={[styles.carteTitre, { color: colors.text }]}>🔔 Notifications</Text>
            <View style={[styles.pillStatut, { backgroundColor: notifsActivees ? colors.success : colors.danger }]}>
              <Text style={styles.pillStatutTexte}>{notifsActivees ? 'Activées' : 'Désactivées'}</Text>
            </View>
          </View>
          <Text style={[styles.mention, { color: colors.textLight }]}>
            Les alarmes « départ » pour vos cours et les rappels de tâches sont gérés localement sur cet appareil.
          </Text>
          {!notifsActivees && (
            <TouchableOpacity style={[styles.bouton, { backgroundColor: colors.primary }]} onPress={activerNotifications}>
              <Text style={[styles.boutonTexte, { color: colors.onPrimary }]}>Autoriser les notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Apparence */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <Text style={[styles.carteTitre, { color: colors.text }]}>🎨 Apparence</Text>
          <View style={styles.wrap}>
            {PRESSIONS.map((p) => {
              const actif = prefTheme === p.id;
              return (
                <TouchableOpacity key={p.id} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setPrefTheme(p.id)}>
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                    {p.id === 'system' ? '📱 ' : p.id === 'dark' ? '🌙 ' : '☀️ '}
                    {p.libelle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.mention, { color: colors.textLight }]}>
            « Auto » suit automatiquement l’apparence de votre appareil.
          </Text>
        </View>

        {/* Sauvegarde */}
        <View style={[styles.carte, { borderColor: colors.border }]}>
          <Text style={[styles.carteTitre, { color: colors.text }]}>💾 Sauvegarde</Text>
          <Text style={[styles.mention, { color: colors.textLight }]}>
            Exportez toutes vos données (cours, tâches, historique) dans un fichier JSON, ou restaurez une sauvegarde.
          </Text>
          <View style={styles.rowBoutons}>
            <TouchableOpacity
              style={[styles.bouton, styles.boutonFlex, { backgroundColor: colors.primary }]}
              onPress={exporter}
              disabled={occupé !== null}
            >
              {occupé === 'exporter' ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.boutonTexte, { color: colors.onPrimary }]}>📤 Exporter</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bouton, styles.boutonFlex, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
              onPress={importer}
              disabled={occupé !== null}
            >
              {occupé === 'importer' ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.boutonTexte, { color: colors.primary }]}>📥 Importer</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* À propos */}
        <Text style={[styles.aPropos, { color: colors.textLight }]}>
          Asadoku {Constants.expoConfig?.version || ''} · vos données restent sur cet appareil.
        </Text>

        <TouchableOpacity
          style={[styles.bouton, styles.boutonSauver, { backgroundColor: colors.success }]}
          onPress={sauvegarder}
          disabled={occupé !== null}
        >
          {occupé === 'sauver' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.boutonTexte, { color: '#fff' }]}>💾 Sauvegarder et reprogrammer les alarmes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    contenu: { padding: SPACING.md, paddingBottom: 44 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
    carte: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: StyleSheet.hairlineWidth,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    carteTitre: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 12, marginBottom: 6 },
    input: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 15,
    },
    section: { marginBottom: 4 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    boutonStepper: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    boutonStepperTexte: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
    valeur: { fontSize: 22, fontWeight: '800', minWidth: 100, textAlign: 'center', fontVariant: ['tabular-nums'] },
    info: { borderRadius: RADIUS.md, padding: 12, marginTop: 14 },
    infoTexte: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSon: { marginTop: 10, alignSelf: 'flex-start' },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    mention: { fontSize: 12, marginTop: 10, lineHeight: 17 },
    ligneTitre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pillStatut: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
    pillStatutTexte: { color: '#fff', fontSize: 11, fontWeight: '800' },
    bouton: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    boutonTexte: { fontSize: 15, fontWeight: '800' },
    rowBoutons: { flexDirection: 'row', gap: 10 },
    boutonFlex: { flex: 1 },
    boutonSauver: { marginTop: 6 },
    aPropos: { fontSize: 11, textAlign: 'center', marginBottom: 12 },
  });
