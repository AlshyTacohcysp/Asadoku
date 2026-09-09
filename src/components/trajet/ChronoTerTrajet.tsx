import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { formatChrono } from '../../utils/format';
import { RADIUS, FONT_SIZES } from '../../constants/theme';
import type { IconName } from '../../navigation/types';

interface Props {
  /** Temps de trajet moyen connu (secondes) — affiché à titre de référence. */
  referenceSecondes?: number;
  /** Appelé quand l'utilisateur confirme l'enregistrement du trajet. */
  onTrajetEnd: (dureeSecondes: number) => void | Promise<void>;
}

type Etat = 'repos' | 'course' | 'termine';

/**
 * Chronomètre de trajet. Le temps est calculé depuis l'horloge (et non par
 * accumulation d'intervalles) pour rester juste même si l'application est
 * brièvement suspendue. L'enregistrement est volontaire (jamais automatique).
 */
export default function ChronometreTrajet({ referenceSecondes, onTrajetEnd }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [etat, setEtat] = useState<Etat>('repos');
  const [secondes, setSecondes] = useState(0);
  const [saving, setSaving] = useState(false);
  const departRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const arreterCompteur = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const demarrer = () => {
    departRef.current = Date.now();
    setEtat('course');
    arreterCompteur();
    intervalRef.current = setInterval(() => {
      setSecondes(Math.max(0, Math.floor((Date.now() - departRef.current) / 1000)));
    }, 250);
  };

  const arriver = () => {
    if (secondes < 5) {
      setEtat('repos');
      setSecondes(0);
      arreterCompteur();
      return;
    }
    arreterCompteur();
    setEtat('termine');
  };

  const enregistrer = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onTrajetEnd(secondes);
    } finally {
      setSaving(false);
      setEtat('repos');
      setSecondes(0);
    }
  };

  const reinitialiser = () => {
    arreterCompteur();
    setEtat('repos');
    setSecondes(0);
  };

  const Bouton = ({
    label,
    icone,
    couleur,
    texteCouleur,
    onPress,
    desactive,
  }: {
    label: string;
    icone: IconName;
    couleur: string;
    texteCouleur: string;
    onPress: () => void;
    desactive?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.bouton, { backgroundColor: couleur }, desactive && styles.boutonDesactive]}
      onPress={onPress}
      disabled={desactive}
      activeOpacity={0.85}
    >
      <Ionicons name={icone} size={22} color={texteCouleur} />
      <Text style={[styles.boutonTexte, { color: texteCouleur }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.chrono, { color: colors.text }]}>{formatChrono(secondes)}</Text>
      <Text style={[styles.sousTitre, { color: colors.textLight }]}>
        {etat === 'course'
          ? 'En route… appuyez sur « Arrivée » une fois sur place.'
          : etat === 'termine'
            ? 'Voulez-vous enregistrer ce trajet ?'
            : 'Lancez le chrono au départ.'}
      </Text>

      {typeof referenceSecondes === 'number' && referenceSecondes > 0 && (
        <View style={[styles.reference, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="trending-up" size={15} color={colors.primary} />
          <Text style={[styles.referenceTexte, { color: colors.primary }]}>
            Moyenne connue : {Math.round(referenceSecondes / 60)} min
          </Text>
        </View>
      )}

      <View style={styles.controles}>
        {etat === 'repos' && (
          <Bouton
            label="Démarrer"
            icone="play"
            couleur={colors.success}
            texteCouleur="#FFFFFF"
            onPress={demarrer}
          />
        )}

        {etat === 'course' && (
          <Bouton
            label="Arrivée"
            icone="flag"
            couleur={colors.primary}
            texteCouleur={colors.onPrimary}
            onPress={arriver}
          />
        )}

        {etat === 'termine' && (
          <>
            <Bouton
              label="Enregistrer"
              icone="checkmark-circle"
              couleur={colors.success}
              texteCouleur="#FFFFFF"
              onPress={enregistrer}
              desactive={saving}
            />
            <Bouton
              label="Recommencer"
              icone="refresh"
              couleur={colors.surfaceAlt}
              texteCouleur={colors.text}
              onPress={reinitialiser}
            />
          </>
        )}

        {(etat === 'course' || etat === 'termine') && (
          <TouchableOpacity style={styles.annuler} onPress={reinitialiser} hitSlop={8}>
            <Ionicons name="close-circle" size={24} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {etat === 'termine' && (
        <Text style={[styles.aide, { color: colors.textLight }]}>
          Votre moyenne sera mise à jour automatiquement.
        </Text>
      )}
    </View>
  );
}

const createStyles = (_colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
    chrono: {
      fontSize: 56,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    sousTitre: { fontSize: 13, marginTop: 2, textAlign: 'center' },
    reference: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
    },
    referenceTexte: { fontSize: 13, fontWeight: '600' },
    controles: { flexDirection: 'row', gap: 12, marginTop: 22, alignItems: 'center' },
    bouton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: RADIUS.md,
    },
    boutonDesactive: { opacity: 0.5 },
    boutonTexte: { fontSize: FONT_SIZES.md, fontWeight: '700' },
    annuler: { padding: 4 },
    aide: { fontSize: 12, marginTop: 16, textAlign: 'center' },
  });
