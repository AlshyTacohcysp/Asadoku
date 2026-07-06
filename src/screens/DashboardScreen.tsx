import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from '../constants/theme';
import { getCoursByJour, Cours } from '../services/CoursService';
import { getTodosByDate, Todo } from '../services/TodoService';

export default function DashboardScreen() {
  const [coursDuJour, setCoursDuJour] = useState<Cours[]>([]);
  const [todosDuJour, setTodosDuJour] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Date du jour en français
  const aujourdhui = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const dateTexte = aujourdhui.toLocaleDateString('fr-FR', options);
  
  // Jour de la semaine (pour les cours)
  const joursFrancais = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const jourActuel = joursFrancais[aujourdhui.getDay()];
  
  // Date au format YYYY-MM-DD (pour les todos)
  const dateISO = aujourdhui.toISOString().split('T')[0];

  useEffect(() => {
    async function loadData() {
      try {
        const cours = await getCoursByJour(jourActuel);
        const todos = await getTodosByDate(dateISO);
        setCoursDuJour(cours);
        setTodosDuJour(todos);
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Déterminer le prochain cours
  const heureActuelle = aujourdhui.getHours() * 60 + aujourdhui.getMinutes();
  const prochainCours = coursDuJour.find(cours => {
    const [h, m] = cours.heure_debut.split(':').map(Number);
    return (h * 60 + m) > heureActuelle;
  });

  // Afficher max 3 todos
  const todosAffiches = todosDuJour.slice(0, 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.date}>{dateTexte}</Text>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {/* Carte "Prochain cours" */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📚 Prochain cours</Text>
          {prochainCours ? (
            <View style={styles.coursInfo}>
              <Text style={styles.matiere}>{prochainCours.matiere}</Text>
              <Text style={styles.detail}>
                🕐 {prochainCours.heure_debut} - {prochainCours.heure_fin}
              </Text>
              <Text style={styles.detail}>📍 {prochainCours.salle}</Text>
              <Text style={styles.detail}>👨‍🏫 {prochainCours.professeur}</Text>
            </View>
          ) : coursDuJour.length > 0 ? (
            <Text style={styles.emptyText}>Plus de cours aujourd'hui 🎉</Text>
          ) : (
            <View>
              <Text style={styles.emptyText}>Aucun cours aujourd'hui</Text>
              <Text style={styles.hint}>
                Ajoutez votre emploi du temps dans l'onglet Cours
              </Text>
            </View>
          )}
        </View>

        {/* Carte "À faire" */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 À faire aujourd'hui</Text>
          {todosAffiches.length > 0 ? (
            todosAffiches.map((todo, index) => (
              <View key={todo.id} style={styles.todoItem}>
                <View style={styles.todoHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(todo.priorite) }]}>
                    <Text style={styles.priorityText}>P{todo.priorite}</Text>
                  </View>
                  <Text style={styles.todoTitle} numberOfLines={1}>
                    {todo.titre}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View>
              <Text style={styles.emptyText}>Aucune tâche</Text>
              <Text style={styles.hint}>
                Ajoutez vos tâches dans l'onglet Tâches
              </Text>
            </View>
          )}
          {todosDuJour.length > 3 && (
            <Text style={styles.moreText}>+{todosDuJour.length - 3} autres tâches</Text>
          )}
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>🚶 Démarrer trajet</Text>
          </View>
          <View style={[styles.actionButton, styles.actionButtonPrimary]}>
            <Text style={[styles.actionText, styles.actionTextWhite]}>
              ⏱️ Lancer révision
            </Text>
          </View>
        </View>

        {/* Alarme de secours */}
        <View style={styles.alarmeSecours}>
          <Text style={styles.alarmeText}>⏰ Définir alarme système</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Helper pour la couleur de priorité
function getPriorityColor(priorite: number): string {
  const colors: Record<number, string> = {
    5: '#FF3B30',
    4: '#FF9500',
    3: '#FFCC00',
    2: '#34C759',
    1: '#8E8E93',
  };
  return colors[priorite] || '#8E8E93';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  date: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  coursInfo: {
    gap: SPACING.xs,
  },
  matiere: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  detail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  todoItem: {
    marginBottom: SPACING.sm,
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  todoTitle: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  moreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  actionTextWhite: {
    color: COLORS.surface,
  },
  alarmeSecours: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  alarmeText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});