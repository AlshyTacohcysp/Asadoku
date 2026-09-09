import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import type { IconName } from '../../navigation/types';

interface Props {
  icon: IconName;
  titre: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** État vide homogène utilisé sur tous les écrans. */
export default function EmptyState({ icon, titre, message, actionLabel, onAction }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.cercle, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={34} color={colors.placeholder} />
      </View>
      <Text style={[styles.titre, { color: colors.text }]}>{titre}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textLight }]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  cercle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titre: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  action: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999 },
  actionText: { fontSize: 15, fontWeight: '700' },
});
