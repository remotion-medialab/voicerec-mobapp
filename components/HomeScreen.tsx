import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../services/auth';

interface HomeScreenProps {
  onLogMeal: () => void;
  onViewHistory: () => void;
  onSettings: () => void;
  onMealsInProgress?: () => void;
  mealSessionCount?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogMeal, onViewHistory, onSettings, onMealsInProgress, mealSessionCount }) => {
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const condition = userProfile?.condition;

  const primaryLabel =
    condition === 'A' ? 'Log a Meal' : condition === 'B' ? 'Plan a Meal' : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.contentContainer}>
        {userProfile?.dietGoal && (
          <View style={styles.goalChip}>
            <Text style={styles.goalChipText}>Goal: {userProfile.dietGoal}</Text>
          </View>
        )}

        <Text style={styles.questionText}>What would you like to do?</Text>

        <View style={styles.buttonsContainer}>
          {primaryLabel ? (
            <TouchableOpacity style={styles.primaryButton} onPress={onLogMeal} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={onLogMeal} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Log a Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={onLogMeal} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Plan a Meal</Text>
              </TouchableOpacity>
            </>
          )}

          {condition === 'B' && onMealsInProgress && (
            <TouchableOpacity style={styles.button} onPress={onMealsInProgress} activeOpacity={0.8}>
              <Text style={styles.buttonText}>
                Meals in Progress{mealSessionCount ? ` (${mealSessionCount})` : ''}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={onViewHistory} activeOpacity={0.8}>
            <Text style={styles.buttonText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onSettings} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  goalChip: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  goalChipText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 60,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
});
