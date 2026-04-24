import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';

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
  if (hour >= 5 && hour < 7) return PALETTES[1];
  if (hour >= 7 && hour < 11) return PALETTES[2];
  if (hour >= 11 && hour < 14) return PALETTES[3];
  if (hour >= 14 && hour < 17) return PALETTES[4];
  if (hour >= 17 && hour < 19) return PALETTES[5];
  if (hour >= 19 && hour < 22) return PALETTES[6];
  if (hour >= 22 || hour < 2) return PALETTES[0];
  return PALETTES[7];
}

export default function AnimatedBackground() {
  const [current, setCurrent] = useState<Palette>(() => paletteForHour(new Date().getHours()));
  const [incoming, setIncoming] = useState<Palette | null>(null);

  const fade = useSharedValue(0);
  const breath = useSharedValue(0);
  const blobA = useSharedValue(0);
  const blobB = useSharedValue(0);
  const blobC = useSharedValue(0);

  // Palette crossfade on the hour
  useEffect(() => {
    const check = () => {
      const next = paletteForHour(new Date().getHours());
      setCurrent((prev) => {
        if (next.name === prev.name) return prev;
        setIncoming(next);
        fade.value = 0;
        fade.value = withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }, (finished) => {
          'worklet';
          if (finished) {
            runOnJS(setCurrent)(next);
            runOnJS(setIncoming)(null);
            fade.value = 0;
          }
        });
        return prev;
      });
    };
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Looping ambient animations — all on the UI thread
  useEffect(() => {
    const mkLoop = (v: ReturnType<typeof useSharedValue<number>>, duration: number) => {
      v.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    };

    mkLoop(breath, 6000);
    mkLoop(blobA, 9000);
    mkLoop(blobB, 11000);
    mkLoop(blobC, 13000);
  }, []);

  // Animated styles for gradient layers
  const breathStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.92, 1]),
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  // Blob positions — DerivedValues feed directly into Skia Canvas (UI-thread reactive)
  const aCx = useDerivedValue(() =>
    interpolate(blobA.value, [0, 1], [width * 0.1 - 40, width * 0.1 + 60]),
  );
  const aCy = useDerivedValue(() =>
    interpolate(blobA.value, [0, 1], [height * 0.18 - 30, height * 0.18 + 50]),
  );
  const bCx = useDerivedValue(() =>
    interpolate(blobB.value, [0, 1], [width * 0.75 + 50, width * 0.75 - 50]),
  );
  const bCy = useDerivedValue(() =>
    interpolate(blobB.value, [0, 1], [height * 0.62 + 30, height * 0.62 - 40]),
  );
  const cCx = useDerivedValue(() =>
    interpolate(blobC.value, [0, 1], [width * 0.35 - 20, width * 0.35 + 40]),
  );
  const cCy = useDerivedValue(() =>
    interpolate(blobC.value, [0, 1], [height * 0.4 + 20, height * 0.4 - 30]),
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base gradient — breathes with opacity */}
      <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
        <LinearGradient
          colors={current.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Incoming palette crossfade */}
      {incoming ? (
        <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
          <LinearGradient
            colors={incoming.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      {/* Skia Canvas: blurred orbs — skipped on Android (new arch incompatibility) */}
      {Platform.OS !== 'android' ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={aCx} cy={aCy} r={width * 0.46} color={current.blobA}>
            <BlurMask blur={90} style="normal" />
          </Circle>
          <Circle cx={bCx} cy={bCy} r={width * 0.44} color={current.blobB}>
            <BlurMask blur={80} style="normal" />
          </Circle>
          <Circle cx={cCx} cy={cCy} r={width * 0.36} color={current.blobA} opacity={0.55}>
            <BlurMask blur={70} style="normal" />
          </Circle>
        </Canvas>
      ) : null}

      {/* Bottom vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(10,5,20,0.35)']}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
