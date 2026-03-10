import { useHockey } from '@/contexts/hockey-context';
import { GoalModal } from '@/components/GoalModal';
import { ShotModal } from '@/components/ShotModal';
import { PlayerActionModal } from '@/components/PlayerActionModal';
import { PeriodSummaryModal } from '@/components/PeriodSummaryModal';
import { MatchStatsModal } from '@/components/MatchStatsModal';
import { FaceoffModal } from '@/components/FaceoffModal';
import { ShootoutModal } from '@/components/ShootoutModal';
import { Stack, router } from 'expo-router';
import { Plus, Target, Users, BarChart3, AlertCircle, RefreshCw, Clock, TrendingUp, Shield, History, Zap, ShieldOff, Circle } from 'lucide-react-native';
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Player, GameState, ShotRisk } from '@/types/hockey';

export default function GameScreen() {
  const {
    activeMatch,
    players,
    endMatch,
    updateActiveMatch,
    addShot,
    nextPeriod,
    setGameState,
    getPPSHSummary,
  } = useHockey();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [shotModalVisible, setShotModalVisible] = useState(false);
  const [goalType, setGoalType] = useState<'our' | 'opponent'>('our');
  const [shotType, setShotType] = useState<'our' | 'opponent'>('our');
  const [pendingGoalScorerId, setPendingGoalScorerId] = useState<string | null>(null);
  const [pendingGoalShotId, setPendingGoalShotId] = useState<string | null>(null);
  const [isGoalShotMode, setIsGoalShotMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerActionModalVisible, setPlayerActionModalVisible] = useState(false);
  const [periodSummaryVisible, setPeriodSummaryVisible] = useState(false);
  const [matchStatsVisible, setMatchStatsVisible] = useState(false);
  const [faceoffModalVisible, setFaceoffModalVisible] = useState(false);
  const [faceoffType, setFaceoffType] = useState<'win' | 'loss'>('win');
  const [shootoutVisible, setShootoutVisible] = useState(false);
  const [oppShotRiskVisible, setOppShotRiskVisible] = useState(false);
  const [ppshSummary, setPpshSummary] = useState<{ type: GameState | undefined; ourShots: number; oppShots: number; ourGoals: number; oppGoals: number; foWins: number; foLosses: number } | null>(null);
  const ppshOpacity = useRef(new Animated.Value(0)).current;
  const ppshTranslateY = useRef(new Animated.Value(-30)).current;
  const ppshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddGoal = useCallback((type: 'our' | 'opponent') => {
    setGoalType(type);
    setGoalModalVisible(true);
  }, []);

  const handleAddShot = useCallback((type: 'our' | 'opponent') => {
    if (type === 'opponent') {
      setOppShotRiskVisible(true);
    } else {
      setShotType(type);
      setShotModalVisible(true);
    }
  }, []);

  const handleOppShotWithRisk = useCallback((risk: ShotRisk) => {
    addShot({
      isOurTeam: false,
      onGoal: true,
      result: 'save',
      shotRisk: risk,
    });
    setOppShotRiskVisible(false);
  }, [addShot]);

  const handleFaceoff = useCallback((type: 'win' | 'loss') => {
    setFaceoffType(type);
    setFaceoffModalVisible(true);
  }, []);

  const showPPSHToast = useCallback((summary: { type: GameState | undefined; ourShots: number; oppShots: number; ourGoals: number; oppGoals: number; foWins: number; foLosses: number }) => {
    if (ppshTimerRef.current) clearTimeout(ppshTimerRef.current);
    setPpshSummary(summary);
    ppshOpacity.setValue(0);
    ppshTranslateY.setValue(-30);
    Animated.parallel([
      Animated.timing(ppshOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(ppshTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    ppshTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(ppshOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ppshTranslateY, { toValue: -30, duration: 300, useNativeDriver: true }),
      ]).start(() => setPpshSummary(null));
    }, 3000);
  }, [ppshOpacity, ppshTranslateY]);

  const handleGameStateChange = useCallback((newState: GameState) => {
    if (!activeMatch) return;

    const currentState = activeMatch.gameState || 'even';
    if (currentState === newState) return;

    if ((currentState === 'pp' || currentState === 'sh') && newState !== currentState) {
      const summary = getPPSHSummary();
      if (summary) {
        showPPSHToast(summary);
      }
    }

    setGameState(newState);
  }, [activeMatch, setGameState, getPPSHSummary, showPPSHToast]);

  const handlePeriodAction = useCallback(() => {
    setPeriodSummaryVisible(true);
  }, []);

  const handlePeriodSummaryConfirm = useCallback(() => {
    if (!activeMatch) return;

    const currentPeriod = activeMatch.currentPeriod || 1;
    const isDraw = activeMatch.ourScore === activeMatch.opponentScore;
    const isOT = activeMatch.isOvertime === true;

    setPeriodSummaryVisible(false);

    if (currentPeriod >= 3 && !isDraw && !isOT) {
      endMatch('regulation');
      router.replace('/stats');
    } else if (isOT && !isDraw) {
      endMatch('overtime');
      router.replace('/stats');
    } else if (currentPeriod < 3) {
      nextPeriod();
    }
  }, [activeMatch, endMatch, nextPeriod]);

  const handleEndAsDraw = useCallback(() => {
    setPeriodSummaryVisible(false);
    endMatch('draw');
    router.replace('/stats');
  }, [endMatch]);

  const handleStartOvertime = useCallback(() => {
    setPeriodSummaryVisible(false);
    nextPeriod(true);
  }, [nextPeriod]);

  const handleContinueOvertime = useCallback(() => {
    setPeriodSummaryVisible(false);
    nextPeriod(true);
  }, [nextPeriod]);

  const handleStartShootout = useCallback(() => {
    setPeriodSummaryVisible(false);
    setShootoutVisible(true);
  }, []);

  const handleShootoutComplete = useCallback(() => {
    setShootoutVisible(false);
    endMatch('shootout');
    router.replace('/stats');
  }, [endMatch]);

  const handlePlayerPress = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setPlayerActionModalVisible(true);
  }, []);

  const handleSwapGoalie = useCallback(() => {
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
  }, [activeMatch, players, updateActiveMatch]);

  if (!activeMatch) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
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

  const activeGoalie = players.find((p) => p.id === activeMatch.activeGoalieId) ?? null;

  const currentGameState = activeMatch.gameState || 'even';

  const periodLabel = activeMatch.isOvertime
    ? `OT${activeMatch.currentPeriod - 3 > 0 ? activeMatch.currentPeriod - 3 : ''}`
    : `Period ${activeMatch.currentPeriod || 1}`;

  const getEndButtonText = () => {
    const cp = activeMatch.currentPeriod || 1;
    const isDraw = activeMatch.ourScore === activeMatch.opponentScore;
    if (cp >= 3 && !isDraw) return 'End Match';
    if (activeMatch.isOvertime) return `End ${periodLabel}`;
    return `End Period ${cp}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/players')}>
          <Users color="#007AFF" size={24} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.topBarTitle}>Live Match</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color="#8e8e93" />
            <Text style={{ color: '#8e8e93', fontSize: 12, fontWeight: '600' as const }}>
              {periodLabel}
            </Text>
          </View>
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

        <View style={styles.gameStateSection}>
          <TouchableOpacity
            style={[styles.gsBtn, currentGameState === 'even' && styles.gsBtnActiveEven]}
            onPress={() => handleGameStateChange('even')}
          >
            <Circle size={16} color={currentGameState === 'even' ? '#fff' : '#8e8e93'} />
            <Text style={[styles.gsBtnText, currentGameState === 'even' && styles.gsBtnTextActive]}>EV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gsBtn, currentGameState === 'pp' && styles.gsBtnActivePP]}
            onPress={() => handleGameStateChange('pp')}
          >
            <Zap size={16} color={currentGameState === 'pp' ? '#fff' : '#FF9500'} />
            <Text style={[styles.gsBtnText, currentGameState === 'pp' && styles.gsBtnTextActive]}>PP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gsBtn, currentGameState === 'sh' && styles.gsBtnActiveSH]}
            onPress={() => handleGameStateChange('sh')}
          >
            <ShieldOff size={16} color={currentGameState === 'sh' ? '#fff' : '#FF3B30'} />
            <Text style={[styles.gsBtnText, currentGameState === 'sh' && styles.gsBtnTextActive]}>SH</Text>
          </TouchableOpacity>
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
              <Plus color="#fff" size={28} />
              <Text style={styles.actionCardTitle}>Our Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.shotCard]}
              onPress={() => handleAddShot('our')}
            >
              <Target color="#fff" size={28} />
              <Text style={styles.actionCardTitle}>Our Shot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.goalAgainstCard]}
              onPress={() => handleAddGoal('opponent')}
            >
              <AlertCircle color="#fff" size={28} />
              <Text style={styles.actionCardTitle}>Goal Against</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.shotAgainstCard]}
              onPress={() => handleAddShot('opponent')}
            >
              <Target color="#fff" size={28} />
              <Text style={styles.actionCardTitle}>Shot Against</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.faceoffRow}>
            <TouchableOpacity
              style={[styles.faceoffBtn, styles.foWinBtn]}
              onPress={() => handleFaceoff('win')}
            >
              <Text style={styles.faceoffBtnText}>FO Win</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.faceoffBtn, styles.foLossBtn]}
              onPress={() => handleFaceoff('loss')}
            >
              <Text style={styles.faceoffBtnText}>FO Loss</Text>
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
          <Text style={styles.endMatchButtonText}>{getEndButtonText()}</Text>
        </TouchableOpacity>
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        isOurTeam={goalType === 'our'}
        onClose={() => setGoalModalVisible(false)}
        onOpenShotModal={(scorerId, goalShotId) => {
          setPendingGoalScorerId(scorerId);
          setPendingGoalShotId(goalShotId);
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
          setPendingGoalShotId(null);
          setIsGoalShotMode(false);
        }}
        preselectedScorer={pendingGoalScorerId || undefined}
        isGoalShot={isGoalShotMode}
        goalShotId={pendingGoalShotId || undefined}
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
        onEndAsDraw={handleEndAsDraw}
        onStartOvertime={handleStartOvertime}
        onStartShootout={handleStartShootout}
        onContinueOvertime={handleContinueOvertime}
      />

      <MatchStatsModal
        visible={matchStatsVisible}
        onClose={() => setMatchStatsVisible(false)}
      />

      <FaceoffModal
        visible={faceoffModalVisible}
        type={faceoffType}
        onClose={() => setFaceoffModalVisible(false)}
      />

      <ShootoutModal
        visible={shootoutVisible}
        onClose={() => setShootoutVisible(false)}
        onComplete={handleShootoutComplete}
      />

      {ppshSummary && (
        <Animated.View
          style={[
            styles.ppshToast,
            {
              opacity: ppshOpacity,
              transform: [{ translateY: ppshTranslateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={[
            styles.ppshToastInner,
            ppshSummary.type === 'pp' ? styles.ppshToastPP : styles.ppshToastSH,
          ]}>
            <View style={styles.ppshToastHeader}>
              {ppshSummary.type === 'pp' ? (
                <Zap size={18} color="#fff" />
              ) : (
                <ShieldOff size={18} color="#fff" />
              )}
              <Text style={styles.ppshToastTitle}>
                {ppshSummary.type === 'pp' ? 'Power Play' : 'Shorthanded'} Over
              </Text>
            </View>
            <View style={styles.ppshToastStats}>
              <View style={styles.ppshStatBlock}>
                <Text style={styles.ppshStatValue}>{ppshSummary.ourGoals}-{ppshSummary.oppGoals}</Text>
                <Text style={styles.ppshStatLabel}>Goals</Text>
              </View>
              <View style={styles.ppshStatDivider} />
              <View style={styles.ppshStatBlock}>
                <Text style={styles.ppshStatValue}>{ppshSummary.ourShots}-{ppshSummary.oppShots}</Text>
                <Text style={styles.ppshStatLabel}>Shots</Text>
              </View>
              <View style={styles.ppshStatDivider} />
              <View style={styles.ppshStatBlock}>
                <Text style={styles.ppshStatValue}>{ppshSummary.foWins}-{ppshSummary.foLosses}</Text>
                <Text style={styles.ppshStatLabel}>Faceoffs</Text>
              </View>
            </View>
            <View style={styles.ppshToastProgressBar}>
              <Animated.View style={[styles.ppshProgressFill, ppshSummary.type === 'pp' ? styles.ppshProgressPP : styles.ppshProgressSH]} />
            </View>
          </View>
        </Animated.View>
      )}

      <Modal visible={oppShotRiskVisible} animationType="fade" transparent>
        <View style={styles.riskOverlay}>
          <View style={styles.riskModal}>
            <Text style={styles.riskModalTitle}>Shot Danger Level</Text>
            <TouchableOpacity
              style={[styles.riskOption, { backgroundColor: '#8e8e93' }]}
              onPress={() => handleOppShotWithRisk('low')}
            >
              <Text style={styles.riskOptionText}>Low</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.riskOption, { backgroundColor: '#FF9500' }]}
              onPress={() => handleOppShotWithRisk('medium')}
            >
              <Text style={styles.riskOptionText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.riskOption, { backgroundColor: '#FF3B30' }]}
              onPress={() => handleOppShotWithRisk('high')}
            >
              <Text style={styles.riskOptionText}>High</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.riskCancel}
              onPress={() => setOppShotRiskVisible(false)}
            >
              <Text style={styles.riskCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    textAlign: 'center' as const,
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
  gameStateSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  gsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  gsBtnActiveEven: {
    backgroundColor: '#3a3a3c',
  },
  gsBtnActivePP: {
    backgroundColor: '#FF9500',
  },
  gsBtnActiveSH: {
    backgroundColor: '#FF3B30',
  },
  gsBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#8e8e93',
  },
  gsBtnTextActive: {
    color: '#fff',
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
    textAlign: 'center' as const,
  },
  faceoffRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  faceoffBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  foWinBtn: {
    backgroundColor: '#2d6a4f',
  },
  foLossBtn: {
    backgroundColor: '#6c3d1a',
  },
  faceoffBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
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
    textAlign: 'center' as const,
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
    textAlign: 'center' as const,
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
  riskOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  riskModal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 10,
  },
  riskModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  riskOption: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  riskOptionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  riskCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  riskCancelText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  ppshToast: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  ppshToastInner: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ppshToastPP: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.4)',
  },
  ppshToastSH: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
  },
  ppshToastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ppshToastTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ppshToastStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  ppshStatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  ppshStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  ppshStatLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  ppshStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(142,142,147,0.3)',
  },
  ppshToastProgressBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  ppshProgressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
  ppshProgressPP: {
    backgroundColor: '#FF9500',
  },
  ppshProgressSH: {
    backgroundColor: '#FF3B30',
  },
});
