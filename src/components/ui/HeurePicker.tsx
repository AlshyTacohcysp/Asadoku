import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';

const HEURES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

interface Props {
  visible: boolean;
  label: string;
  heure: string;
  minute: string;
  onHeure: (h: string) => void;
  onMinute: (m: string) => void;
  onClose: () => void;
}

/**
 * Sélecteur d'heure générique (molette heures + minutes, quarts d'heure),
 * utilisé par les formulaires de cours et de tâches.
 */
export default function HeurePicker({
  visible,
  label,
  heure,
  minute,
  onHeure,
  onMinute,
  onClose,
}: Props) {
  const colors = useThemeColors();

  if (!visible) return null;

  const Colonne = ({
    items,
    selected,
    onSelect,
    hauteurItem = 44,
  }: {
    items: string[];
    selected: string;
    onSelect: (v: string) => void;
    hauteurItem?: number;
  }) => {
    const scrollRef = useRef<ScrollView>(null);

    // Garde l'élément sélectionné centré dans la molette.
    useEffect(() => {
      const index = Math.max(0, items.indexOf(selected));
      scrollRef.current?.scrollTo({ y: Math.max(0, index * hauteurItem - 88), animated: false });
    }, [selected, items, hauteurItem]);

    return (
    <ScrollView
      ref={scrollRef}
      style={styles.colonne}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 88 }}
    >
      {items.map((item) => {
        const actif = item === selected;
        return (
          <TouchableOpacity
            key={item}
            style={[styles.item, { height: hauteurItem }, actif && { backgroundColor: colors.primarySoft }]}
            onPress={() => onSelect(item)}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.itemText,
                { color: actif ? colors.primary : colors.text },
                actif && styles.itemTextActif,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    );
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* La feuille stoppe la propagation du tap pour ne pas se fermer. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <View style={styles.dragHandle} />
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{label}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[styles.ok, { color: colors.primary }]}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.wheels}>
            <Colonne items={HEURES} selected={heure} onSelect={onHeure} />
            <Text style={[styles.separateur, { color: colors.textLight }]}>:</Text>
            <Colonne items={MINUTES} selected={minute} onSelect={onMinute} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: 32,
    paddingTop: 10,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7CBD4',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '700' },
  ok: { fontSize: 16, fontWeight: '700' },
  wheels: { flexDirection: 'row', height: 220 },
  colonne: { flex: 1 },
  item: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 10, borderRadius: RADIUS.sm },
  itemText: { fontSize: 18 },
  itemTextActif: { fontWeight: '700' },
  separateur: { fontSize: 22, fontWeight: '800', alignSelf: 'center', marginHorizontal: 2 },
});
