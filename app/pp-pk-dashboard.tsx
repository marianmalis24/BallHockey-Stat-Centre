import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, Zap, Shield } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function PPPKDashboardScreen() {
  const { calculatePPPKStats } = useHockey();
  const stats = useMemo(() => calculatePPPKStats(), [calculatePPPKStats]);

  const hasData = stats.pp.totalOpportunities > 0 || stats.pk.totalOpportunities > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Special Teams',
          headerStyle: { backgroundColor: '#0a0e1a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!hasData ? (
          <View style={styles.emptyState}>
            <Zap color="#3a3a3c" size={64} />
            <Text style={styles.emptyTitle}>No Special Teams Data</Text>
            <Text style={styles.emptyText}>Use PP/SH game states during matches to track special teams performance</Text>
          </View>
        ) : (
          <>
            <View style={styles.overviewRow}>
              <View style={[styles.overviewCard, styles.ppCard]}>
                <View style={styles.overviewIcon}>
                  <Zap color="#FF9500" size={24} />
                </View>
                <Text style={styles.overviewLabel}>Power Play</Text>
                <Text style={styles.overviewPct}>
                  {stats.pp.percentage.toFixed(1)}%
                </Text>
                <Text style={styles.overviewSub}>
                  {stats.pp.totalGoals} G in {stats.pp.totalOpportunities} games
                </Text>
              </View>
              <View style={[styles.overviewCard, styles.pkCard]}>
                <View style={styles.overviewIcon}>
                  <Shield color="#FF3B30" size={24} />
                </View>
                <Text style={styles.overviewLabel}>Penalty Kill</Text>
                <Text style={styles.overviewPct}>
                  {stats.pk.percentage.toFixed(1)}%
                </Text>
                <Text style={styles.overviewSub}>
                  {stats.pk.totalGoalsAgainst} GA in {stats.pk.totalOpportunities} games
                </Text>
              </View>
            </View>

            {stats.pp.games.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Zap color="#FF9500" size={18} />
                  <Text style={styles.sectionTitle}>PP by Game</Text>
                </View>
                <View style={styles.gameTableHeader}>
                  <Text style={[styles.gameHeaderText, styles.opponentCol]}>Opponent</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>Goals</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>Shots</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>FO</Text>
                </View>
                {stats.pp.games.sort((a, b) => b.date - a.date).map((g) => (
                  <View key={g.matchId} style={styles.gameRow}>
                    <View style={styles.opponentCol}>
                      <Text style={styles.gameOpponent} numberOfLines={1}>{g.opponent}</Text>
                      <Text style={styles.gameDate}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <Text style={[styles.gameValue, styles.numCol, g.goals > 0 && styles.gameValueHighlight]}>{g.goals}</Text>
                    <Text style={[styles.gameValue, styles.numCol]}>{g.shots}</Text>
                    <Text style={[styles.gameValue, styles.numCol]}>
                      {g.faceoffTotal > 0 ? `${g.faceoffWins}/${g.faceoffTotal}` : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {stats.pk.games.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Shield color="#FF3B30" size={18} />
                  <Text style={styles.sectionTitle}>PK by Game</Text>
                </View>
                <View style={styles.gameTableHeader}>
                  <Text style={[styles.gameHeaderText, styles.opponentCol]}>Opponent</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>GA</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>SA</Text>
                  <Text style={[styles.gameHeaderText, styles.numCol]}>FO</Text>
                </View>
                {stats.pk.games.sort((a, b) => b.date - a.date).map((g) => (
                  <View key={g.matchId} style={styles.gameRow}>
                    <View style={styles.opponentCol}>
                      <Text style={styles.gameOpponent} numberOfLines={1}>{g.opponent}</Text>
                      <Text style={styles.gameDate}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <Text style={[styles.gameValue, styles.numCol, g.goalsAgainst === 0 && styles.gameValueGood]}>{g.goalsAgainst}</Text>
                    <Text style={[styles.gameValue, styles.numCol]}>{g.shots}</Text>
                    <Text style={[styles.gameValue, styles.numCol]}>
                      {g.faceoffTotal > 0 ? `${g.faceoffWins}/${g.faceoffTotal}` : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trends</Text>
              </View>
              {stats.pp.games.length >= 3 && (
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Last 3 PP Games</Text>
                  <View style={styles.trendDots}>
                    {stats.pp.games.slice(-3).map((g, i) => (
                      <View
                        key={i}
                        style={[
                          styles.trendDot,
                          g.goals > 0 ? styles.trendDotGood : styles.trendDotBad,
                        ]}
                      >
                        <Text style={styles.trendDotText}>{g.goals}G</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {stats.pk.games.length >= 3 && (
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Last 3 PK Games</Text>
                  <View style={styles.trendDots}>
                    {stats.pk.games.slice(-3).map((g, i) => (
                      <View
                        key={i}
                        style={[
                          styles.trendDot,
                          g.goalsAgainst === 0 ? styles.trendDotGood : styles.trendDotBad,
                        ]}
                      >
                        <Text style={styles.trendDotText}>{g.goalsAgainst}GA</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
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
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  ppCard: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  pkCard: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  overviewPct: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  overviewSub: {
    fontSize: 12,
    color: '#636366',
  },
  sectionCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  gameTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 8,
    marginBottom: 4,
  },
  gameHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#636366',
    textTransform: 'uppercase' as const,
  },
  opponentCol: {
    flex: 2,
  },
  numCol: {
    flex: 1,
    textAlign: 'center' as const,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44,44,46,0.5)',
  },
  gameOpponent: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  gameDate: {
    fontSize: 11,
    color: '#636366',
    marginTop: 2,
  },
  gameValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  gameValueHighlight: {
    color: '#FF9500',
  },
  gameValueGood: {
    color: '#34C759',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  trendLabel: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  trendDots: {
    flexDirection: 'row',
    gap: 6,
  },
  trendDot: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendDotGood: {
    backgroundColor: 'rgba(52,199,89,0.2)',
  },
  trendDotBad: {
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  trendDotText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
