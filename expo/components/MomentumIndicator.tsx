import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Match } from '@/types/hockey';

interface MomentumIndicatorProps {
  match: Match;
}

export const MomentumIndicator = React.memo(({ match }: MomentumIndicatorProps) => {
  const animatedValue = useRef(new Animated.Value(0.5)).current;

  const momentum = useMemo(() => {
    const now = Date.now();
    const window = 3 * 60 * 1000;
    const cutoff = now - window;

    const recentGoals = match.goals.filter(g => g.timestamp >= cutoff);
    const recentShots = match.shots.filter(s => s.timestamp >= cutoff && s.result !== 'blocked' && s.result !== 'miss');
    const recentFaceoffs = (match.faceoffs || []).filter(f => f.timestamp >= cutoff);

    let score = 0;

    recentGoals.forEach(g => {
      const recency = 1 - ((now - g.timestamp) / window);
      score += g.isOurTeam ? 3 * recency : -3 * recency;
    });

    recentShots.forEach(s => {
      const recency = 1 - ((now - s.timestamp) / window);
      score += s.isOurTeam ? 0.5 * recency : -0.5 * recency;
    });

    recentFaceoffs.forEach(f => {
      const recency = 1 - ((now - f.timestamp) / window);
      const isUs = match.roster.some(r => r.playerId === f.winnerId);
      score += isUs ? 0.3 * recency : -0.3 * recency;
    });

    const normalized = Math.max(0, Math.min(1, (score + 5) / 10));
    return normalized;
  }, [match.goals, match.shots, match.faceoffs, match.roster]);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: momentum,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [momentum, animatedValue]);

  const label = momentum > 0.65 ? 'We\'re pushing!' : momentum < 0.35 ? 'Under pressure' : 'Even play';
  const color = momentum > 0.65 ? '#34C759' : momentum < 0.35 ? '#FF3B30' : '#8e8e93';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Momentum</Text>
        <Text style={[styles.status, { color }]}>{label}</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: animatedValue.interpolate({
                inputRange: [0, 0.35, 0.5, 0.65, 1],
                outputRange: ['#FF3B30', '#FF9500', '#8e8e93', '#5ac8fa', '#34C759'],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.indicator,
            {
              left: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <Text style={styles.sideLabel}>Them</Text>
        <Text style={styles.sideLabel}>Us</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2c2c2e',
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  indicator: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sideLabel: {
    fontSize: 10,
    color: '#636366',
    fontWeight: '600' as const,
  },
});
