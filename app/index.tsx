import { useHockey } from '@/contexts/hockey-context';
import { GoalModal } from '@/components/GoalModal';
import { ShotModal } from '@/components/ShotModal';
import { PlayerActionModal } from '@/components/PlayerActionModal';
import { PeriodSummaryModal } from '@/components/PeriodSummaryModal';
import { MatchStatsModal } from '@/components/MatchStatsModal';
import { Stack, router } from 'expo-router';
import { Plus, Target, Users, BarChart3, AlertCircle, RefreshCw, Clock, TrendingUp, Shield, History } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Player } from '@/types/hockey';

export default function GameScreen() {
  const { activeMatch, players, endMatch, updateActiveMatch, addShot, nextPeriod } = useHockey();
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [shotModalVisible, setShotModalVisible] = useState(false);
  const [goalType, setGoalType] = useState<'our' | 'opponent'>('our');
  const [shotType, setShotType] = useState<'our' | 'opponent'>('our');
  const [pendingGoalScorerId, setPendingGoalScorerId] = useState<string | null>(null);
  const [isGoalShotMode, setIsGoalShotMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerActionModalVisible, setPlayerActionModalVisible] = useState(false);
  const [periodSummaryVisible, setPeriodSummaryVisible] = useState(false);
  const [matchStatsVisible, setMatchStatsVisible] = useState(false);

  const handleAddGoal = (type: 'our' | 'opponent') => {
    setGoalType(type);
    setGoalModalVisible(true);
  };

  const handleAddShot = (type: 'our' | 'opponent') => {
    if (type === 'opponent') {
      addShot({
        isOurTeam: false,
        onGoal: true,
        result: 'save',
      });
    } else {
      setShotType(type);
      setShotModalVisible(true);
    }
  };

  const handlePeriodAction = () => {
    setPeriodSummaryVisible(true);
  };

  const handlePeriodSummaryConfirm = () => {
    if (!activeMatch) return;

    const currentPeriod = activeMatch.currentPeriod || 1;
    const isDraw = activeMatch.ourScore === activeMatch.opponentScore;
    const isGameEndable = currentPeriod >= 3 && !isDraw;

    setPeriodSummaryVisible(false);

    if (isGameEndable) {
      endMatch();
      router.replace('/stats');
    } else {
      nextPeriod();
    }
  };

  const handleEndMatch = () => {
    Alert.alert('End Match', 'Are you sure you want to end this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Match',
        style: 'destructive',
        onPress: () => {
          endMatch();
          router.replace('/stats');
        },
      },
    ]);
  };

  const handlePlayerPress = (player: Player) => {
    setSelectedPlayer(player);
    setPlayerActionModalVisible(true);
  };

  const handleSwapGoalie = () => {
    if (!activeMatch) return;

    const goalies = players.filter(
      (p) =>
        activeMatch.roster.some((r) => r.playerId === p.id) &&
        p.position === 'goalie'
    );

    if (goalies.length < 2) {
      Alert.alert('Info', 'You need at least 2 goalies to swap');
      return;
    }

    const otherGoalies = goalies.filter((g) => g.id !== activeMatch.activeGoalieId);

    if (otherGoalies.length === 1) {
      updateActiveMatch({ activeGoalieId: otherGoalies[0].id });
      Alert.alert('Goalie Swapped', `${otherGoalies[0].name} is now in net`);
    } else {
      Alert.alert(
        'Select Goalie',
        'Choose which goalie to swap in:',
        otherGoalies.map((goalie) => ({
          text: `#${goalie.jerseyNumber} ${goalie.name}`,
          onPress: () => {
            updateActiveMatch({ activeGoalieId: goalie.id });
            Alert.alert('Goalie Swapped', `${goalie.name} is now in net`);
          },
        }))
      );
    }
  };

  if (!activeMatch) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.emptyContainer}>
          <AlertCircle color="#8e8e93" size={64} />
          <Text style={styles.emptyTitle}>No Active Match</Text>
          <Text style={styles.emptyText}>Start a new match to begin tracking</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/match-setup')}
          >
            <Plus color="#fff" size={20} />
            <Text style={styles.startButtonText}>Start New Match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/players')}
          >
            <Users color="#007AFF" size={20} />
            <Text style={styles.secondaryButtonText}>Manage Players</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/stats')}
          >
            <BarChart3 color="#007AFF" size={20} />
            <Text style={styles.secondaryButtonText}>View Statistics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/opponents')}
          >
            <Shield color="#007AFF" size={20} />
            <Text style={styles.secondaryButtonText}>Manage Opponents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/match-history')}
          >
            <History color="#007AFF" size={20} />
            <Text style={styles.secondaryButtonText}>Match History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rosterPlayers = players.filter((p) =>
    activeMatch.roster.some((r) => r.playerId === p.id)
  );

  const activeGoalie = activeMatch
    ? players.find((p) => p.id === activeMatch.activeGoalieId)
    : null;

  console.log('GameScreen render - Current scores:', {
    ourScore: activeMatch.ourScore,
    opponentScore: activeMatch.opponentScore,
    ourShots: activeMatch.ourShots,
    opponentShots: activeMatch.opponentShots,
    goalsCount: activeMatch.goals.length,
    period: activeMatch.currentPeriod,
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/players')}>
          <Users color="#007AFF" size={24} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
           <Text style={styles.topBarTitle}>Live Match</Text>
           {activeMatch && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <Clock size={14} color="#8e8e93" />
                 <Text style={{ color: '#8e8e93', fontSize: 12, fontWeight: '600' }}>
                    Period {activeMatch.currentPeriod || 1}
                 </Text>
              </View>
           )}
        </View>
        <TouchableOpacity onPress={() => router.push('/stats')}>
          <BarChart3 color="#007AFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        <View style={styles.scoreSection}>
          <Text style={styles.opponent}>{activeMatch.opponentName}</Text>
          <View style={styles.scoreBoard}>
            <View style={styles.scoreColumn}>
              <Text style={styles.teamLabel}>Us</Text>
              <Text style={styles.score}>{activeMatch.ourScore}</Text>
              <Text style={styles.shots}>{activeMatch.ourShots} shots</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreColumn}>
              <Text style={styles.teamLabel}>Them</Text>
              <Text style={styles.score}>{activeMatch.opponentScore}</Text>
              <Text style={styles.shots}>{activeMatch.opponentShots} shots</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.matchStatsButton}
          onPress={() => setMatchStatsVisible(true)}
        >
          <TrendingUp color="#007AFF" size={20} />
          <Text style={styles.matchStatsButtonText}>View Match Stats</Text>
        </TouchableOpacity>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, styles.goalCard]}
              onPress={() => handleAddGoal('our')}
            >
              <Plus color="#fff" size={32} />
              <Text style={styles.actionCardTitle}>Our Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.shotCard]}
              onPress={() => handleAddShot('our')}
            >
              <Target color="#fff" size={32} />
              <Text style={styles.actionCardTitle}>Our Shot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.goalAgainstCard]}
              onPress={() => handleAddGoal('opponent')}
            >
              <AlertCircle color="#fff" size={32} />
              <Text style={styles.actionCardTitle}>Goal Against</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.shotAgainstCard]}
              onPress={() => handleAddShot('opponent')}
            >
              <Target color="#fff" size={32} />
              <Text style={styles.actionCardTitle}>Shot Against</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeGoalie && (
          <View style={styles.goalieSection}>
            <View style={styles.goalieSectionHeader}>
              <Text style={styles.sectionTitle}>Starting Goalie</Text>
              {players.filter(
                (p) =>
                  activeMatch.roster.some((r) => r.playerId === p.id) &&
                  p.position === 'goalie'
              ).length > 1 && (
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={handleSwapGoalie}
                >
                  <RefreshCw color="#007AFF" size={20} />
                  <Text style={styles.swapButtonText}>Swap</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.goalieCard}>
              <View style={styles.goalieJerseyBadge}>
                <Text style={styles.goalieJerseyNumber}>{activeGoalie.jerseyNumber}</Text>
              </View>
              <View style={styles.goalieInfo}>
                <Text style={styles.goalieName}>{activeGoalie.name}</Text>
                <Text style={styles.goalieLabel}>In Net</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.rosterSection}>
          <Text style={styles.sectionTitle}>Active Roster</Text>
          <View style={styles.rosterGrid}>
            {rosterPlayers
              .filter((p) => p.position !== 'goalie')
              .map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.rosterCard}
                  onPress={() => handlePlayerPress(player)}
                >
                  <View style={styles.rosterBadge}>
                    <Text style={styles.rosterNumber}>{player.jerseyNumber}</Text>
                  </View>
                  <Text style={styles.rosterName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <Text style={styles.rosterPosition}>
                    {player.position[0].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        <TouchableOpacity style={styles.endMatchButton} onPress={handlePeriodAction}>
          <Text style={styles.endMatchButtonText}>
             {activeMatch && (activeMatch.currentPeriod || 1) >= 3 && activeMatch.ourScore !== activeMatch.opponentScore
                ? "End Match"
                : `End Period ${activeMatch.currentPeriod || 1}`
             }
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        isOurTeam={goalType === 'our'}
        onClose={() => setGoalModalVisible(false)}
        onOpenShotModal={(scorerId) => {
          console.log('Opening shot modal with scorer ID:', scorerId);
          setPendingGoalScorerId(scorerId);
          setIsGoalShotMode(true);
          setShotModalVisible(true);
        }}
      />

      <ShotModal
        visible={shotModalVisible}
        isOurTeam={shotType === 'our'}
        onClose={() => {
          setShotModalVisible(false);
          setPendingGoalScorerId(null);
          setIsGoalShotMode(false);
        }}
        preselectedScorer={pendingGoalScorerId || undefined}
        isGoalShot={isGoalShotMode}
      />

      <PlayerActionModal
        visible={playerActionModalVisible}
        player={selectedPlayer}
        isCenter={selectedPlayer ? activeMatch.centers?.includes(selectedPlayer.id) : false}
        onClose={() => {
          setPlayerActionModalVisible(false);
          setSelectedPlayer(null);
        }}
      />

      <PeriodSummaryModal
        visible={periodSummaryVisible}
        match={activeMatch}
        players={players}
        onClose={() => setPeriodSummaryVisible(false)}
        onNextPeriod={handlePeriodSummaryConfirm}
      />

      <MatchStatsModal
        visible={matchStatsVisible}
        onClose={() => setMatchStatsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#0a0e1a',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  scoreSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  opponent: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreBoard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  scoreColumn: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8e8e93',
    marginBottom: 8,
  },
  score: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  shots: {
    fontSize: 14,
    color: '#8e8e93',
  },
  scoreDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#3a3a3c',
    marginHorizontal: 16,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    aspectRatio: 1.5,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goalCard: {
    backgroundColor: '#34C759',
  },
  shotCard: {
    backgroundColor: '#007AFF',
  },
  goalAgainstCard: {
    backgroundColor: '#FF3B30',
  },
  shotAgainstCard: {
    backgroundColor: '#FF9500',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center',
  },
  rosterSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  rosterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rosterCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '22%',
  },
  rosterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rosterNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  rosterName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  rosterPosition: {
    fontSize: 10,
    color: '#8e8e93',
  },
  endMatchButton: {
    marginHorizontal: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endMatchButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  matchStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1c1c1e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  matchStatsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  goalieSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  goalieSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
  },
  swapButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  goalieCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalieJerseyBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalieJerseyNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  goalieInfo: {
    flex: 1,
  },
  goalieName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  goalieLabel: {
    fontSize: 14,
    color: '#34C759',
  },
});
