// Local notification scheduling for the delayed body-response check-in.
//
// When Phase 2 (immediate reaction) is submitted we schedule a local
// notification 30 minutes out. It fires even if the app is backgrounded or
// killed; tapping it deep-links into the Phase 3 delayed check-in for that meal.
//
// NOTE: local scheduled notifications work in Expo Go, but for guaranteed
// background delivery (especially iOS) use a development build.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Delay before the body check-in. 30 min per spec; lower it to test quickly. */
export const BODY_DELAY_SECONDS = 30 * 60;

const ANDROID_CHANNEL = 'body-checkin';

// Index signature so it satisfies the notification content's `data` type.
type BodyCheckInData = {
  type: 'body-checkin';
  mealId: string;
  [key: string]: unknown;
};

let configured = false;

/** Install the foreground handler so the notification shows while the app is open. */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Request notification permission (idempotent) and ensure the Android channel. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  let granted =
    current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted && current.canAskAgain !== false) {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    granted = req.granted;
  }

  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Body check-ins',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return granted;
}

/**
 * Schedule the +30 min body check-in for a meal. Returns the notification id
 * (to cancel later), or null if permission was denied.
 */
export async function scheduleBodyCheckIn(
  mealId: string,
  mealText: string,
  seconds: number = BODY_DELAY_SECONDS
): Promise<string | null> {
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const data: BodyCheckInData = { type: 'body-checkin', mealId };
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'How are you feeling now?',
      body: mealText
        ? `It's been a bit since ${mealText}. Log how your body actually feels.`
        : 'Time to log how your body actually feels.',
      data,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      repeats: false,
    },
  });
}

export async function cancelScheduled(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to cancel notification:', e);
  }
}

function mealIdFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as Partial<BodyCheckInData> | undefined;
  return data?.type === 'body-checkin' && data.mealId ? data.mealId : null;
}

/** Subscribe to notification taps; handler receives the meal_id to open. */
export function addBodyCheckInResponseListener(
  handler: (mealId: string) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const mealId = mealIdFromResponse(response);
    if (mealId) handler(mealId);
  });
}

/** If the app was launched by tapping a check-in notification, return its meal_id. */
export async function getLaunchMealId(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  return mealIdFromResponse(response);
}
