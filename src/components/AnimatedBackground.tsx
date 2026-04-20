import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type Palette = {
  name: string;
  gradient: readonly [string, string, string, string];
  blobA: string;
  blobB: string;
};

const PALETTES: Palette[] = [
  {
    name: 'night',
    gradient: ['#0A0514', '#1A0B2E', '#2D1B4E', '#4C1D95'],
    blobA: 'rgba(167,139,250,0.22)',
    blobB: 'rgba(236,72,153,0.14)',
  },
  {
    name: 'dawn',
    gradient: ['#1A0B2E', '#4C1D95', '#9D174D', '#F472B6'],
    blobA: 'rgba(244,114,182,0.28)',
    blobB: 'rgba(139,92,246,0.22)',
  },
  {
    name: 'morning',
    gradient: ['#1E1B4B', '#4F46E5', '#A855F7', '#EC4899'],
    blobA: 'rgba(96,165,250,0.22)',
    blobB: 'rgba(236,72,153,0.22)',
  },
  {
    name: 'midday',
    gradient: ['#1E3A8A', '#6366F1', '#A855F7', '#D946EF'],
    blobA: 'rgba(217,70,239,0.24)',
    blobB: 'rgba(99,102,241,0.22)',
  },
  {
    name: 'afternoon',
    gradient: ['#312E81', '#6D28D9', '#C026D3', '#F472B6'],
    blobA: 'rgba(244,114,182,0.24)',
    blobB: 'rgba(139,92,246,0.22)',
  },
  {
    name: 'sunset',
    gradient: ['#2E1065', '#7C3AED', '#DB2777', '#F472B6'],
    blobA: 'rgba(236,72,153,0.3)',
    blobB: 'rgba(167,139,250,0.22)',
  },
  {
    name: 'dusk',
    gradient: ['#1E1B4B', '#4C1D95', '#BE185D', '#831843'],
    blobA: 'rgba(190,24,93,0.24)',
    blobB: 'rgba(79,70,229,0.22)',
  },
  {
    name: 'lateNight',
    gradient: ['#030014', '#1A0B2E', '#3B0764', '#6D28D9'],
    blobA: 'rgba(139,92,246,0.2)',
    blobB: 'rgba(236,72,153,0.12)',
  },
];

function paletteForHour(hour: number): Palette {
  if (hour >= 5 && hour < 7) return PALETTES[1];   // dawn
  if (hour >= 7 && hour < 11) return PALETTES[2];  // morning
  if (hour >= 11 && hour < 14) return PALETTES[3]; // midday
  if (hour >= 14 && hour < 17) return PALETTES[4]; // afternoon
  if (hour >= 17 && hour < 19) return PALETTES[5]; // sunset
  if (hour >= 19 && hour < 22) return PALETTES[6]; // dusk
  if (hour >= 22 || hour < 2) return PALETTES[0];  // night
  return PALETTES[7]; // lateNight (2-5am)
}

export default function AnimatedBackground() {
  const [current, setCurrent] = useState<Palette>(() => paletteForHour(new Date().getHours()));
  const [incoming, setIncoming] = useState<Palette | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;
  const blobC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const check = () => {
      const next = paletteForHour(new Date().getHours());
      setCurrent((prev) => {
        if (next.name === prev.name) return prev;
        setIncoming(next);
        fade.setValue(0);
        Animated.timing(fade, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setCurrent(next);
          setIncoming(null);
          fade.setValue(0);
        });
        return prev;
      });
    };

    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    const mkBlob = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

    const loops = [
      breathLoop,
      mkBlob(blobA, 9000),
      mkBlob(blobB, 11000),
      mkBlob(blobC, 13000),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  const aX = blobA.interpolate({ inputRange: [0, 1], outputRange: [-40, 60] });
  const aY = blobA.interpolate({ inputRange: [0, 1], outputRange: [-30, 50] });
  const bX = blobB.interpolate({ inputRange: [0, 1], outputRange: [50, -50] });
  const bY = blobB.interpolate({ inputRange: [0, 1], outputRange: [30, -40] });
  const cX = blobC.interpolate({ inputRange: [0, 1], outputRange: [-20, 40] });
  const cY = blobC.interpolate({ inputRange: [0, 1], outputRange: [20, -30] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: breathOpacity }]}>
        <LinearGradient
          colors={current.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {incoming ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <LinearGradient
            colors={incoming.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.9,
            height: width * 0.9,
            top: -width * 0.25,
            left: -width * 0.2,
            backgroundColor: current.blobA,
            transform: [{ translateX: aX }, { translateY: aY }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.85,
            height: width * 0.85,
            top: height * 0.45,
            right: -width * 0.25,
            backgroundColor: current.blobB,
            transform: [{ translateX: bX }, { translateY: bY }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.7,
            height: width * 0.7,
            top: height * 0.2,
            left: width * 0.15,
            backgroundColor: current.blobA,
            opacity: 0.55,
            transform: [{ translateX: cX }, { translateY: cY }],
          },
        ]}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(10,5,20,0.35)']}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
