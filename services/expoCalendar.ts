import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * Expo Calendar Service
 */

interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  alarms?: number[]; // Minutes before event
}

class ExpoCalendarService {
  private defaultCalendarId: string | null = null;

  /**
   * Request calendar permissions
   * This is ALL you need for authentication!
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('Requesting calendar permissions...');

      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status === 'granted') {
        console.log('Calendar permissions granted');

        // Save permission status to user profile
        const user = auth.currentUser;
        if (user) {
          await this.savePermissionStatus(user.uid, true);
        }

        return true;
      } else {
        console.log('Calendar permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  /**
   * Check if we have calendar permissions
   */
  async hasPermissions(): Promise<boolean> {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get or create default calendar for the app
   * iOS: Creates calendar in iCloud or local
   * Android: Creates calendar in Google Calendar or local
   */
  async getDefaultCalendar(): Promise<string> {
    try {
      // Return cached calendar ID if we have it
      if (this.defaultCalendarId) {
        return this.defaultCalendarId;
      }

      // Check permissions first
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      // Get all calendars
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log(`Found ${calendars.length} calendars on device`);

      // Look for our app's calendar
      const appCalendar = calendars.find(
        (cal) => cal.title === 'My Goals' && cal.allowsModifications
      );

      if (appCalendar) {
        console.log('Found existing app calendar:', appCalendar.id);
        this.defaultCalendarId = appCalendar.id;
        return appCalendar.id;
      }

      // Create new calendar for our app
      console.log('Creating new calendar for app...');
      const newCalendarId = await this.createAppCalendar();
      this.defaultCalendarId = newCalendarId;

      return newCalendarId;
    } catch (error) {
      console.error('Error getting default calendar:', error);
      throw error;
    }
  }

  /**
   * Create a dedicated calendar for the app
   */
  private async createAppCalendar(): Promise<string> {
    try {
      // Find a source for the calendar (iCloud, Google, local)
      const sources = await Calendar.getSourcesAsync();
      console.log(`Found ${sources.length} calendar sources`);

      // Priority: iCloud (iOS) > Google (Android) > Local
      const defaultSource = sources.find(
        (source) =>
          source.name === 'iCloud' || // iOS
          source.name === 'Google' || // Android
          source.type === Calendar.SourceType.LOCAL
      );

      if (!defaultSource) {
        throw new Error('No suitable calendar source found');
      }

      console.log('📍 Using calendar source:', defaultSource.name);

      // Create calendar
      const calendarId = await Calendar.createCalendarAsync({
        title: 'My Goals',
        color: '#3b82f6', // Blue color
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: 'mygoals',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      console.log('Created new calendar:', calendarId);
      return calendarId;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  /**
   * Create a calendar event
   * This is the main function you'll use!
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    try {
      console.log('Creating calendar event:', event.title);

      // Check permissions
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Calendar permissions required');
        }
      }

      // Get calendar to add event to
      const calendarId = await this.getDefaultCalendar();

      // Create event
      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        location: event.location,
        alarms: event.alarms?.map((minutes) => ({
          relativeOffset: -minutes,
          method: Calendar.AlarmMethod.ALERT,
        })),
        // timeZone defaults to device timezone when not specified
      });

      console.log('Event created with ID:', eventId);

      // Save event ID to Firebase (for later updates/deletes)
      const user = auth.currentUser;
      if (user) {
        await this.saveEventToFirebase(user.uid, eventId, event);
      }

      return eventId;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Create recurring events (e.g., for goals with daily/weekly frequency)
   */
  async createRecurringEvent(
    event: CalendarEvent,
    recurrenceRule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval?: number; // e.g., every 2 days
      endDate?: Date;
      occurrences?: number; // e.g., 10 times
    }
  ): Promise<string> {
    try {
      console.log('Creating recurring event:', event.title);

      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Calendar permissions required');
        }
      }

      const calendarId = await this.getDefaultCalendar();

      // Map frequency to Expo Calendar format
      const frequencyMap = {
        daily: Calendar.Frequency.DAILY,
        weekly: Calendar.Frequency.WEEKLY,
        monthly: Calendar.Frequency.MONTHLY,
      };

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        location: event.location,
        alarms: event.alarms?.map((minutes) => ({
          relativeOffset: -minutes,
          method: Calendar.AlarmMethod.ALERT,
        })),
        recurrenceRule: {
          frequency: frequencyMap[recurrenceRule.frequency],
          interval: recurrenceRule.interval || 1,
          endDate: recurrenceRule.endDate,
          occurrence: recurrenceRule.occurrences,
        },
        // timeZone defaults to device timezone when not specified
      });

      console.log('Recurring event created:', eventId);

      const user = auth.currentUser;
      if (user) {
        await this.saveEventToFirebase(user.uid, eventId, event, recurrenceRule);
      }

      return eventId;
    } catch (error) {
      console.error('Error creating recurring event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      console.log('Updating event:', eventId);

      await Calendar.updateEventAsync(eventId, {
        title: updates.title,
        startDate: updates.startDate,
        endDate: updates.endDate,
        notes: updates.notes,
        location: updates.location,
        alarms: updates.alarms?.map((minutes) => ({
          relativeOffset: -minutes,
          method: Calendar.AlarmMethod.ALERT,
        })),
      });

      console.log('Event updated');
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      console.log('Deleting event:', eventId);
      await Calendar.deleteEventAsync(eventId);
      console.log('Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Get all events for a date range from "My Goals" calendar only
   */
  async getEvents(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      const calendarId = await this.getDefaultCalendar();

      const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);

      console.log(`Found ${events.length} events in "My Goals" calendar`);
      return events;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  /**
   * Get all events from ALL calendars on the device
   */
  async getAllCalendarEvents(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      // Check permissions first
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      // Get all calendars on device
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log(`Fetching events from ${calendars.length} calendars on device`);

      // Get calendar IDs
      const calendarIds = calendars.map((cal) => cal.id);

      // Fetch events from all calendars
      const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

      console.log(`Found ${events.length} total events across all calendars`);
      return events;
    } catch (error) {
      console.error('Error getting all calendar events:', error);
      return [];
    }
  }

  /**
   * Save event reference to Firebase
   */
  private async saveEventToFirebase(
    uid: string,
    eventId: string,
    event: CalendarEvent,
    recurrence?: any
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      const existingEvents = userDoc.data()?.calendarEvents || [];

      await updateDoc(userRef, {
        calendarEvents: [
          ...existingEvents,
          {
            eventId,
            title: event.title,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            isRecurring: !!recurrence,
            recurrence: recurrence || null,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      console.error('Error saving event to Firebase:', error);
    }
  }

  /**
   * Save permission status to Firebase
   */
  private async savePermissionStatus(uid: string, granted: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        calendarPermissions: {
          granted,
          grantedAt: granted ? new Date().toISOString() : null,
          platform: Platform.OS,
        },
      });
    } catch (error) {
      console.error('Error saving permission status:', error);
    }
  }

  /**
   * Show permission prompt with explanation
   */
  async promptForPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Calendar Access',
        'We need access to your calendar to create reminders for your goals. Events will be added to your device calendar and sync across all your devices.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Allow',
            onPress: async () => {
              const granted = await this.requestPermissions();
              resolve(granted);
            },
          },
        ]
      );
    });
  }
}

export const calendarService = new ExpoCalendarService();

export default calendarService;
