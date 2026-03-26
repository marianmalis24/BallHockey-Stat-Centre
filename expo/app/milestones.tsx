import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { useHockey } from '@/contexts/hockey-context';
import { useTheme } from '@/contexts/theme-context';
import { calculateMilestones } from '@/utils/milestones';
import {
  Trophy,
  Medal,
  Award,
  Shield,
  Flame,
  Target,
  Star,
  Zap,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  trophy: Trophy,
  medal: Medal,
  award: Award,
  shield: Shield,
  flame: Flame,
  target: Target,
  star: Star,
  zap: Zap,
  rocket: Rocket,
  'rotate-ccw': RotateCcw,
  'shield-check': ShieldCheck,
  calendar: Calendar,
};

export default function MilestonesScreen() {
  const { matches, players } = useHockey();
  const { colors } = useTheme();

  const milestones = useMemo(() => calculateMilestones(matches, players), [matches, players]);
  const achieved = milestones.filter(m => m.achieved);
  const locked = milestones.filter(m => !m.achieved);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: 'Milestones' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerIconWrap}>
            <Trophy color="#FFD700" size={32} />
          </View>
          <Text style={[styles.headerCount, { color: colors.text }]}>{achieved.length}</Text>
          <Text style={[styles.headerLabel, { color: colors.textSec }]}>
            of {milestones.length} milestones unlocked
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${milestones.length > 0 ? (achieved.length / milestones.length) * 100 : 0}%` }]} />
          </View>
        </View>

        {achieved.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Unlocked</Text>
            {achieved.map((m) => {
              const IconComponent = ICON_MAP[m.icon] || Trophy;
              return (
                <View key={m.id} style={[styles.milestoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.iconCircle, { backgroundColor: `${m.color}20` }]}>
                    <IconComponent color={m.color} size={22} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneTitle, { color: colors.text }]}>{m.title}</Text>
                    <Text style={[styles.milestoneDesc, { color: colors.textSec }]}>{m.description}</Text>
                    {m.playerName && (
                      <Text style={[styles.milestonePlayer, { color: m.color }]}>{m.playerName}</Text>
                    )}
                    {m.date && (
                      <Text style={[styles.milestoneDate, { color: colors.textTer }]}>
                        {new Date(m.date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.checkCircle, { backgroundColor: m.color }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {locked.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Locked</Text>
            {locked.map((m) => {
              const IconComponent = ICON_MAP[m.icon] || Trophy;
              return (
                <View key={m.id} style={[styles.milestoneCard, styles.lockedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.cardAlt }]}>
                    <IconComponent color={colors.textTer} size={22} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneTitle, { color: colors.textTer }]}>{m.title}</Text>
                    <Text style={[styles.milestoneDesc, { color: colors.textTer }]}>{m.description}</Text>
                  </View>
                  <Lock color={colors.textTer} size={16} />
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerCount: {
    fontSize: 42,
    fontWeight: '800' as const,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,215,0,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  lockedCard: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  milestoneDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  milestonePlayer: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  milestoneDate: {
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
