import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMatches } from '../context/MatchesContext';
import { colors } from '../theme/colors';
import { RootStackParamList, AuthStackParamList, MainTabParamList, MainStackParamList } from '../types';
import SwiprLogo from '../components/SwiprLogo';

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
  const scale = useRef(new Animated.Value(focused ? 1 : 0.88)).current;
  const bgOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 0.92,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
      }),
      Animated.timing(bgOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View
        style={[
          styles.tabIconBg,
          { opacity: bgOpacity, transform: [{ scale: bgOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
        ]}
      />
      <Animated.Text style={[styles.tabEmoji, { transform: [{ scale }] }]}>
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
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SwiprLogo size={48} animated />
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
  tabBar: {
    backgroundColor: 'rgba(10,5,20,0.78)',
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
    backgroundColor: `${colors.primary}26`,
  },
  tabEmoji: { fontSize: 20 },
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
