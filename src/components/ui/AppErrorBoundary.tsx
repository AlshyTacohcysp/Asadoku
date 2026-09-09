import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';

interface Props {
  children: React.ReactNode;
  /** Rappelé pour remonter toute l'arborescence après une erreur. */
  onRetry?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Garde-fou global : évite un écran blanc si un rendu inattendu échoue,
 * et propose un rechargement complet à l'utilisateur (les données SQLite
 * sont persistées, rien n'est perdu).
 */
export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('💥 Erreur non gérée :', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <Erreur message={this.state.error.message} onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
}

function Erreur({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>😵</Text>
      <Text style={[styles.title, { color: colors.text }]}>Oups, une erreur inattendue</Text>
      <Text style={[styles.message, { color: colors.textLight }]} numberOfLines={4}>
        {message || "Un problème est survenu pendant l'affichage."}
      </Text>
      {onRetry ? (
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRetry}>
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Recharger l'application</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
