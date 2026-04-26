import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

type PushPlatform = 'ios' | 'android';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | null {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim()
    || Constants.expoConfig?.extra?.eas?.projectId?.trim()
    || null;
  if (!projectId || projectId.includes('YOUR_')) {
    return null;
  }
  return projectId;
}

export async function registerForPushNotificationsAsync(): Promise<{ token: string; platform: PushPlatform } | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = getProjectId();
    if (!projectId) {
      return null;
    }

    const permissionResponse = await Notifications.getPermissionsAsync();
    let finalStatus = permissionResponse.status;

    if (finalStatus !== 'granted') {
      const requestResponse = await Notifications.requestPermissionsAsync();
      finalStatus = requestResponse.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenResponse.data) {
      return null;
    }

    return {
      token: tokenResponse.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch {
    return null;
  }
}

export async function syncPushToken(userId: string): Promise<string | null> {
  const registration = await registerForPushNotificationsAsync();
  if (!registration) {
    return null;
  }

  try {
    const { error } = await supabase.rpc('register_push_token', {
      p_token: registration.token,
      p_platform: registration.platform,
    });

    if (error) {
      return null;
    }

    return registration.token;
  } catch {
    return null;
  }
}

export async function removePushToken(userId: string, token: string | null) {
  if (!userId || !token) {
    return;
  }

  try {
    await supabase.rpc('unregister_push_token', {
      p_token: token,
    });
  } catch {
    // Best-effort cleanup only.
  }
}
