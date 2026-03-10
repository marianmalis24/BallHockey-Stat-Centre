import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, TrendingUp, Target, Shield, Zap, Award } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function SeasonDashboardScreen() {
  const { calculateSeasonStats } = useHockey();
  const stats = useMemo(() => calculateSeasonStats(), [calculateSeasonStats]);

  const hasData = stats.gamesPlayed > 0;

  const maxPeriodGoals = useMemo(() => {
    if (!hasData) return 1;
    return Math.max(
      ...stats.periodScoring.map(p => Math.max(p.goalsFor, p.goalsAgainst)),
      1
    );
  }, [stats.periodScoring, hasData]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Season Dashboard',
          headerStyle: { backgroundColor: '#0a0e1a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!hasData ? (
          <View style={styles.emptyState}>
            <Award color="#3a3a3c" size={64} />
            <Text style={styles.emptyTitle}>No Season Data</Text>
            <Text style={styles.emptyText}>Complete matches to see your season overview</Text>
          </View>
        ) : (
          <>
            <View style={styles.recordCard}>
              <Text style={styles.recordTitle}>Season Record</Text>
              <View style={styles.recordRow}>
                <View style={styles.recordItem}>
                  <Text style={styles.recordValue}>{stats.wins}</Text>
                  <Text style={[styles.recordLabel, { color: '#34C759' }]}>Wins</Text>
                </View>
                <View style={styles.recordDivider} />
                <View style={styles.recordItem}>
                  <Text style={styles.recordValue}>{stats.losses}</Text>
                  <Text style={[styles.recordLabel, { color: '#FF3B30' }]}>Losses</Text>
                </View>
                <View style={styles.recordDivider} />
                <View style={styles.recordItem}>
                  <Text style={styles.recordValue}>{stats.draws}</Text>
                  <Text style={[styles.recordLabel, { color: '#FF9500' }]}>Draws</Text>
                </View>
              </View>
              <View style={styles.winPctBar}>
                <View style={[styles.winPctFill, { width: `${stats.winPercentage}%` }]} />
              </View>
              <Text style={styles.winPctText}>{stats.winPercentage.toFixed(0)}% Win Rate</Text>
            </View>

            <View style={styles.streakRow}>
              <View style={styles.streakCard}>
                <Text style={styles.streakLabel}>Current</Text>
                <View style={[
                  styles.streakBadge,
                  stats.currentStreak.type === 'W' && styles.streakWin,
                  stats.currentStreak.type === 'L' && styles.streakLoss,
                  stats.currentStreak.type === 'D' && styles.streakDraw,
                ]}>
                  <Text style={styles.streakBadgeText}>
                    {stats.currentStreak.count}{stats.currentStreak.type}
                  </Text>
                </View>
              </View>
              <View style={styles.streakCard}>
                <Text style={styles.streakLabel}>Best Win Streak</Text>
                <View style={[styles.streakBadge, styles.streakWin]}>
                  <Text style={styles.streakBadgeText}>{stats.longestWinStreak}W</Text>
                </View>
              </View>
              <View style={styles.streakCard}>
                <Text style={styles.streakLabel}>Last 5</Text>
                <View style={styles.last5Row}>
                  {stats.last5.map((r, i) => (
                    <View
                      key={i}
                      style={[
                        styles.last5Dot,
                        r === 'W' && { backgroundColor: '#34C759' },
                        r === 'L' && { backgroundColor: '#FF3B30' },
                        r === 'D' && { backgroundColor: '#FF9500' },
                      ]}
                    >
                      <Text style={styles.last5Text}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Target color="#5ac8fa" size={18} />
                <Text style={styles.sectionTitle}>Scoring</Text>
              </View>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValueBig}>{stats.goalsFor}</Text>
                  <Text style={styles.statLabelSmall}>Goals For</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValueBig}>{stats.goalsAgainst}</Text>
                  <Text style={styles.statLabelSmall}>Goals Against</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[
                    styles.statValueBig,
                    stats.goalDifferential > 0 && { color: '#34C759' },
                    stats.goalDifferential < 0 && { color: '#FF3B30' },
                  ]}>
                    {stats.goalDifferential > 0 ? '+' : ''}{stats.goalDifferential}
                  </Text>
                  <Text style={styles.statLabelSmall}>Differential</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValueBig}>{stats.avgGoalsFor.toFixed(1)}</Text>
                  <Text style={styles.statLabelSmall}>Avg GF/G</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValueBig}>{stats.avgGoalsAgainst.toFixed(1)}</Text>
                  <Text style={styles.statLabelSmall}>Avg GA/G</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValueBig}>{stats.shootingPercentage.toFixed(1)}%</Text>
                  <Text style={styles.statLabelSmall}>Shooting %</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <TrendingUp color="#5ac8fa" size={18} />
                <Text style={styles.sectionTitle}>Period Breakdown</Text>
              </View>
              <View style={styles.periodChart}>
                {stats.periodScoring.map((p) => (
                  <View key={p.period} style={styles.periodColumn}>
                    <Text style={styles.periodLabel}>P{p.period}</Text>
                    <View style={styles.periodBars}>
                      <View style={styles.barContainer}>
                        <View style={[
                          styles.barFill,
                          styles.barFor,
                          { height: `${(p.goalsFor / maxPeriodGoals) * 100}%` },
                        ]} />
                        <Text style={styles.barValue}>{p.goalsFor}</Text>
                      </View>
                      <View style={styles.barContainer}>
                        <View style={[
                          styles.barFill,
                          styles.barAgainst,
                          { height: `${(p.goalsAgainst / maxPeriodGoals) * 100}%` },
                        ]} />
                        <Text style={styles.barValue}>{p.goalsAgainst}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                  <Text style={styles.legendText}>Goals For</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={styles.legendText}>Goals Against</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Shield color="#5ac8fa" size={18} />
                <Text style={styles.sectionTitle}>Team Totals</Text>
              </View>
              <View style={styles.totalsList}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Shots For</Text>
                  <Text style={styles.totalValue}>{stats.shotsFor}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Shots Against</Text>
                  <Text style={styles.totalValue}>{stats.shotsAgainst}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Faceoff %</Text>
                  <Text style={styles.totalValue}>
                    {stats.faceoffPercentage.toFixed(0)}% ({stats.faceoffWins}/{stats.faceoffWins + stats.faceoffLosses})
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Penalty Minutes</Text>
                  <Text style={styles.totalValue}>{stats.totalPenaltyMinutes}</Text>
                </View>
              </View>
            </View>

            {(stats.ppOpportunities > 0 || stats.shOpportunities > 0) && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Zap color="#FF9500" size={18} />
                  <Text style={styles.sectionTitle}>Special Teams</Text>
                </View>
                <View style={styles.specialTeamsRow}>
                  {stats.ppOpportunities > 0 && (
                    <View style={styles.specialTeamBox}>
                      <View style={[styles.specialTeamIcon, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                        <Zap color="#FF9500" size={20} />
                      </View>
                      <Text style={styles.specialTeamTitle}>Power Play</Text>
                      <Text style={styles.specialTeamValue}>{stats.ppGoals} Goals</Text>
                      <Text style={styles.specialTeamSub}>{stats.ppOpportunities} games w/ PP</Text>
                    </View>
                  )}
                  {stats.shOpportunities > 0 && (
                    <View style={styles.specialTeamBox}>
                      <View style={[styles.specialTeamIcon, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                        <Shield color="#FF3B30" size={20} />
                      </View>
                      <Text style={styles.specialTeamTitle}>Penalty Kill</Text>
                      <Text style={styles.specialTeamValue}>{stats.shGoalsAgainst} GA</Text>
                      <Text style={styles.specialTeamSub}>{stats.shOpportunities} games w/ SH</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  recordCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  recordItem: {
    alignItems: 'center',
    flex: 1,
  },
  recordValue: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  recordLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  recordDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#3a3a3c',
  },
  winPctBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2c2c2e',
    overflow: 'hidden',
    marginBottom: 8,
  },
  winPctFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  winPctText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  streakBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#3a3a3c',
  },
  streakWin: {
    backgroundColor: 'rgba(52,199,89,0.2)',
  },
  streakLoss: {
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  streakDraw: {
    backgroundColor: 'rgba(255,149,0,0.2)',
  },
  streakBadgeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  last5Row: {
    flexDirection: 'row',
    gap: 3,
  },
  last5Dot: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  last5Text: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  sectionCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '31%',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValueBig: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  statLabelSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  periodChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 140,
    marginBottom: 12,
  },
  periodColumn: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#8e8e93',
    marginBottom: 8,
  },
  periodBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barContainer: {
    width: 28,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barFor: {
    backgroundColor: '#34C759',
  },
  barAgainst: {
    backgroundColor: '#FF3B30',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  totalsList: {
    gap: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  totalLabel: {
    fontSize: 15,
    color: '#8e8e93',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  specialTeamsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  specialTeamBox: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  specialTeamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialTeamTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  specialTeamValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  specialTeamSub: {
    fontSize: 11,
    color: '#8e8e93',
  },
});
