import { useHockey } from '@/contexts/hockey-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Target, Users, Crosshair } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { getRatingColor } from '@/constants/ratingColors';
import { ShotDiagram } from '@/components/ShotDiagram';

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { matches, players } = useHockey();

  const match = useMemo(() => {
    return matches.find((m) => m.id === matchId);
  }, [matches, matchId]);

  const playerMatchStats = useMemo(() => {
    if (!match) return [];

    return match.roster
      .map((r) => {
        const player = players.find((p) => p.id === r.playerId);
        if (!player) return null;

        let goals = 0;
        let assists = 0;
        let plusMinus = 0;
        let shots = 0;
        let penaltyMinutes = 0;

        match.goals.forEach((goal) => {
          if (goal.scorerId === r.playerId) goals++;
          if (goal.assists.includes(r.playerId)) assists++;
          if (goal.isOurTeam && goal.plusPlayers.includes(r.playerId)) plusMinus++;
          if (!goal.isOurTeam && goal.minusPlayers.includes(r.playerId)) plusMinus--;
        });

        match.shots.forEach((shot) => {
          if (shot.playerId === r.playerId && shot.isOurTeam) shots++;
        });

        match.penalties.forEach((pen) => {
          if (pen.playerId === r.playerId) penaltyMinutes += pen.minutes;
        });

        const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;

        let possessionGains = 0;
        let possessionLosses = 0;
        match.possessions.forEach((poss) => {
          if (poss.playerId === r.playerId) {
            if (poss.type === 'gain') possessionGains++;
            else possessionLosses++;
          }
        });

        let faceoffWins = 0;
        let faceoffLosses = 0;
        if (match.faceoffs) {
          match.faceoffs.forEach((faceoff) => {
            if (faceoff.winnerId === r.playerId) faceoffWins++;
            if (faceoff.loserId === r.playerId) faceoffLosses++;
          });
        }

        const rating = calculateRating(
          goals,
          assists,
          plusMinus,
          shotPercentage,
          possessionGains,
          possessionLosses,
          penaltyMinutes,
          faceoffWins,
          faceoffLosses,
          shots,
          player.position
        );

        return {
          player,
          goals,
          assists,
          points: goals + assists,
          plusMinus,
          shots,
          penaltyMinutes,
          rating,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.points - a.points);
  }, [match, players]);

  const teamStats = useMemo(() => {
    if (!match) return null;

    const ourGoals = match.goals.filter((g) => g.isOurTeam).length;
    const ourPenalties = match.penalties.length;
    const ourPIM = match.penalties.reduce((sum, pen) => sum + pen.minutes, 0);

    let ourFaceoffWins = 0;
    let ourFaceoffLosses = 0;
    if (match.faceoffs) {
      match.faceoffs.forEach((faceoff) => {
        if (match.roster.some((r) => r.playerId === faceoff.winnerId)) {
          ourFaceoffWins++;
        } else {
          ourFaceoffLosses++;
        }
      });
    }

    const totalFaceoffs = ourFaceoffWins + ourFaceoffLosses;
    const faceoffPercentage =
      totalFaceoffs > 0 ? (ourFaceoffWins / totalFaceoffs) * 100 : 0;

    return {
      goals: ourGoals,
      shots: match.ourShots,
      penalties: ourPenalties,
      pim: ourPIM,
      faceoffWins: ourFaceoffWins,
      faceoffTotal: totalFaceoffs,
      faceoffPercentage,
    };
  }, [match]);

  if (!match) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Match Detail',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft color="#007AFF" size={28} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Match not found</Text>
        </View>
      </View>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isWin = match.ourScore > match.opponentScore;
  const isDraw = match.ourScore === match.opponentScore;
  const isLoss = match.ourScore < match.opponentScore;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Match Detail',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.dateText}>{formatDate(match.date)}</Text>

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
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statHeader}>
            <Target color="#007AFF" size={20} />
            <Text style={styles.sectionTitle}>Team Stats</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teamStats?.goals || 0}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teamStats?.shots || 0}</Text>
              <Text style={styles.statLabel}>Shots</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teamStats?.pim || 0}</Text>
              <Text style={styles.statLabel}>PIM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {teamStats?.faceoffPercentage.toFixed(0) || 0}%
              </Text>
              <Text style={styles.statLabel}>Face-offs</Text>
            </View>
          </View>

          <View style={styles.additionalStats}>
            <View style={styles.additionalStatRow}>
              <Text style={styles.additionalStatLabel}>Face-off Wins</Text>
              <Text style={styles.additionalStatValue}>
                {teamStats?.faceoffWins || 0} / {teamStats?.faceoffTotal || 0}
              </Text>
            </View>
            <View style={styles.additionalStatRow}>
              <Text style={styles.additionalStatLabel}>Penalties</Text>
              <Text style={styles.additionalStatValue}>{teamStats?.penalties || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.playersCard}>
          <View style={styles.statHeader}>
            <Users color="#007AFF" size={20} />
            <Text style={styles.sectionTitle}>Player Stats</Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.playerNameCol]}>Player</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>G</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>A</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>P</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>+/-</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>PIM</Text>
            <Text style={[styles.tableHeaderText, styles.statCol]}>SOG</Text>
            <Text style={[styles.tableHeaderText, styles.ratingCol]}>Rating</Text>
          </View>

          {playerMatchStats.map((stat) => (
            <View key={stat.player.id} style={styles.tableRow}>
              <View style={styles.playerNameCol}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {stat.player.name}
                </Text>
                <Text style={styles.playerPosition}>{stat.player.position[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.statText, styles.statCol]}>{stat.goals}</Text>
              <Text style={[styles.statText, styles.statCol]}>{stat.assists}</Text>
              <Text style={[styles.statText, styles.statCol]}>{stat.points}</Text>
              <Text
                style={[
                  styles.statText,
                  styles.statCol,
                  stat.plusMinus > 0 && styles.positiveText,
                  stat.plusMinus < 0 && styles.negativeText,
                ]}
              >
                {stat.plusMinus > 0 ? '+' : ''}
                {stat.plusMinus}
              </Text>
              <Text style={[styles.statText, styles.statCol]}>{stat.penaltyMinutes}</Text>
              <Text style={[styles.statText, styles.statCol]}>{stat.shots}</Text>
              <View style={styles.ratingCol}>
                <View
                  style={[
                    styles.ratingBadge,
                    { backgroundColor: getRatingColor(stat.rating) },
                  ]}
                >
                  <Text style={styles.ratingText}>{stat.rating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.shotCard}>
          <View style={styles.statHeader}>
            <Crosshair color="#007AFF" size={20} />
            <Text style={styles.sectionTitle}>Our Shots on Target</Text>
          </View>
          <ShotDiagram
            shots={match.shots}
            players={players}
            isOurTeam={true}
            periods={match.currentPeriod || 3}
          />
        </View>

        <View style={styles.shotCard}>
          <View style={styles.statHeader}>
            <Crosshair color="#FF3B30" size={20} />
            <Text style={styles.sectionTitle}>Opponent Shots on Target</Text>
          </View>
          <ShotDiagram
            shots={match.shots}
            players={players}
            isOurTeam={false}
            periods={match.currentPeriod || 3}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function calculateRating(
  goals: number,
  assists: number,
  plusMinus: number,
  shotPercentage: number,
  possessionGains: number,
  possessionLosses: number,
  penaltyMinutes: number,
  faceoffWins: number,
  faceoffLosses: number,
  shots: number,
  position: string
): number {
  if (position === 'goalie') {
    return 6.0;
  }

  let rating = 6.0;

  const points = goals + assists;
  if (points >= 4) rating += 2.5;
  else if (points >= 3) rating += 2.0;
  else if (points >= 2) rating += 1.5;
  else if (points >= 1) rating += 0.8;
  else if (points === 0) rating -= 0.3;

  if (plusMinus >= 3) rating += 1.5;
  else if (plusMinus >= 2) rating += 1.0;
  else if (plusMinus >= 1) rating += 0.5;
  else if (plusMinus === 0) rating += 0;
  else if (plusMinus === -1) rating -= 0.5;
  else if (plusMinus === -2) rating -= 1.2;
  else if (plusMinus <= -3) rating -= 2.0;

  if (shots > 0) {
    if (shotPercentage >= 30) rating += 0.8;
    else if (shotPercentage >= 20) rating += 0.5;
    else if (shotPercentage >= 10) rating += 0.2;
    else if (shotPercentage < 10 && shots >= 5) rating -= 0.3;
  }

  if (possessionGains + possessionLosses > 0) {
    const possessionRatio = possessionGains / (possessionGains + possessionLosses);
    if (possessionRatio >= 0.7) rating += 0.5;
    else if (possessionRatio >= 0.6) rating += 0.3;
    else if (possessionRatio < 0.4) rating -= 0.3;
  }

  if (penaltyMinutes >= 10) rating -= 2.5;
  else if (penaltyMinutes >= 6) rating -= 1.8;
  else if (penaltyMinutes >= 4) rating -= 1.2;
  else if (penaltyMinutes >= 2) rating -= 0.7;

  const faceoffTotal = faceoffWins + faceoffLosses;
  if (faceoffTotal >= 5) {
    const faceoffPct = (faceoffWins / faceoffTotal) * 100;
    if (faceoffPct >= 60) rating += 0.6;
    else if (faceoffPct >= 55) rating += 0.3;
    else if (faceoffPct < 40) rating -= 0.4;
  }

  return Math.min(10, Math.max(0, rating));
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#8e8e93',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 42,
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  statItem: {
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
  },
  additionalStats: {
    gap: 12,
  },
  additionalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  additionalStatLabel: {
    fontSize: 15,
    color: '#1c1c1e',
  },
  additionalStatValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  playersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5ea',
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
    alignItems: 'center',
  },
  playerNameCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 13,
    color: '#1c1c1e',
    fontWeight: '500' as const,
    flex: 1,
  },
  playerPosition: {
    fontSize: 10,
    color: '#8e8e93',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statCol: {
    flex: 1,
    textAlign: 'center' as const,
  },
  statText: {
    fontSize: 13,
    color: '#1c1c1e',
  },
  positiveText: {
    color: '#34C759',
    fontWeight: '600' as const,
  },
  negativeText: {
    color: '#FF3B30',
    fontWeight: '600' as const,
  },
  ratingCol: {
    flex: 1,
    alignItems: 'center',
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  shotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
