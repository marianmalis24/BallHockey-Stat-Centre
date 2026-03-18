import { useHockey } from '@/contexts/hockey-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { getRatingColor } from '@/constants/ratingColors';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function PlayerProfileScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { players, calculatePlayerStats, calculateGoalieStats, calculatePlayerMatchHistory } = useHockey();

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
    textAlign: 'center',
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
    textAlign: 'center',
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
