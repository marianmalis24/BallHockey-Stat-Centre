import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, Trash2, Calendar } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

export default function MatchHistoryScreen() {
  const { matches, deleteMatch } = useHockey();

  const completedMatches = matches
    .filter((m) => !m.isActive)
    .sort((a, b) => b.date - a.date);

  const handleDeleteMatch = (matchId: string, opponentName: string) => {
    Alert.alert(
      'Delete Match',
      `Are you sure you want to delete the match against ${opponentName}? This will also remove all stats from this match.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMatch(matchId);
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Match History',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')} style={styles.backButton}>
              <ChevronLeft color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {completedMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar color="#8e8e93" size={64} />
            <Text style={styles.emptyTitle}>No Match History</Text>
            <Text style={styles.emptyText}>
              Complete matches to see your game history
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {completedMatches.length} {completedMatches.length === 1 ? 'Match' : 'Matches'}
              </Text>
            </View>

            {completedMatches.map((match) => {
              const isWin = match.ourScore > match.opponentScore;
              const isDraw = match.ourScore === match.opponentScore;
              const isLoss = match.ourScore < match.opponentScore;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  onPress={() => router.push({ pathname: '/match-detail', params: { matchId: match.id } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchHeader}>
                    <View style={styles.dateContainer}>
                      <Calendar color="#8e8e93" size={16} />
                      <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteMatch(match.id, match.opponentName);
                      }}
                      style={styles.deleteButton}
                    >
                      <Trash2 color="#FF3B30" size={20} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.matchBody}>
                    <View style={styles.scoreSection}>
                      <View style={styles.teamSection}>
                        <Text style={styles.teamLabel}>Us</Text>
                        <Text style={[styles.score, isWin && styles.winningScore]}>
                          {match.ourScore}
                        </Text>
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

                      <View style={styles.teamSection}>
                        <Text style={styles.teamLabel}>{match.opponentName}</Text>
                        <Text style={[styles.score, isLoss && styles.losingScore]}>
                          {match.opponentScore}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statsSection}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Shots</Text>
                        <Text style={styles.statValue}>
                          {match.ourShots} - {match.opponentShots}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Goals</Text>
                        <Text style={styles.statValue}>
                          {match.goals.filter((g) => g.isOurTeam).length} -{' '}
                          {match.goals.filter((g) => !g.isOurTeam).length}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Periods</Text>
                        <Text style={styles.statValue}>{match.currentPeriod || 3}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchDate: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500' as const,
  },
  deleteButton: {
    padding: 4,
  },
  matchBody: {
    padding: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  score: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  winningScore: {
    color: '#34C759',
  },
  losingScore: {
    color: '#FF3B30',
  },
  resultBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
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
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
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
});
