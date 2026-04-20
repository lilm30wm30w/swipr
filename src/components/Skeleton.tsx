import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, Dimensions.get('window').width],
  });

  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: colors.surfaceElevated }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.shimmerBand} />
      </Animated.View>
    </View>
  );
}

export function SwipeCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height="70%" radius={0} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      <View style={styles.cardBottom}>
        <Skeleton width="70%" height={22} radius={6} />
        <View style={{ height: 8 }} />
        <Skeleton width="40%" height={12} radius={4} />
        <View style={{ height: 12 }} />
        <Skeleton width="90%" height={14} radius={4} />
      </View>
    </View>
  );
}

export function MatchRowSkeleton() {
  return (
    <View style={styles.matchRow}>
      <Skeleton width={56} height={56} radius={28} />
      <View style={{ flex: 1, gap: 6, paddingLeft: 14 }}>
        <Skeleton width="55%" height={15} radius={5} />
        <Skeleton width="70%" height={12} radius={4} />
        <Skeleton width="25%" height={16} radius={8} />
      </View>
      <Skeleton width={60} height={60} radius={14} />
    </View>
  );
}

export function ItemRowSkeleton() {
  return (
    <View style={styles.itemRow}>
      <Skeleton width={56} height={56} radius={12} />
      <View style={{ flex: 1, gap: 6, paddingLeft: 12 }}>
        <Skeleton width="60%" height={14} radius={4} />
        <Skeleton width="35%" height={11} radius={4} />
      </View>
      <Skeleton width={64} height={26} radius={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerBand: {
    width: 140,
    height: '100%',
    backgroundColor: 'rgba(167,139,250,0.10)',
    transform: [{ skewX: '-20deg' }],
  },
  card: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.62,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 22,
    paddingTop: 28,
    backgroundColor: 'rgba(10,10,15,0.8)',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
});
