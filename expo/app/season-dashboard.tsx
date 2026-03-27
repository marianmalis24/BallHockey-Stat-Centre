import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, TrendingUp, Target, Shield, Zap, Award, Download } from 'lucide-react-native';
import React, { useMemo, useCallback, useState } from 'react';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Share,
  Dimensions,
} from 'react-native';

const CHART_W = Dimensions.get('window').width - 72;
const CHART_H = 120;
const PAD_X = 28;
const PAD_Y = 16;

export default function SeasonDashboardScreen() {
  const { calculateSeasonStats, exportSeasonCSV, matches } = useHockey();
  const stats = useMemo(() => calculateSeasonStats(), [calculateSeasonStats]);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const csv = exportSeasonCSV();
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'season_stats.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csv,
          title: 'Season Stats CSV',
        });
      }
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [exportSeasonCSV]);

  const hasData = stats.gamesPlayed > 0;

  const renderTrendChart = (data: number[], color: string, data2?: number[], color2?: string) => {
    if (data.length < 2) return null;
    const allVals = data2 ? [...data, ...data2] : data;
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;
    const plotW = CHART_W - PAD_X * 2;
    const plotH = CHART_H - PAD_Y * 2;

    const toPoints = (vals: number[]) =>
      vals.map((v, i) => ({
        x: PAD_X + (i / (vals.length - 1)) * plotW,
        y: PAD_Y + plotH - ((v - minV) / range) * plotH,
        val: v,
      }));

    const pts = toPoints(data);
    const pts2 = data2 ? toPoints(data2) : null;
    const ptsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    const pts2Str = pts2 ? pts2.map(p => `${p.x},${p.y}`).join(' ') : '';

    return (
      <Svg width={CHART_W} height={CHART_H}>
        <Line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={CHART_H - PAD_Y} stroke="#3a3a3c" strokeWidth={1} />
        <Line x1={PAD_X} y1={CHART_H - PAD_Y} x2={CHART_W - PAD_X} y2={CHART_H - PAD_Y} stroke="#3a3a3c" strokeWidth={1} />
        <SvgText x={4} y={PAD_Y + 4} fontSize={9} fill="#8e8e93">{maxV % 1 === 0 ? maxV : maxV.toFixed(1)}</SvgText>
        <SvgText x={4} y={CHART_H - PAD_Y + 4} fontSize={9} fill="#8e8e93">{minV % 1 === 0 ? minV : minV.toFixed(1)}</SvgText>
        {pts2Str && (
          <Polyline points={pts2Str} fill="none" stroke={color2 || '#FF3B30'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.6} />
        )}
        <Polyline points={ptsStr} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <Circle key={`a${i}`} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2} fill={color} />
        ))}
        {pts2 && pts2.map((p, i) => (
          <Circle key={`b${i}`} cx={p.x} cy={p.y} r={i === pts2.length - 1 ? 4 : 2} fill={color2 || '#FF3B30'} opacity={0.6} />
        ))}
        <SvgText x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 8} fontSize={10} fontWeight="bold" fill={color} textAnchor="middle">
          {data[data.length - 1] % 1 === 0 ? data[data.length - 1] : data[data.length - 1].toFixed(1)}
        </SvgText>
      </Svg>
    );
  };

  const trendData = useMemo(() => {
    const completed = [...matches].filter(m => !m.isActive).sort((a, b) => a.date - b.date);
    const goalsPerGame = completed.map(m => m.ourScore);
    const gaPerGame = completed.map(m => m.opponentScore);
    const cumulativeWinPct: number[] = [];
    let w = 0;
    completed.forEach((m, i) => {
      if (m.ourScore > m.opponentScore) w++;
      cumulativeWinPct.push((w / (i + 1)) * 100);
    });
    return { goalsPerGame, gaPerGame, cumulativeWinPct, labels: completed.map((_, i) => i + 1) };
  }, [matches]);

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
          headerRight: () => hasData ? (
            <TouchableOpacity onPress={handleExportCSV} style={styles.exportButton} disabled={isExporting}>
              <Download color="#5ac8fa" size={22} />
            </TouchableOpacity>
          ) : null,
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

            {trendData.goalsPerGame.length >= 2 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <TrendingUp color="#5ac8fa" size={18} />
                  <Text style={styles.sectionTitle}>Goals per Game</Text>
                </View>
                {renderTrendChart(trendData.goalsPerGame, '#34C759', trendData.gaPerGame, '#FF3B30')}
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
            )}

            {trendData.cumulativeWinPct.length >= 2 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Award color="#FFD700" size={18} />
                  <Text style={styles.sectionTitle}>Win % Over Time</Text>
                </View>
                {renderTrendChart(trendData.cumulativeWinPct, '#FFD700')}
              </View>
            )}

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
  exportButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
