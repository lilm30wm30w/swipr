import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useMatches } from '../context/MatchesContext';
import { colors } from '../theme/colors';
import { RootStackParamList, AuthStackParamList, MainTabParamList, MainStackParamList } from '../types';
import SwiprLogo from '../components/SwiprLogo';
import PressableScale from '../components/PressableScale';
import GradientView from '../components/GradientView';

import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import DiscoverScreen from '../screens/Discover/DiscoverScreen';
import MatchesScreen from '../screens/Matches/MatchesScreen';
import AddItemScreen from '../screens/AddItem/AddItemScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import ItemDetailScreen from '../screens/ItemDetail/ItemDetailScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
    notification: colors.danger,
  },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = { Discover: '🔥', Matches: '🤝', AddItem: '➕', Profile: '👤' };
  const scale = useSharedValue(focused ? 1.08 : 0.92);
  const bgOpacity = useSharedValue(focused ? 1 : 0);
  const bgScale = useSharedValue(focused ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 0.92, { damping: 9, stiffness: 200, mass: 0.7 });
    bgOpacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
    bgScale.value = withSpring(focused ? 1 : 0.6, { damping: 12, stiffness: 240 });
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={[styles.tabIconBg, bgStyle]} />
      <Animated.Text style={[styles.tabIconText, iconStyle]}>
        {icons[name]}
      </Animated.Text>
    </View>
  );
}

function TabNavigator() {
  const { unseenCount } = useMatches();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: ({ focused, children }) => (
          <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{children}</Text>
        ),
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarBadge: unseenCount > 0 ? unseenCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tab.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackTitle: '',
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: 240,
      }}
    >
      <MainStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <MainStack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
      />
    </MainStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: 240,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, profile, profileError, loading, refreshProfile, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SwiprLogo size={48} animated />
      </View>
    );
  }

  if (session && profileError) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorCard}>
          <SwiprLogo size={40} showTrail={false} />
          <Text style={styles.errorTitle}>Profile unavailable</Text>
          <Text style={styles.errorText}>
            We couldn't finish loading your account. Check your database setup, then retry.
          </Text>
          <Text style={styles.errorDetail}>{profileError}</Text>
          <PressableScale onPress={refreshProfile} style={styles.errorButton} hapticOnPressIn="press">
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.errorButtonGradient}>
              <Text style={styles.errorButtonText}>Retry</Text>
            </GradientView>
          </PressableScale>
          <PressableScale onPress={signOut} style={styles.signOutFallback} hapticOnPressIn="tap">
            <Text style={styles.signOutFallbackText}>Sign Out</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  const needsOnboarding = !!session && profile && !profile.onboarded_at;

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
          animationDuration: 220,
        }}
      >
        {!session ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : needsOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(18,12,34,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
  },
  errorTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  errorText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' },
  errorDetail: { fontSize: 12, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
  errorButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  errorButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  signOutFallback: { paddingVertical: 10 },
  signOutFallbackText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  tabBar: {
    backgroundColor: 'rgba(10,5,20,0.82)',
    borderTopColor: 'rgba(167,139,250,0.18)',
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 0,
  },
  tabIconWrap: {
    width: 44, height: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIconBg: {
    position: 'absolute',
    width: 44, height: 30, borderRadius: 16,
    backgroundColor: `${colors.primary}28`,
  },
  tabIconText: { fontSize: 20, color: colors.text },
  tabLabel: { fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  tabLabelFocused: { fontWeight: '700', color: colors.primaryLight },
  tabBadge: {
    backgroundColor: colors.danger,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
