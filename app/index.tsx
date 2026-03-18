import { useHockey } from '@/contexts/hockey-context';
import { GoalModal } from '@/components/GoalModal';
import { ShotModal } from '@/components/ShotModal';
import { PlayerActionModal } from '@/components/PlayerActionModal';
import { PeriodSummaryModal } from '@/components/PeriodSummaryModal';
import { MatchStatsModal } from '@/components/MatchStatsModal';
import { FaceoffModal } from '@/components/FaceoffModal';
import { ShootoutModal } from '@/components/ShootoutModal';
import { Stack, router } from 'expo-router';
import { Plus, Target, Users, BarChart3, AlertCircle, RefreshCw, TrendingUp, Shield, History, Zap, ShieldOff, Undo2, Activity, ShieldBan, CircleOff, GitCompare, PieChart, ChevronDown, ChevronUp } from 'lucide-react-native';
import { MomentumIndicator } from '@/components/MomentumIndicator';
import { LineShiftTracker } from '@/components/LineShiftTracker';
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
  Dimensions,
} from 'react-native';
import { Player, GameState, ShotRisk } from '@/types/hockey';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NavItem {
  label: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  bgColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Players', icon: <Users color="#5ac8fa" size={22} />, route: '/players', color: '#5ac8fa', bgColor: 'rgba(90,200,250,0.12)' },
  { label: 'Statistics', icon: <BarChart3 color="#34C759" size={22} />, route: '/stats', color: '#34C759', bgColor: 'rgba(52,199,89,0.12)' },
  { label: 'Opponents', icon: <Shield color="#FF9500" size={22} />, route: '/opponents', color: '#FF9500', bgColor: 'rgba(255,149,0,0.12)' },
  { label: 'Match History', icon: <History color="#AF52DE" size={22} />, route: '/match-history', color: '#AF52DE', bgColor: 'rgba(175,82,222,0.12)' },
  { label: 'Season', icon: <Activity color="#FF2D55" size={22} />, route: '/season-dashboard', color: '#FF2D55', bgColor: 'rgba(255,45,85,0.12)' },
  { label: 'Compare', icon: <GitCompare color="#5856D6" size={22} />, route: '/player-compare', color: '#5856D6', bgColor: 'rgba(88,86,214,0.12)' },
  { label: 'PP/PK', icon: <PieChart color="#FF6B6B" size={22} />, route: '/pp-pk-dashboard', color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.12)' },
];

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
    undoLastAction,
  } = useHockey();

  const insets = useSafeAreaInsets();

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
  const [blockedPlayerPickerVisible, setBlockedPlayerPickerVisible] = useState(false);
  const [widePlayerPickerVisible, setWidePlayerPickerVisible] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [ppshSummary, setPpshSummary] = useState<{ type: GameState | undefined; ourShots: number; oppShots: number; ourGoals: number; oppGoals: number; foWins: number; foLosses: number } | null>(null);
  const ppshOpacity = useRef(new Animated.Value(0)).current;
  const ppshTranslateY = useRef(new Animated.Value(-30)).current;
  const ppshProgressWidth = useRef(new Animated.Value(1)).current;
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

  const handleShotBlocked = useCallback(() => {
    setBlockedPlayerPickerVisible(true);
  }, []);

  const handleBlockedByPlayer = useCallback((playerId: string) => {
    addShot({
      isOurTeam: false,
      onGoal: false,
      result: 'blocked',
      blockedById: playerId,
    });
    setBlockedPlayerPickerVisible(false);
  }, [addShot]);

  const handleShotWide = useCallback(() => {
    setWidePlayerPickerVisible(true);
  }, []);

  const handleShotWideByPlayer = useCallback((playerId: string) => {
    addShot({
      playerId,
      isOurTeam: true,
      onGoal: false,
      result: 'miss',
    });
    setWidePlayerPickerVisible(false);
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
    ppshProgressWidth.setValue(1);
    Animated.parallel([
      Animated.timing(ppshOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(ppshTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    Animated.timing(ppshProgressWidth, { toValue: 0, duration: 5000, useNativeDriver: false }).start();
    ppshTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(ppshOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ppshTranslateY, { toValue: -30, duration: 300, useNativeDriver: true }),
      ]).start(() => setPpshSummary(null));
    }, 5000);
  }, [ppshOpacity, ppshTranslateY, ppshProgressWidth]);

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

  const handleUndo = useCallback(() => {
    const undone = undoLastAction();
    if (undone) {
      Alert.alert('Undone', `Reverted: ${undone.description}`);
    } else {
      Alert.alert('Nothing to Undo', 'No recent actions to undo');
    }
  }, [undoLastAction]);

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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.homeHeader}>
          <Text style={styles.homeTitle}>Hockey Tracker</Text>
        </View>

        <TouchableOpacity
          style={styles.bigStartButton}
          onPress={() => router.push('/match-setup')}
          activeOpacity={0.8}
        >
          <View style={styles.bigStartInner}>
            <Plus color="#fff" size={28} />
            <Text style={styles.bigStartText}>Start New Match</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.navGrid}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navCard, { backgroundColor: item.bgColor }]}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.7}
            >
              <View style={styles.navCardIcon}>{item.icon}</View>
              <Text style={[styles.navCardLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
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
    : `P${activeMatch.currentPeriod || 1}`;

  const getEndButtonText = () => {
    const cp = activeMatch.currentPeriod || 1;
    const isDraw = activeMatch.ourScore === activeMatch.opponentScore;
    if (cp >= 3 && !isDraw) return 'End Match';
    if (activeMatch.isOvertime) return `End ${periodLabel}`;
    return `End P${cp}`;
  };

  const totalFO = (activeMatch.faceoffs || []).length;
  const foWins = (activeMatch.faceoffs || []).filter(f => activeMatch.roster.some(r => r.playerId === f.winnerId)).length;
  const foPct = totalFO > 0 ? Math.round((foWins / totalFO) * 100) : 0;

  const hasMultipleGoalies = players.filter(
    (p) => activeMatch.roster.some((r) => r.playerId === p.id) && p.position === 'goalie'
  ).length > 1;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* FIXED TOP: Scoreboard + Game State */}
      <View style={[styles.fixedTop, { paddingTop: insets.top + 4 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleUndo} style={styles.topIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Undo2 color={(activeMatch?.undoStack?.length ?? 0) > 0 ? '#FF9500' : '#3a3a3c'} size={20} />
          </TouchableOpacity>
          <View style={styles.compactScore}>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamLabel}>US</Text>
              <Text style={styles.scoreBig}>{activeMatch.ourScore}</Text>
              <Text style={styles.scoreShotCount}>{activeMatch.ourShots}S</Text>
            </View>
            <View style={styles.scoreMid}>
              <Text style={styles.opponentName} numberOfLines={1}>{activeMatch.opponentName}</Text>
              <Text style={styles.periodBadgeText}>{periodLabel}</Text>
              {totalFO > 0 && <Text style={styles.foText}>FO {foPct}%</Text>}
            </View>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamLabel}>OPP</Text>
              <Text style={styles.scoreBig}>{activeMatch.opponentScore}</Text>
              <Text style={styles.scoreShotCount}>{activeMatch.opponentShots}S</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setMatchStatsVisible(true)} style={styles.topIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <TrendingUp color="#007AFF" size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.gameStateRow}>
          <TouchableOpacity
            style={[styles.gsChip, currentGameState === 'even' && styles.gsChipActiveEven]}
            onPress={() => handleGameStateChange('even')}
          >
            <Text style={[styles.gsChipText, currentGameState === 'even' && styles.gsChipTextActive]}>EV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gsChip, currentGameState === 'pp' && styles.gsChipActivePP]}
            onPress={() => handleGameStateChange('pp')}
          >
            <Zap size={13} color={currentGameState === 'pp' ? '#fff' : '#FF9500'} />
            <Text style={[styles.gsChipText, currentGameState === 'pp' && styles.gsChipTextActive]}>PP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gsChip, currentGameState === 'sh' && styles.gsChipActiveSH]}
            onPress={() => handleGameStateChange('sh')}
          >
            <ShieldOff size={13} color={currentGameState === 'sh' ? '#fff' : '#FF3B30'} />
            <Text style={[styles.gsChipText, currentGameState === 'sh' && styles.gsChipTextActive]}>SH</Text>
          </TouchableOpacity>

          <View style={styles.gsChipSpacer} />

          {activeGoalie && (
            <TouchableOpacity
              style={styles.goalieChip}
              onPress={hasMultipleGoalies ? handleSwapGoalie : undefined}
              activeOpacity={hasMultipleGoalies ? 0.7 : 1}
            >
              <Text style={styles.goalieChipText}>#{activeGoalie.jerseyNumber}</Text>
              {hasMultipleGoalies && <RefreshCw size={11} color="#34C759" />}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.endPeriodChip} onPress={handlePeriodAction}>
            <Text style={styles.endPeriodText}>{getEndButtonText()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE MIDDLE: Momentum, Lines, Roster */}
      <ScrollView
        style={styles.middleScroll}
        contentContainerStyle={styles.middleContent}
        showsVerticalScrollIndicator={false}
      >
        <MomentumIndicator match={activeMatch} />
        <LineShiftTracker />

        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setMoreExpanded(!moreExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            Roster ({rosterPlayers.filter(p => p.position !== 'goalie').length})
          </Text>
          {moreExpanded
            ? <ChevronUp size={16} color="#8e8e93" />
            : <ChevronDown size={16} color="#8e8e93" />
          }
        </TouchableOpacity>

        {moreExpanded && (
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
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* FIXED BOTTOM: Quick Actions */}
      <View style={[styles.fixedBottom, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.qBtn, styles.qGoal]} onPress={() => handleAddGoal('our')}>
            <Plus color="#fff" size={16} />
            <Text style={styles.qBtnText}>Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qGoalAgainst]} onPress={() => handleAddGoal('opponent')}>
            <AlertCircle color="#fff" size={16} />
            <Text style={styles.qBtnText}>GA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qShot]} onPress={() => handleAddShot('our')}>
            <Target color="#fff" size={16} />
            <Text style={styles.qBtnText}>Shot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qShotAgainst]} onPress={() => handleAddShot('opponent')}>
            <Target color="#fff" size={16} />
            <Text style={styles.qBtnText}>SA</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.qBtn, styles.qBlocked]} onPress={handleShotBlocked}>
            <ShieldBan color="#fff" size={16} />
            <Text style={styles.qBtnText}>Block</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qWide]} onPress={handleShotWide}>
            <CircleOff color="#fff" size={16} />
            <Text style={styles.qBtnText}>Wide</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qFoWin]} onPress={() => handleFaceoff('win')}>
            <Text style={styles.qBtnText}>FO Win</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, styles.qFoLoss]} onPress={() => handleFaceoff('loss')}>
            <Text style={styles.qBtnText}>FO Loss</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <Animated.View style={[styles.ppshProgressFill, ppshSummary.type === 'pp' ? styles.ppshProgressPP : styles.ppshProgressSH, { width: ppshProgressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
          </View>
        </Animated.View>
      )}

      <Modal visible={blockedPlayerPickerVisible} animationType="fade" transparent>
        <View style={styles.riskOverlay}>
          <View style={styles.riskModal}>
            <Text style={styles.riskModalTitle}>Who Blocked the Shot?</Text>
            <View style={styles.playerNumberGrid}>
              {rosterPlayers
                .filter((p) => p.position !== 'goalie')
                .map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerNumberBadge}
                    onPress={() => handleBlockedByPlayer(player.id)}
                  >
                    <Text style={styles.playerNumberText}>{player.jerseyNumber}</Text>
                  </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
              style={styles.riskCancel}
              onPress={() => setBlockedPlayerPickerVisible(false)}
            >
              <Text style={styles.riskCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={widePlayerPickerVisible} animationType="fade" transparent>
        <View style={styles.riskOverlay}>
          <View style={styles.riskModal}>
            <Text style={styles.riskModalTitle}>Who Shot Wide?</Text>
            <View style={styles.playerNumberGrid}>
              {rosterPlayers
                .filter((p) => p.position !== 'goalie')
                .map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerNumberBadge}
                    onPress={() => handleShotWideByPlayer(player.id)}
                  >
                    <Text style={styles.playerNumberText}>{player.jerseyNumber}</Text>
                  </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
              style={styles.riskCancel}
              onPress={() => setWidePlayerPickerVisible(false)}
            >
              <Text style={styles.riskCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

const CARD_GAP = 10;
const CARD_COLS = 4;
const CARD_MARGIN = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },

  // ===== HOME (no match) =====
  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.5,
  },
  bigStartButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bigStartInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    backgroundColor: '#34C759',
    borderRadius: 16,
  },
  bigStartText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700' as const,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  navCard: {
    width: (SCREEN_WIDTH - 32 - 24) / 3,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },

  // ===== MATCH: Fixed top =====
  fixedTop: {
    backgroundColor: '#0a0e1a',
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  topIconBtn: {
    padding: 6,
  },
  compactScore: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTeam: {
    alignItems: 'center',
    width: 60,
  },
  scoreTeamLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#636366',
    letterSpacing: 1,
  },
  scoreBig: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#fff',
    lineHeight: 40,
  },
  scoreShotCount: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '600' as const,
  },
  scoreMid: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 2,
  },
  opponentName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8e8e93',
    maxWidth: 120,
  },
  periodBadgeText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#5ac8fa',
  },
  foText: {
    fontSize: 10,
    color: '#5ac8fa',
    fontWeight: '600' as const,
  },

  gameStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1c1c1e',
  },
  gsChipActiveEven: {
    backgroundColor: '#3a3a3c',
  },
  gsChipActivePP: {
    backgroundColor: '#FF9500',
  },
  gsChipActiveSH: {
    backgroundColor: '#FF3B30',
  },
  gsChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#636366',
  },
  gsChipTextActive: {
    color: '#fff',
  },
  gsChipSpacer: {
    flex: 1,
  },
  goalieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(52,199,89,0.15)',
  },
  goalieChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  endPeriodChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  endPeriodText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FF3B30',
  },

  // ===== MATCH: Scrollable middle =====
  middleScroll: {
    flex: 1,
  },
  middleContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },

  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    marginBottom: 8,
  },
  expandToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },

  rosterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rosterCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    width: CARD_WIDTH,
  },
  rosterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rosterNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  rosterName: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#fff',
    marginBottom: 1,
    textAlign: 'center' as const,
  },
  rosterPosition: {
    fontSize: 9,
    color: '#8e8e93',
  },

  // ===== MATCH: Fixed bottom quick actions =====
  fixedBottom: {
    backgroundColor: '#0a0e1a',
    paddingHorizontal: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  qBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  qBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  qGoal: {
    backgroundColor: '#34C759',
  },
  qGoalAgainst: {
    backgroundColor: '#FF3B30',
  },
  qShot: {
    backgroundColor: '#007AFF',
  },
  qShotAgainst: {
    backgroundColor: '#FF9500',
  },
  qBlocked: {
    backgroundColor: '#5856D6',
  },
  qWide: {
    backgroundColor: '#636366',
  },
  qFoWin: {
    backgroundColor: '#2d6a4f',
  },
  qFoLoss: {
    backgroundColor: '#6c3d1a',
  },

  // ===== Modals =====
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
  playerNumberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  playerNumberBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },

  // ===== PP/SH Toast =====
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
