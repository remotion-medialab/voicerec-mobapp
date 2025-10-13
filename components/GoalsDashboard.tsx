import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarService } from '../services/expoCalendar';
import { GoalService } from '../services/goals';
import { Goal } from '../types/goals';

interface GoalsDashboardProps {
  onBack: () => void;
}

export const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ onBack }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load goals
      const userGoals = await GoalService.getUserGoals();
      setGoals(userGoals);

      // Check calendar permission
      const permission = await calendarService.hasPermissions();
      setHasCalendarPermission(permission);

      addTestResult(`Loaded ${userGoals.length} goals`);
      addTestResult(
        permission ? 'Calendar permissions granted' : 'Calendar permissions not granted'
      );
    } catch (error) {
      console.error('Error loading data:', error);
      addTestResult(`Error loading data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addTestResult = (message: string) => {
    setTestResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRequestPermissions = async () => {
    try {
      addTestResult('Requesting calendar permissions...');
      const granted = await calendarService.promptForPermissions();

      if (granted) {
        setHasCalendarPermission(true);
        addTestResult('Calendar permissions granted!');
        Alert.alert('Success', 'Calendar permissions granted!');
      } else {
        addTestResult('Calendar permissions denied');
        Alert.alert('Denied', 'Calendar permissions were denied');
      }
    } catch (error) {
      addTestResult(`Error requesting permissions: ${error}`);
      Alert.alert('Error', `Failed to request permissions: ${error}`);
    }
  };

  const handleTestSimpleEvent = async () => {
    try {
      addTestResult('🧪 Testing simple event creation...');

      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 1); // 1 hour from now

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30); // 30 min duration

      const eventId = await calendarService.createEvent({
        title: 'Test Event - Simple',
        startDate,
        endDate,
        notes: 'This is a test event created from the Goals Dashboard',
        alarms: [15], // 15 minutes before
      });

      addTestResult(`Simple event created! ID: ${eventId}`);
      Alert.alert('Success', 'Simple event created! Check your calendar app.');
    } catch (error) {
      addTestResult(`Error creating simple event: ${error}`);
      Alert.alert('Error', `Failed to create event: ${error}`);
    }
  };

  const handleTestRecurringEvent = async () => {
    try {
      addTestResult('Testing recurring event (daily for 7 days)...');

      const startDate = new Date();
      startDate.setHours(9, 0, 0, 0); // 9:00 AM

      // If 9 AM has passed, start tomorrow
      if (startDate < new Date()) {
        startDate.setDate(startDate.getDate() + 1);
      }

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      const eventId = await calendarService.createRecurringEvent(
        {
          title: 'Test Recurring Event - Daily',
          startDate,
          endDate,
          notes: 'Daily recurring test event',
          alarms: [15],
        },
        {
          frequency: 'daily',
          interval: 1,
          occurrences: 7, // 7 days
        }
      );

      addTestResult(`Recurring event created! ID: ${eventId}`);
      Alert.alert('Success', 'Recurring event created for 7 days! Check your calendar.');
    } catch (error) {
      addTestResult(`Error creating recurring event: ${error}`);
      Alert.alert('Error', `Failed to create recurring event: ${error}`);
    }
  };

  const handleTestGoalBasedEvent = async () => {
    try {
      if (goals.length === 0) {
        Alert.alert('No Goals', 'Please create a goal first before testing goal-based events');
        return;
      }

      const goal = goals[0];
      addTestResult(`Testing goal-based event for: "${goal.goal}"...`);

      // Create event based on goal's timeOfDay
      const timeOfDay = goal.timeOfDay[0] || 'Morning';
      const startDate = new Date();

      // Set time based on goal's time of day
      switch (timeOfDay) {
        case 'Morning':
          startDate.setHours(8, 0, 0, 0);
          break;
        case 'Afternoon':
          startDate.setHours(14, 0, 0, 0);
          break;
        case 'Evening':
          startDate.setHours(19, 0, 0, 0);
          break;
      }

      if (startDate < new Date()) {
        startDate.setDate(startDate.getDate() + 1);
      }

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      // Map intensity to occurrences
      let occurrences = 7;
      if (goal.intensityFrequency === 'High (daily)') {
        occurrences = 30;
      } else if (goal.intensityFrequency === 'Medium (3x per week)') {
        occurrences = 12;
      } else if (goal.intensityFrequency === 'Low (1x per week)') {
        occurrences = 12;
      }

      const eventId = await calendarService.createRecurringEvent(
        {
          title: goal.goal,
          startDate,
          endDate,
          notes: `Intensity: ${goal.intensityFrequency}\nLocation: ${goal.locations || 'Not specified'}`,
          location: goal.locations,
          alarms: [15, 60], // 15 min and 1 hour before
        },
        {
          frequency: goal.intensityFrequency === 'Low (1x per week)' ? 'weekly' : 'daily',
          interval: goal.intensityFrequency === 'Medium (3x per week)' ? 2 : 1,
          occurrences,
        }
      );

      addTestResult(`Goal-based event created! ID: ${eventId}`);
      Alert.alert('Success', `Event created for goal: "${goal.goal}"`);
    } catch (error) {
      addTestResult(`Error creating goal-based event: ${error}`);
      Alert.alert('Error', `Failed to create goal event: ${error}`);
    }
  };

  const handleViewUpcomingEvents = async () => {
    try {
      addTestResult('Fetching upcoming events from ALL calendars...');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3); // Next 3 days

      const events = await calendarService.getAllCalendarEvents(startDate, endDate);

      addTestResult(`Found ${events.length} events across all calendars in next 3 days`);

      if (events.length > 0) {
        const eventTitles = events
          .slice(0, 10)
          .map((e) => `  • ${e.title}`)
          .join('\n');
        Alert.alert(
          'Upcoming Events (Next 3 Days)',
          `Found ${events.length} events across all calendars:\n\n${eventTitles}${events.length > 10 ? '\n  ... and more' : ''}`
        );
      } else {
        Alert.alert('No Events', 'No upcoming events found in the next 3 days');
      }
    } catch (error) {
      addTestResult(`Error fetching events: ${error}`);
      Alert.alert('Error', `Failed to fetch events: ${error}`);
    }
  };

  const handleClearTestResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Testing Dashboard</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons
                name={hasCalendarPermission ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={hasCalendarPermission ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.statusText}>
                Calendar Permissions: {hasCalendarPermission ? 'Granted' : 'Not Granted'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="flag" size={24} color="#3b82f6" />
              <Text style={styles.statusText}>Goals Created: {goals.length}</Text>
            </View>
          </View>
        </View>

        {/* Goals List */}
        {goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Goals</Text>
            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalCard}>
                <Text style={styles.goalTitle}>{goal.goal}</Text>
                <Text style={styles.goalDetail}>Time: {goal.timeOfDay.join(', ')}</Text>
                <Text style={styles.goalDetail}>Frequency: {goal.intensityFrequency}</Text>
                {goal.locations && (
                  <Text style={styles.goalDetail}>Location: {goal.locations}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar Tests</Text>

          {!hasCalendarPermission && (
            <TouchableOpacity
              style={[styles.testButton, styles.primaryButton]}
              onPress={handleRequestPermissions}>
              <Ionicons name="key" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Request Calendar Permissions</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestSimpleEvent}
            disabled={!hasCalendarPermission}>
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text style={styles.testButtonTextSecondary}>Test Simple Event (1 hour from now)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestRecurringEvent}
            disabled={!hasCalendarPermission}>
            <Ionicons name="repeat" size={20} color="#3b82f6" />
            <Text style={styles.testButtonTextSecondary}>
              Test Recurring Event (Daily for 7 days)
            </Text>
          </TouchableOpacity>

          {goals.length > 0 && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestGoalBasedEvent}
              disabled={!hasCalendarPermission}>
              <Ionicons name="flag" size={20} color="#3b82f6" />
              <Text style={styles.testButtonTextSecondary}>Test Goal-Based Event</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleViewUpcomingEvents}
            disabled={!hasCalendarPermission}>
            <Ionicons name="list" size={20} color="#3b82f6" />
            <Text style={styles.testButtonTextSecondary}>View All Events (Next 3 Days)</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results Log */}
        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Test Results Log</Text>
            <TouchableOpacity onPress={handleClearTestResults}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.logEmpty}>No test results yet. Run a test above!</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.logEntry}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Test</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionText}>1. First, request calendar permissions</Text>
            <Text style={styles.instructionText}>2. Run any test button above</Text>
            <Text style={styles.instructionText}>3. Open your device Calendar app</Text>
            <Text style={styles.instructionText}>4. Look for "My Goals" calendar</Text>
            <Text style={styles.instructionText}>5. Verify events appear correctly</Text>
            <Text style={styles.instructionText}>6. Check test results log above</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  goalDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  testButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
  },
  logEmpty: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  logEntry: {
    color: '#e5e7eb',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  instructionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
});
