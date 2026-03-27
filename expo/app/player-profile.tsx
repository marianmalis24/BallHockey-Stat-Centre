import { useHockey } from '@/contexts/hockey-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, TrendingUp, Shield, Zap } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { getRatingColor } from '@/constants/ratingColors';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

const CHART_WIDTH = Dimensions.get('window').width - 72;
const CHART_HEIGHT = 100;
const CHART_PAD_X = 24;
const CHART_PAD_Y = 16;

export default function PlayerProfileScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { players, matches, calculatePlayerStats, calculateGoalieStats, calculatePlayerMatchHistory } = useHockey();

  const player = players.find((p) => p.id === playerId);

  if (!player) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Player Not Found',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft color="#007AFF" size={28} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Player not found</Text>
        </View>
      </View>
    );
  }

  const stats = calculatePlayerStats(playerId);
  const goalieStats = player.position === 'goalie' ? calculateGoalieStats(playerId) : null;
  const matchHistory = calculatePlayerMatchHistory(playerId);

  const ratingTrend = useMemo(() => {
    return [...matchHistory].reverse().map(m => m.rating);
  }, [matchHistory]);

  const goalieBreakdown = useMemo(() => {
    if (player.position !== 'goalie') return null;

    const completed = matches.filter(m => !m.isActive && m.roster.some(r => r.playerId === playerId));
    const byPeriod: { period: number; shots: number; saves: number; pct: number }[] = [];
    const byState: Record<string, { shots: number; saves: number }> = {
      even: { shots: 0, saves: 0 },
      pp: { shots: 0, saves: 0 },
      sh: { shots: 0, saves: 0 },
    };

    const periodMap = new Map<number, { shots: number; saves: number }>();

    completed.forEach(m => {
      m.shots.filter(s => !s.isOurTeam && s.goalieId === playerId).forEach(s => {
        const period = s.period || 1;
        const existing = periodMap.get(period) || { shots: 0, saves: 0 };
        existing.shots++;
        if (s.result === 'save') existing.saves++;
        periodMap.set(period, existing);

        const gs = s.gameState || 'even';
        if (byState[gs]) {
          byState[gs].shots++;
          if (s.result === 'save') byState[gs].saves++;
        }
      });

      m.goals.filter(g => !g.isOurTeam && g.goalieId === playerId && !g.isEmptyNet).forEach(g => {
        const period = g.period || 1;
        const existing = periodMap.get(period) || { shots: 0, saves: 0 };
        existing.shots++;
        periodMap.set(period, existing);

        const gs = g.gameState || 'even';
        if (byState[gs]) {
          byState[gs].shots++;
        }
      });
    });

    for (const [period, data] of periodMap) {
      if (period <= 3) {
        byPeriod.push({
          period,
          shots: data.shots,
          saves: data.saves,
          pct: data.shots > 0 ? (data.saves / data.shots) * 100 : 0,
        });
      }
    }

    for (let p = 1; p <= 3; p++) {
      if (!byPeriod.find(bp => bp.period === p)) {
        byPeriod.push({ period: p, shots: 0, saves: 0, pct: 0 });
      }
    }
    byPeriod.sort((a, b) => a.period - b.period);

    const stateResult = Object.entries(byState).map(([state, data]) => ({
      state,
      shots: data.shots,
      saves: data.saves,
      pct: data.shots > 0 ? (data.saves / data.shots) * 100 : 0,
    }));

    const hasData = byPeriod.some(p => p.shots > 0) || stateResult.some(s => s.shots > 0);

    return hasData ? { byPeriod, byState: stateResult } : null;
  }, [matches, player, playerId]);

  const renderSparkline = () => {
    if (ratingTrend.length < 2) return null;

    const minR = Math.min(...ratingTrend);
    const maxR = Math.max(...ratingTrend);
    const range = maxR - minR || 1;
    const plotW = CHART_WIDTH - CHART_PAD_X * 2;
    const plotH = CHART_HEIGHT - CHART_PAD_Y * 2;

    const points = ratingTrend.map((r, i) => {
      const x = CHART_PAD_X + (i / (ratingTrend.length - 1)) * plotW;
      const y = CHART_PAD_Y + plotH - ((r - minR) / range) * plotH;
      return { x, y, rating: r };
    });

    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    const lastPoint = points[points.length - 1];

    return (
      <View style={styles.sparklineSection}>
        <View style={styles.sparklineHeader}>
          <TrendingUp color="#007AFF" size={16} />
          <Text style={styles.sparklineTitle}>Rating Trend</Text>
        </View>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Line
            x1={CHART_PAD_X} y1={CHART_PAD_Y}
            x2={CHART_PAD_X} y2={CHART_HEIGHT - CHART_PAD_Y}
            stroke="#e5e5ea" strokeWidth={1}
          />
          <Line
            x1={CHART_PAD_X} y1={CHART_HEIGHT - CHART_PAD_Y}
            x2={CHART_WIDTH - CHART_PAD_X} y2={CHART_HEIGHT - CHART_PAD_Y}
            stroke="#e5e5ea" strokeWidth={1}
          />
          <SvgText x={4} y={CHART_PAD_Y + 4} fontSize={9} fill="#8e8e93">{maxR.toFixed(1)}</SvgText>
          <SvgText x={4} y={CHART_HEIGHT - CHART_PAD_Y + 4} fontSize={9} fill="#8e8e93">{minR.toFixed(1)}</SvgText>
          <Polyline
            points={pointsStr}
            fill="none"
            stroke="#007AFF"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 4 : 2.5}
              fill={getRatingColor(p.rating)}
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
          <SvgText
            x={lastPoint.x}
            y={lastPoint.y - 8}
            fontSize={10}
            fontWeight="bold"
            fill={getRatingColor(lastPoint.rating)}
            textAnchor="middle"
          >
            {lastPoint.rating.toFixed(1)}
          </SvgText>
        </Svg>
        <View style={styles.sparklineLabels}>
          <Text style={styles.sparklineLabel}>Oldest</Text>
          <Text style={styles.sparklineLabel}>{ratingTrend.length} games</Text>
          <Text style={styles.sparklineLabel}>Latest</Text>
        </View>
      </View>
    );
  };

  const renderGoalieBreakdown = () => {
    if (!goalieBreakdown) return null;

    const stateLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      even: { label: 'Even Strength', color: '#007AFF', icon: <Shield color="#007AFF" size={14} /> },
      pp: { label: 'Power Play', color: '#FF9500', icon: <Zap color="#FF9500" size={14} /> },
      sh: { label: 'Shorthanded', color: '#FF3B30', icon: <Shield color="#FF3B30" size={14} /> },
    };

    return (
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Goalie Breakdown</Text>

        <Text style={styles.breakdownSubtitle}>Save % by Period</Text>
        <View style={styles.breakdownRow}>
          {goalieBreakdown.byPeriod.map(p => (
            <View key={p.period} style={styles.breakdownBox}>
              <Text style={styles.breakdownPeriodLabel}>P{p.period}</Text>
              <Text style={[styles.breakdownPct, { color: p.shots > 0 ? (p.pct >= 90 ? '#34C759' : p.pct >= 85 ? '#FF9500' : '#FF3B30') : '#8e8e93' }]}>
                {p.shots > 0 ? `${p.pct.toFixed(1)}%` : '-'}
              </Text>
              <Text style={styles.breakdownSub}>{p.saves}/{p.shots}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.breakdownSubtitle, { marginTop: 16 }]}>Save % by Game State</Text>
        <View style={styles.breakdownStateList}>
          {goalieBreakdown.byState.map(s => {
            const cfg = stateLabels[s.state] || { label: s.state, color: '#8e8e93', icon: null };
            return (
              <View key={s.state} style={styles.breakdownStateRow}>
                <View style={styles.breakdownStateLabelRow}>
                  {cfg.icon}
                  <Text style={styles.breakdownStateLabel}>{cfg.label}</Text>
                </View>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { width: `${s.shots > 0 ? s.pct : 0}%`, backgroundColor: cfg.color }]} />
                </View>
                <View style={styles.breakdownStateValues}>
                  <Text style={[styles.breakdownStatePct, { color: s.shots > 0 ? cfg.color : '#8e8e93' }]}>
                    {s.shots > 0 ? `${s.pct.toFixed(1)}%` : '-'}
                  </Text>
                  <Text style={styles.breakdownStateSub}>{s.saves}/{s.shots}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: player.name,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.jerseyBadgeLarge}>
            <Text style={styles.jerseyNumberLarge}>{player.jerseyNumber}</Text>
          </View>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerPosition}>
            {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
          </Text>
          <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(stats.rating) }]}>
            <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>Rating</Text>
          </View>
        </View>

        {renderSparkline()}

        {goalieStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Goalie Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{goalieStats.gamesPlayed}</Text>
                <Text style={styles.statLabel}>GP</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{goalieStats.shotsAgainst}</Text>
                <Text style={styles.statLabel}>SA</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{goalieStats.saves}</Text>
                <Text style={styles.statLabel}>SV</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{goalieStats.goalsAgainst}</Text>
                <Text style={styles.statLabel}>GA</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{goalieStats.savePercentage.toFixed(1)}%</Text>
                <Text style={styles.statLabel}>SV%</Text>
              </View>
            </View>
            {goalieStats.saveByRisk && (goalieStats.saveByRisk.low.shots > 0 || goalieStats.saveByRisk.medium.shots > 0 || goalieStats.saveByRisk.high.shots > 0) && (
              <View style={styles.riskSection}>
                <Text style={styles.riskSectionTitle}>Save % by Shot Danger</Text>
                <View style={styles.riskBars}>
                  <View style={styles.riskBarItem}>
                    <View style={styles.riskBarLabelRow}>
                      <View style={[styles.riskDot, { backgroundColor: '#8e8e93' }]} />
                      <Text style={styles.riskBarLabel}>Low</Text>
                    </View>
                    <View style={styles.riskBarBg}>
                      <View style={[styles.riskBarFill, { width: `${goalieStats.saveByRisk.low.pct}%`, backgroundColor: '#8e8e93' }]} />
                    </View>
                    <Text style={styles.riskBarValue}>
                      {goalieStats.saveByRisk.low.shots > 0 ? `${goalieStats.saveByRisk.low.pct.toFixed(1)}%` : '-'}
                    </Text>
                    <Text style={styles.riskBarSub}>{goalieStats.saveByRisk.low.saves}/{goalieStats.saveByRisk.low.shots}</Text>
                  </View>
                  <View style={styles.riskBarItem}>
                    <View style={styles.riskBarLabelRow}>
                      <View style={[styles.riskDot, { backgroundColor: '#FF9500' }]} />
                      <Text style={styles.riskBarLabel}>Medium</Text>
                    </View>
                    <View style={styles.riskBarBg}>
                      <View style={[styles.riskBarFill, { width: `${goalieStats.saveByRisk.medium.pct}%`, backgroundColor: '#FF9500' }]} />
                    </View>
                    <Text style={styles.riskBarValue}>
                      {goalieStats.saveByRisk.medium.shots > 0 ? `${goalieStats.saveByRisk.medium.pct.toFixed(1)}%` : '-'}
                    </Text>
                    <Text style={styles.riskBarSub}>{goalieStats.saveByRisk.medium.saves}/{goalieStats.saveByRisk.medium.shots}</Text>
                  </View>
                  <View style={styles.riskBarItem}>
                    <View style={styles.riskBarLabelRow}>
                      <View style={[styles.riskDot, { backgroundColor: '#FF3B30' }]} />
                      <Text style={styles.riskBarLabel}>High</Text>
                    </View>
                    <View style={styles.riskBarBg}>
                      <View style={[styles.riskBarFill, { width: `${goalieStats.saveByRisk.high.pct}%`, backgroundColor: '#FF3B30' }]} />
                    </View>
                    <Text style={styles.riskBarValue}>
                      {goalieStats.saveByRisk.high.shots > 0 ? `${goalieStats.saveByRisk.high.pct.toFixed(1)}%` : '-'}
                    </Text>
                    <Text style={styles.riskBarSub}>{goalieStats.saveByRisk.high.saves}/{goalieStats.saveByRisk.high.shots}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {renderGoalieBreakdown()}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Career Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
              <Text style={styles.statLabel}>GP</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.goals}</Text>
              <Text style={styles.statLabel}>G</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.assists}</Text>
              <Text style={styles.statLabel}>A</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.points}</Text>
              <Text style={styles.statLabel}>P</Text>
            </View>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  stats.plusMinus > 0 && styles.statValuePositive,
                  stats.plusMinus < 0 && styles.statValueNegative,
                ]}
              >
                {stats.plusMinus > 0 ? '+' : ''}
                {stats.plusMinus}
              </Text>
              <Text style={styles.statLabel}>+/-</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.shots}</Text>
              <Text style={styles.statLabel}>S</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.shotPercentage.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>S%</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.shotBlocks}</Text>
              <Text style={styles.statLabel}>BLK</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.shotsWide}</Text>
              <Text style={styles.statLabel}>W</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.penaltyMinutes}</Text>
              <Text style={styles.statLabel}>PIM</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.faceoffPercentage.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>F%</Text>
            </View>
          </View>
        </View>

        {stats.faceoffByZone && (stats.faceoffByZone.dzone.wins + stats.faceoffByZone.dzone.losses + stats.faceoffByZone.ozone.wins + stats.faceoffByZone.ozone.losses + stats.faceoffByZone.neutral.wins + stats.faceoffByZone.neutral.losses > 0) && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Faceoff % by Zone</Text>
            {[{ key: 'ozone' as const, label: 'O-Zone', color: '#34C759' }, { key: 'neutral' as const, label: 'Neutral', color: '#FF9500' }, { key: 'dzone' as const, label: 'D-Zone', color: '#FF3B30' }].map(z => {
              const zs = stats.faceoffByZone![z.key];
              const total = zs.wins + zs.losses;
              return (
                <View key={z.key} style={styles.riskBarItem}>
                  <View style={styles.riskBarLabelRow}>
                    <View style={[styles.riskDot, { backgroundColor: z.color }]} />
                    <Text style={styles.riskBarLabel}>{z.label}</Text>
                  </View>
                  <View style={styles.riskBarBg}>
                    <View style={[styles.riskBarFill, { width: `${total > 0 ? zs.pct : 0}%`, backgroundColor: z.color }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.riskBarValue, { color: total > 0 ? z.color : '#8e8e93' }]}>
                      {total > 0 ? `${zs.pct.toFixed(1)}%` : '-'}
                    </Text>
                    <Text style={styles.riskBarSub}>{zs.wins}W / {zs.losses}L</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Match History</Text>
          {matchHistory.length === 0 ? (
            <Text style={styles.noData}>No match history yet</Text>
          ) : (
            matchHistory.map((match) => {
              const result =
                match.ourScore > match.opponentScore
                  ? 'W'
                  : match.ourScore < match.opponentScore
                  ? 'L'
                  : 'D';
              const resultColor =
                result === 'W'
                  ? '#34C759'
                  : result === 'L'
                  ? '#FF3B30'
                  : '#FF9500';

              return (
                <View key={match.matchId} style={styles.matchCard}>
                  <View style={styles.matchHeader}>
                    <View>
                      <Text style={styles.matchOpponent}>{match.opponentName}</Text>
                      <Text style={styles.matchDate}>
                        {new Date(match.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.matchResult}>
                      <View
                        style={[
                          styles.resultBadge,
                          { backgroundColor: resultColor },
                        ]}
                      >
                        <Text style={styles.resultText}>{result}</Text>
                      </View>
                      <Text style={styles.matchScore}>
                        {match.ourScore} - {match.opponentScore}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.matchStats}>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>G</Text>
                      <Text style={styles.matchStatValue}>{match.goals}</Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>A</Text>
                      <Text style={styles.matchStatValue}>{match.assists}</Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>P</Text>
                      <Text style={styles.matchStatValue}>{match.goals + match.assists}</Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>+/-</Text>
                      <Text
                        style={[
                          styles.matchStatValue,
                          match.plusMinus > 0 && styles.statValuePositive,
                          match.plusMinus < 0 && styles.statValueNegative,
                        ]}
                      >
                        {match.plusMinus > 0 ? '+' : ''}
                        {match.plusMinus}
                      </Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>PIM</Text>
                      <Text style={styles.matchStatValue}>
                        {match.penaltyMinutes}
                      </Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>S</Text>
                      <Text style={styles.matchStatValue}>{match.shots}</Text>
                    </View>
                    <View style={styles.matchStatItem}>
                      <Text style={styles.matchStatLabel}>Rating</Text>
                      <Text style={[styles.matchStatValue, { color: getRatingColor(match.rating) }]}>
                        {match.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jerseyBadgeLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  jerseyNumberLarge: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700' as const,
  },
  playerName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 18,
    color: '#8e8e93',
    marginBottom: 16,
  },
  ratingBadge: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  sparklineSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sparklineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sparklineTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  sparklineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 4,
  },
  sparklineLabel: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  breakdownSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6c6c70',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
  },
  breakdownBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  breakdownPeriodLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8e8e93',
    marginBottom: 6,
  },
  breakdownPct: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  breakdownSub: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  breakdownStateList: {
    gap: 14,
  },
  breakdownStateRow: {
    gap: 6,
  },
  breakdownStateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownStateLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  breakdownBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e5ea',
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  breakdownStateValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownStatePct: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  breakdownStateSub: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: '30%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '600' as const,
  },
  statValuePositive: {
    color: '#34C759',
  },
  statValueNegative: {
    color: '#FF3B30',
  },
  historySection: {
    marginBottom: 20,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  matchOpponent: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 13,
    color: '#8e8e93',
  },
  matchResult: {
    alignItems: 'flex-end',
  },
  resultBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  matchScore: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  matchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  matchStatItem: {
    alignItems: 'center',
  },
  matchStatLabel: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  matchStatValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  noData: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center' as const,
    paddingVertical: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  riskSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  riskSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  riskBars: {
    gap: 12,
  },
  riskBarItem: {
    gap: 4,
  },
  riskBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskBarLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  riskBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e5ea',
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  riskBarValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  riskBarSub: {
    fontSize: 12,
    color: '#8e8e93',
  },
});
