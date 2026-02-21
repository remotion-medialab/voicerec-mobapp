import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModeSelectionScreenProps {
  onBack: () => void;
  onCookAtHome: () => void;
  onEatOut: () => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  onBack,
  onCookAtHome,
  onEatOut,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Plan Your Meal</Text>
      <Text style={styles.subtitle}>What are you thinking?</Text>

      <View style={styles.cardsContainer}>
        <TouchableOpacity style={styles.card} onPress={onCookAtHome} activeOpacity={0.8}>
          <Text style={styles.cardIcon}>🏠</Text>
          <Text style={styles.cardTitle}>Cook at Home</Text>
          <Text style={styles.cardDesc}>Get recipe ideas based on your ingredients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={onEatOut} activeOpacity={0.8}>
          <Text style={styles.cardIcon}>🍴</Text>
          <Text style={styles.cardTitle}>Eat Out</Text>
          <Text style={styles.cardDesc}>Get recommendations from a menu photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: { marginBottom: 24 },
  backText: { fontSize: 16, color: '#6b7280' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 40 },
  cardsContainer: { gap: 16 },
  card: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  cardIcon: { fontSize: 40, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
