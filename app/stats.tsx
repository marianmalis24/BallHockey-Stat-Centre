import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, Home } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function StatsScreen() {
  const { players, calculatePlayerStats, calculateGoalieStats, calculateOpponentStats, matches } = useHockey();

  const playerStatsData = players
    .filter((p) => p.position !== 'goalie')
    .map((p) => ({
      player: p,
      stats: calculatePlayerStats(p.id),
    }))
    .filter((d) => d.stats.gamesPlayed > 0)
    .sort((a, b) => b.stats.points - a.stats.points);

  const goalieStatsData = players
    .filter((p) => p.position === 'goalie')
    .map((p) => ({
      player: p,
      stats: calculateGoalieStats(p.id),
    }))
    .filter((d) => d.stats.gamesPlayed > 0)
    .sort((a, b) => b.stats.savePercentage - a.stats.savePercentage);

  const completedMatches = matches.filter((m) => !m.isActive);
  const opponentStats = calculateOpponentStats();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Statistics',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <Home color="#007AFF" size={20} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>

        {completedMatches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Match History</Text>
            <Text style={styles.emptyText}>
              Complete matches to see statistics
            </Text>
          </View>
        )}

        {completedMatches.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Match History</Text>
              <View style={styles.matchCard}>
                <Text style={styles.matchCardLabel}>Games Played</Text>
                <Text style={styles.matchCardValue}>{completedMatches.length}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Skaters</Text>
              {playerStatsData.length === 0 ? (
                <Text style={styles.noData}>No player data available</Text>
              ) : (
                playerStatsData.map(({ player, stats }) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerCard}
                    onPress={() => router.push(`/player-profile?playerId=${player.id}`)}
                  >
                    <View style={styles.playerHeader}>
                      <View style={styles.jerseyBadge}>
                        <Text style={styles.jerseyNumber}>{player.jerseyNumber}</Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        <Text style={styles.playerPosition}>
                          {stats.gamesPlayed} GP
                        </Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>G</Text>
                        <Text style={styles.statValue}>{stats.goals}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>A</Text>
                        <Text style={styles.statValue}>{stats.assists}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>P</Text>
                        <Text style={styles.statValue}>{stats.points}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>+/-</Text>
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
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>S</Text>
                        <Text style={styles.statValue}>{stats.shots}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>S%</Text>
                        <Text style={styles.statValue}>
                          {stats.shotPercentage.toFixed(0)}%
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                         <Text style={styles.statLabel}>F%</Text>
                         <Text style={styles.statValue}>
                           {stats.faceoffPercentage.toFixed(0)}%
                         </Text>
                      </View>
                      <View style={styles.statItem}>
                         <Text style={styles.statLabel}>G/L</Text>
                         <Text style={styles.statValue}>
                           {stats.possessionGains}/{stats.possessionLosses}
                         </Text>
                      </View>
                      <View style={styles.statItem}>
                         <Text style={styles.statLabel}>PIM</Text>
                         <Text style={styles.statValue}>{stats.penaltyMinutes}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {goalieStatsData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goalies</Text>
                {goalieStatsData.map(({ player, stats }) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerCard}
                    onPress={() => router.push(`/player-profile?playerId=${player.id}`)}
                  >
                    <View style={styles.playerHeader}>
                      <View style={styles.jerseyBadge}>
                        <Text style={styles.jerseyNumber}>{player.jerseyNumber}</Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        <Text style={styles.playerPosition}>
                          {stats.gamesPlayed} GP
                        </Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>SA</Text>
                        <Text style={styles.statValue}>{stats.shotsAgainst}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>SV</Text>
                        <Text style={styles.statValue}>{stats.saves}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>GA</Text>
                        <Text style={styles.statValue}>{stats.goalsAgainst}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>SV%</Text>
                        <Text style={styles.statValue}>
                          {stats.savePercentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {opponentStats.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Opponent Stats</Text>
                {opponentStats.map((opponent) => {
                  const winPercentage = opponent.gamesPlayed > 0
                    ? ((opponent.wins / opponent.gamesPlayed) * 100).toFixed(0)
                    : '0';
                  const goalDiff = opponent.goalsFor - opponent.goalsAgainst;

                  return (
                    <View key={opponent.opponentName} style={styles.opponentCard}>
                      <View style={styles.opponentHeader}>
                        <Text style={styles.opponentName}>{opponent.opponentName}</Text>
                        <Text style={styles.opponentRecord}>
                          {opponent.wins}-{opponent.losses}-{opponent.draws}
                        </Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>GP</Text>
                          <Text style={styles.statValue}>{opponent.gamesPlayed}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>W%</Text>
                          <Text style={styles.statValue}>{winPercentage}%</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>GF</Text>
                          <Text style={styles.statValue}>{opponent.goalsFor}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>GA</Text>
                          <Text style={styles.statValue}>{opponent.goalsAgainst}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Diff</Text>
                          <Text
                            style={[
                              styles.statValue,
                              goalDiff > 0 && styles.statValuePositive,
                              goalDiff < 0 && styles.statValueNegative,
                            ]}
                          >
                            {goalDiff > 0 ? '+' : ''}{goalDiff}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
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
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  matchCardLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 4,
  },
  matchCardValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  playerCard: {
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
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  jerseyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jerseyNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 14,
    color: '#8e8e93',
  },
  ratingBadge: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  statValuePositive: {
    color: '#34C759',
  },
  statValueNegative: {
    color: '#FF3B30',
  },
  noData: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  opponentCard: {
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
  opponentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  opponentName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  opponentRecord: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
});
