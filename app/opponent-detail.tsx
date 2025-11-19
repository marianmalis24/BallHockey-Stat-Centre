import { useHockey } from '@/contexts/hockey-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Trophy, Target, TrendingUp, Calendar } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function OpponentDetailScreen() {
  const { opponentName } = useLocalSearchParams<{ opponentName: string }>();
  const { matches } = useHockey();

  const opponentMatches = useMemo(() => {
    return matches
      .filter((m) => !m.isActive && m.opponentName === opponentName)
      .sort((a, b) => b.date - a.date);
  }, [matches, opponentName]);

  const headToHeadStats = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    opponentMatches.forEach((match) => {
      goalsFor += match.ourScore;
      goalsAgainst += match.opponentScore;

      if (match.ourScore > match.opponentScore) {
        wins++;
      } else if (match.ourScore < match.opponentScore) {
        losses++;
      } else {
        draws++;
      }
    });

    const gamesPlayed = opponentMatches.length;
    const winPercentage = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

    return {
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      gamesPlayed,
      winPercentage,
    };
  }, [opponentMatches]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleMatchPress = (matchId: string) => {
    router.push(`/match-detail?matchId=${matchId}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: opponentName,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Head-to-Head Stats</Text>

          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{headToHeadStats.wins}</Text>
              <Text style={styles.recordLabel}>Wins</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{headToHeadStats.draws}</Text>
              <Text style={styles.recordLabel}>Draws</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{headToHeadStats.losses}</Text>
              <Text style={styles.recordLabel}>Losses</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Trophy color="#FFD700" size={20} />
              <Text style={styles.statBoxLabel}>Win %</Text>
              <Text style={styles.statBoxValue}>
                {headToHeadStats.winPercentage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statBox}>
              <Target color="#007AFF" size={20} />
              <Text style={styles.statBoxLabel}>Score</Text>
              <Text style={styles.statBoxValue}>
                {headToHeadStats.goalsFor} - {headToHeadStats.goalsAgainst}
              </Text>
            </View>
            <View style={styles.statBox}>
              <TrendingUp color="#34C759" size={20} />
              <Text style={styles.statBoxLabel}>Games</Text>
              <Text style={styles.statBoxValue}>{headToHeadStats.gamesPlayed}</Text>
            </View>
          </View>
        </View>

        <View style={styles.matchesSection}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>

          {opponentMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color="#8e8e93" size={48} />
              <Text style={styles.emptyText}>No matches against {opponentName}</Text>
            </View>
          ) : (
            opponentMatches.map((match) => {
              const isWin = match.ourScore > match.opponentScore;
              const isDraw = match.ourScore === match.opponentScore;
              const isLoss = match.ourScore < match.opponentScore;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  onPress={() => handleMatchPress(match.id)}
                >
                  <View style={styles.matchCardHeader}>
                    <View style={styles.dateContainer}>
                      <Calendar color="#8e8e93" size={14} />
                      <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
                    </View>
                    <View
                      style={[
                        styles.resultBadge,
                        isWin && styles.winBadge,
                        isDraw && styles.drawBadge,
                        isLoss && styles.lossBadge,
                      ]}
                    >
                      <Text style={styles.resultText}>
                        {isWin ? 'W' : isDraw ? 'D' : 'L'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.matchScoreRow}>
                    <View style={styles.teamScore}>
                      <Text style={styles.teamName}>Us</Text>
                      <Text style={[styles.scoreText, isWin && styles.winningScore]}>
                        {match.ourScore}
                      </Text>
                    </View>
                    <Text style={styles.scoreDivider}>-</Text>
                    <View style={styles.teamScore}>
                      <Text style={styles.teamName}>{match.opponentName}</Text>
                      <Text style={[styles.scoreText, isLoss && styles.losingScore]}>
                        {match.opponentScore}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.matchStats}>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatLabel}>Shots</Text>
                      <Text style={styles.miniStatValue}>
                        {match.ourShots} - {match.opponentShots}
                      </Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatLabel}>Goals</Text>
                      <Text style={styles.miniStatValue}>
                        {match.goals.filter((g) => g.isOurTeam).length} -{' '}
                        {match.goals.filter((g) => !g.isOurTeam).length}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 16,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  recordItem: {
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  recordLabel: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 6,
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  matchesSection: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 12,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchDate: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBadge: {
    backgroundColor: '#34C759',
  },
  drawBadge: {
    backgroundColor: '#8e8e93',
  },
  lossBadge: {
    backgroundColor: '#FF3B30',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  winningScore: {
    color: '#34C759',
  },
  losingScore: {
    color: '#FF3B30',
  },
  scoreDivider: {
    fontSize: 20,
    color: '#8e8e93',
    marginHorizontal: 12,
  },
  matchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 4,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
});
