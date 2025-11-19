import { useHockey } from '@/contexts/hockey-context';
import { X } from 'lucide-react-native';
import React from 'react';
import { getRatingColor } from '@/constants/colors';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';


interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PlayerMatchStats {
  playerId: string;
  goals: number;
  assists: number;
  plusMinus: number;
  penaltyMinutes: number;
  possessionGains: number;
  possessionLosses: number;
  faceoffWins: number;
  faceoffLosses: number;
  shots: number;
  rating: number;
}

interface GoalieMatchStats {
  playerId: string;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  rating: number;
}

export function MatchStatsModal({ visible, onClose }: MatchStatsModalProps) {
  const { players, activeMatch } = useHockey();

  if (!activeMatch) {
    return null;
  }

  const calculateMatchStats = (playerId: string): PlayerMatchStats => {
    let goals = 0;
    let assists = 0;
    let plusMinus = 0;
    let penaltyMinutes = 0;
    let possessionGains = 0;
    let possessionLosses = 0;
    let faceoffWins = 0;
    let faceoffLosses = 0;
    let shots = 0;

    activeMatch.goals.forEach((goal) => {
      if (goal.scorerId === playerId) goals++;
      if (goal.assists.includes(playerId)) assists++;
      if (goal.isOurTeam && goal.plusPlayers.includes(playerId)) plusMinus++;
      if (!goal.isOurTeam && goal.minusPlayers.includes(playerId)) plusMinus--;
    });

    activeMatch.shots.forEach((shot) => {
      if (shot.playerId === playerId && shot.isOurTeam) shots++;
    });

    activeMatch.penalties.forEach((penalty) => {
      if (penalty.playerId === playerId) penaltyMinutes += penalty.minutes;
    });

    activeMatch.possessions.forEach((poss) => {
      if (poss.playerId === playerId) {
        if (poss.type === 'gain') possessionGains++;
        else possessionLosses++;
      }
    });

    if (activeMatch.faceoffs) {
      activeMatch.faceoffs.forEach((faceoff) => {
        if (faceoff.winnerId === playerId) faceoffWins++;
        if (faceoff.loserId === playerId) faceoffLosses++;
      });
    }

    const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;
    const rating = calculateRating(
      goals,
      assists,
      plusMinus,
      shotPercentage,
      possessionGains,
      possessionLosses,
      penaltyMinutes,
      faceoffWins,
      faceoffLosses
    );

    return {
      playerId,
      goals,
      assists,
      plusMinus,
      penaltyMinutes,
      possessionGains,
      possessionLosses,
      faceoffWins,
      faceoffLosses,
      shots,
      rating,
    };
  };

  const calculateGoalieMatchStats = (playerId: string): GoalieMatchStats => {
    const goalsAgainst = activeMatch.goals.filter(
      (g) => !g.isOurTeam && g.goalieId === playerId
    ).length;
    const saves = activeMatch.shots.filter(
      (s) => !s.isOurTeam && s.goalieId === playerId && s.result === 'save'
    ).length;
    const shotsAgainst = goalsAgainst + saves;
    const savePercentage = shotsAgainst > 0 ? (saves / shotsAgainst) * 100 : 0;
    const baseRating = savePercentage / 10;
    const rating = 6.0 + (baseRating / 10) * 4.0;

    return {
      playerId,
      shotsAgainst,
      saves,
      goalsAgainst,
      rating: Math.min(10, Math.max(0, rating)),
    };
  };

  const rosterPlayers = players.filter((p) =>
    activeMatch.roster.some((r) => r.playerId === p.id && p.position !== 'goalie')
  );

  const rosterGoalies = players.filter((p) =>
    activeMatch.roster.some((r) => r.playerId === p.id && p.position === 'goalie')
  );

  const skaterStats = rosterPlayers
    .map((player) => ({
      player,
      stats: calculateMatchStats(player.id),
    }))
    .sort((a, b) => {
      const aPoints = a.stats.goals + a.stats.assists;
      const bPoints = b.stats.goals + b.stats.assists;
      return bPoints - aPoints;
    });

  const goalieStats = rosterGoalies.map((player) => ({
    player,
    stats: calculateGoalieMatchStats(player.id),
  }));

  const isCenter = (playerId: string) => {
    return activeMatch.centers?.includes(playerId) || false;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Match Stats</Text>
            <Text style={styles.subtitle}>
              Period {activeMatch.currentPeriod || 1} • {activeMatch.ourScore}-{activeMatch.opponentScore}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skaters</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.playerColumn]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>G</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>A</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>S</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>+/-</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>PIM</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>P</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>FO</Text>
                <Text style={[styles.tableHeaderCell, styles.statColumn]}>RAT</Text>
              </View>

              {skaterStats.map(({ player, stats }) => {
                const faceoffTotal = stats.faceoffWins + stats.faceoffLosses;
                const faceoffDisplay = faceoffTotal > 0 ? `${stats.faceoffWins}/${faceoffTotal}` : '-';

                return (
                  <View key={player.id} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.playerColumn]}>
                      <View style={styles.playerBadge}>
                        <Text style={styles.playerNumber}>{player.jerseyNumber}</Text>
                      </View>
                      <View style={styles.playerNameContainer}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.name}
                        </Text>
                        <Text style={styles.playerPosition}>
                          {player.position[0].toUpperCase()}
                          {isCenter(player.id) && ' • C'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.tableCell, styles.statColumn]}>
                      {stats.goals}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn]}>
                      {stats.assists}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn]}>
                      {stats.shots}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.statColumn,
                        stats.plusMinus > 0 && styles.positiveValue,
                        stats.plusMinus < 0 && styles.negativeValue,
                      ]}
                    >
                      {stats.plusMinus > 0 ? '+' : ''}
                      {stats.plusMinus}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn]}>
                      {stats.penaltyMinutes}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn]}>
                      {stats.possessionGains}/{stats.possessionLosses}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn, styles.faceoffColumn]}>
                      {faceoffDisplay}
                    </Text>
                    <Text style={[styles.tableCell, styles.statColumn, { color: getRatingColor(stats.rating) }]}>
                      {stats.rating.toFixed(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {goalieStats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goalies</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.goalieNameColumn]}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.statColumn]}>SA</Text>
                  <Text style={[styles.tableHeaderCell, styles.statColumn]}>SV</Text>
                  <Text style={[styles.tableHeaderCell, styles.statColumn]}>GA</Text>
                  <Text style={[styles.tableHeaderCell, styles.statColumn]}>SV%</Text>
                  <Text style={[styles.tableHeaderCell, styles.statColumn]}>RAT</Text>
                </View>

                {goalieStats.map(({ player, stats }) => {
                  const savePercentage =
                    stats.shotsAgainst > 0
                      ? ((stats.saves / stats.shotsAgainst) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <View key={player.id} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.goalieNameColumn]}>
                        <View style={styles.playerBadge}>
                          <Text style={styles.playerNumber}>{player.jerseyNumber}</Text>
                        </View>
                        <View style={styles.playerNameContainer}>
                          <Text style={styles.playerName} numberOfLines={1}>
                            {player.name}
                          </Text>
                          {player.id === activeMatch.activeGoalieId && (
                            <Text style={styles.activeGoalieLabel}>IN NET</Text>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.tableCell, styles.statColumn]}>
                        {stats.shotsAgainst}
                      </Text>
                      <Text style={[styles.tableCell, styles.statColumn]}>
                        {stats.saves}
                      </Text>
                      <Text style={[styles.tableCell, styles.statColumn]}>
                        {stats.goalsAgainst}
                      </Text>
                      <Text style={[styles.tableCell, styles.statColumn]}>
                        {savePercentage}%
                      </Text>
                      <Text style={[styles.tableCell, styles.statColumn, { color: getRatingColor(stats.rating) }]}>
                        {stats.rating.toFixed(1)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.legendSection}>
            <Text style={styles.legendTitle}>Legend</Text>
            <Text style={styles.legendText}>G: Goals • A: Assists • S: Shots • +/-: Plus/Minus</Text>
            <Text style={styles.legendText}>PIM: Penalty Minutes • P: Possessions (Gains/Losses)</Text>
            <Text style={styles.legendText}>FO: Faceoffs (Wins/Total)</Text>
            <Text style={styles.legendText}>SA: Shots Against • SV: Saves • GA: Goals Against</Text>
            <Text style={styles.legendText}>RAT: Rating (0-10 scale, starts at 6.0)</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  faceoffLosses: number
): number {
  const offensiveRating = (goals * 2 + assists * 1.5) / Math.max(1, goals + assists) * 2;
  const efficiencyRating = shotPercentage / 10;
  const plusMinusRating = Math.max(0, Math.min(10, 5 + plusMinus * 0.5));
  const possessionRating =
    possessionGains > 0
      ? Math.min(10, (possessionGains / (possessionGains + possessionLosses)) * 10)
      : 5;
  const disciplineRating = Math.max(0, 10 - penaltyMinutes * 0.5);
  
  const faceoffTotal = faceoffWins + faceoffLosses;
  const faceoffRating = faceoffTotal > 0 ? (faceoffWins / faceoffTotal) * 10 : 5;

  const baseRating =
    (offensiveRating * 0.3 +
      efficiencyRating * 0.2 +
      plusMinusRating * 0.2 +
      possessionRating * 0.1 +
      disciplineRating * 0.1 +
      faceoffRating * 0.1) *
    1.0;

  const scaledRating = 6.0 + (baseRating / 10) * 4.0;
  
  return Math.min(10, Math.max(0, scaledRating));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e8e93',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    textAlign: 'center' as const,
  },
  playerColumn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left' as const,
  },
  goalieNameColumn: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left' as const,
  },
  statColumn: {
    flex: 0.8,
  },
  faceoffColumn: {
    flex: 1,
  },
  playerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  playerNameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 11,
    color: '#8e8e93',
  },
  positiveValue: {
    color: '#34C759',
  },
  negativeValue: {
    color: '#FF3B30',
  },
  activeGoalieLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  legendSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 4,
  },
});
