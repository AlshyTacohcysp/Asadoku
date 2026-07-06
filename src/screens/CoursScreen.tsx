import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants/theme";
import { getAllCours, deleteCours, Cours } from "../services/CoursService";
import { JOURS } from "../constants/jour";
import CoursForm from "../components/cours/CoursForm";

export default function CoursScreen() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJour, setSelectedJour] = useState<string>("Tous");
  const [showForm, setShowForm] = useState(false);

  const loadCours = useCallback(async () => {
    try {
      const data = await getAllCours();
      setCours(data);
    } catch (error) {
      console.error("Erreur chargement cours:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCours();
  }, [loadCours]);

  // Filtrer par jour si nécessaire
  const coursFiltres =
    selectedJour === "Tous"
      ? cours
      : cours.filter((c) => c.jour === selectedJour);

  // Grouper par jour pour l'affichage
  const coursGroupes = coursFiltres.reduce(
    (acc, cours) => {
      if (!acc[cours.jour]) {
        acc[cours.jour] = [];
      }
      acc[cours.jour].push(cours);
      return acc;
    },
    {} as Record<string, Cours[]>,
  );

  // Supprimer un cours
  const handleDelete = (id: number, matiere: string) => {
    Alert.alert(
      "Supprimer le cours",
      `Voulez-vous vraiment supprimer "${matiere}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await deleteCours(id);
            loadCours();
          },
        },
      ],
    );
  };

  // Ajouter un cours (placeholder pour la Phase 4)
  const handleAddCours = () => {
    setShowForm(true);
  };

  const renderCoursItem = ({ item }: { item: Cours }) => (
    <View style={styles.coursCard}>
      <View style={styles.coursHeader}>
        <View style={styles.coursInfo}>
          <Text style={styles.matiere}>{item.matiere}</Text>
          <Text style={styles.professeur}>{item.professeur}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.matiere)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      <View style={styles.coursDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.detailText}>
            {item.heure_debut} - {item.heure_fin}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={COLORS.textLight}
          />
          <Text style={styles.detailText}>{item.salle}</Text>
        </View>
      </View>
    </View>
  );

  const renderJourSection = (jour: string, coursDuJour: Cours[]) => (
    <View key={jour} style={styles.section}>
      <Text style={styles.jourTitle}>{jour}</Text>
      {coursDuJour.map((c) => (
        <View key={c.id.toString()}>{renderCoursItem({ item: c })}</View>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>📚 Mes cours</Text>
        <TouchableOpacity onPress={handleAddCours} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtres par jour */}
      <View style={styles.filtresContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["Tous", ...JOURS]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filtresList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filtreButton,
                selectedJour === item && styles.filtreButtonActive,
              ]}
              onPress={() => setSelectedJour(item)}
            >
              <Text
                style={[
                  styles.filtreText,
                  selectedJour === item && styles.filtreTextActive,
                ]}
              >
                {item === "Tous" ? "Tous" : item.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Liste des cours */}
      {coursFiltres.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color={COLORS.grey} />
          <Text style={styles.emptyText}>Aucun cours</Text>
          <Text style={styles.emptyHint}>
            Ajoutez votre emploi du temps avec le bouton +
          </Text>
        </View>
      ) : selectedJour === "Tous" ? (
        <FlatList
          data={Object.keys(coursGroupes)}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderJourSection(item, coursGroupes[item])}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadCours} />
          }
        />
      ) : (
        <FlatList
          data={coursFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCoursItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadCours} />
          }
        />
      )}
      <CoursForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCoursAdded={loadCours}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
  },
  addButton: {
    padding: SPACING.xs,
  },
  filtresContainer: {
    paddingVertical: SPACING.sm,
  },
  filtresList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filtreButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  filtreButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filtreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  filtreTextActive: {
    color: COLORS.surface,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  jourTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  coursCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  coursHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  coursInfo: {
    flex: 1,
  },
  matiere: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  professeur: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  coursDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  emptyHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.grey,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
