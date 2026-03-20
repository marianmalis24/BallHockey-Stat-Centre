import { useHockey } from '@/contexts/hockey-context';
import { GoalModal } from '@/components/GoalModal';
import { ShotModal } from '@/components/ShotModal';
import { PlayerActionModal } from '@/components/PlayerActionModal';
import { PeriodSummaryModal } from '@/components/PeriodSummaryModal';
import { MatchStatsModal } from '@/components/MatchStatsModal';
import { FaceoffModal } from '@/components/FaceoffModal';
import { ShootoutModal } from '@/components/ShootoutModal';
import { Stack, router } from 'expo-router';
import { Plus, Target, Users, BarChart3, AlertCircle, RefreshCw, TrendingUp, Shield, History, Zap, ShieldOff, Undo2, Activity, ShieldBan, CircleOff, GitCompare, PieChart, ChevronDown, ChevronUp, Settings, Trophy, ChevronRight, Clock } from 'lucide-react-native';
import { MomentumIndicator } from '@/components/MomentumIndicator';
import { LineShiftTracker } from '@/components/LineShiftTracker';
import { useMatchFeatures } from '@/contexts/match-features-context';
import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Players', icon: <Users color="#5ac8fa" size={20} />, route: '/players', color: '#5ac8fa', bgColor: 'rgba(90,200,250,0.10)', description: 'Manage roster' },
  { label: 'Statistics', icon: <BarChart3 color="#4cd964" size={20} />, route: '/stats', color: '#4cd964', bgColor: 'rgba(76,217,100,0.10)', description: 'Player stats' },
  { label: 'Opponents', icon: <Shield color="#ffcc00" size={20} />, route: '/opponents', color: '#ffcc00', bgColor: 'rgba(255,204,0,0.10)', description: 'Track rivals' },
  { label: 'History', icon: <History color="#bf5af2" size={20} />, route: '/match-history', color: '#bf5af2', bgColor: 'rgba(191,90,242,0.10)', description: 'Past games' },
  { label: 'Season', icon: <Activity color="#ff375f" size={20} />, route: '/season-dashboard', color: '#ff375f', bgColor: 'rgba(255,55,95,0.10)', description: 'Season overview' },
  { label: 'Compare', icon: <GitCompare color="#64d2ff" size={20} />, route: '/player-compare', color: '#64d2ff', bgColor: 'rgba(100,210,255,0.10)', description: 'Head to head' },
  { label: 'PP/PK', icon: <PieChart color="#ff6961" size={20} />, route: '/pp-pk-dashboard', color: '#ff6961', bgColor: 'rgba(255,105,97,0.10)', description: 'Special teams' },
  { label: 'Settings', icon: <Settings color="#98989d" size={20} />, route: '/match-features', color: '#98989d', bgColor: 'rgba(152,152,157,0.10)', description: 'Configure' },
];

export default function GameScreen() {
  const {
    activeMatch,
    players,
    matches,
    endMatch,
    updateActiveMatch,
    addShot,
    nextPeriod,
    setGameState,
    getPPSHSummary,
    undoLastAction,
  } = useHockey();

  const { features } = useMatchFeatures();

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
      if (features.shotRisk) {
        setOppShotRiskVisible(true);
      } else {
        addShot({
          isOurTeam: false,
          onGoal: true,
          result: 'save',
        });
      }
    } else {
      setShotType(type);
      setShotModalVisible(true);
    }
  }, [features.shotRisk, addShot]);

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

  const completedMatches = useMemo(() => matches.filter(m => !m.isActive), [matches]);
  const lastMatch = useMemo(() => {
    const sorted = [...completedMatches].sort((a, b) => b.date - a.date);
    return sorted[0] ?? null;
  }, [completedMatches]);

  const seasonRecord = useMemo(() => {
    let w = 0, l = 0, d = 0;
    completedMatches.forEach(m => {
      if (m.ourScore > m.opponentScore) w++;
      else if (m.ourScore < m.opponentScore) l++;
      else d++;
    });
    return { w, l, d };
  }, [completedMatches]);

  if (!activeMatch) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          style={styles.homeScroll}
          contentContainerStyle={styles.homeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.homeHeader}>
            <View style={styles.homeBrand}>
              <View style={styles.homeLogo}>
                <Target color="#0af" size={22} />
              </View>
              <View>
                <Text style={styles.homeTitle}>Hockey Tracker</Text>
                <Text style={styles.homeSubtitle}>
                  {completedMatches.length > 0
                    ? `${completedMatches.length} game${completedMatches.length !== 1 ? 's' : ''} tracked`
                    : 'Ready to track'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bigStartButton}
            onPress={() => router.push('/match-setup')}
            activeOpacity={0.85}
            testID="start-match-btn"
          >
            <View style={styles.bigStartInner}>
              <View style={styles.bigStartIconWrap}>
                <Plus color="#fff" size={22} />
              </View>
              <View style={styles.bigStartTextWrap}>
                <Text style={styles.bigStartText}>Start New Match</Text>
                <Text style={styles.bigStartHint}>Set up roster & opponent</Text>
              </View>
              <ChevronRight color="rgba(255,255,255,0.5)" size={20} />
            </View>
          </TouchableOpacity>

          {completedMatches.length > 0 && (
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatCard}>
                <Trophy color="#4cd964" size={16} />
                <Text style={styles.quickStatValue}>{seasonRecord.w}</Text>
                <Text style={styles.quickStatLabel}>Wins</Text>
              </View>
              <View style={styles.quickStatCard}>
                <ShieldOff color="#ff375f" size={16} />
                <Text style={styles.quickStatValue}>{seasonRecord.l}</Text>
                <Text style={styles.quickStatLabel}>Losses</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Activity color="#ffcc00" size={16} />
                <Text style={styles.quickStatValue}>{seasonRecord.d}</Text>
                <Text style={styles.quickStatLabel}>Draws</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Users color="#5ac8fa" size={16} />
                <Text style={styles.quickStatValue}>{players.length}</Text>
                <Text style={styles.quickStatLabel}>Players</Text>
              </View>
            </View>
          )}

          {lastMatch && (
            <TouchableOpacity
              style={styles.lastMatchCard}
              onPress={() => router.push({ pathname: '/match-detail', params: { matchId: lastMatch.id } } as never)}
              activeOpacity={0.7}
            >
              <View style={styles.lastMatchHeader}>
                <Clock color="#636366" size={13} />
                <Text style={styles.lastMatchLabel}>Last Match</Text>
              </View>
              <View style={styles.lastMatchBody}>
                <View style={styles.lastMatchScoreWrap}>
                  <Text style={[
                    styles.lastMatchScore,
                    lastMatch.ourScore > lastMatch.opponentScore
                      ? styles.lastMatchWin
                      : lastMatch.ourScore < lastMatch.opponentScore
                        ? styles.lastMatchLoss
                        : styles.lastMatchDraw,
                  ]}>
                    {lastMatch.ourScore} - {lastMatch.opponentScore}
                  </Text>
                  <Text style={styles.lastMatchResult}>
                    {lastMatch.ourScore > lastMatch.opponentScore ? 'W' : lastMatch.ourScore < lastMatch.opponentScore ? 'L' : 'D'}
                  </Text>
                </View>
                <Text style={styles.lastMatchOpponent} numberOfLines={1}>vs {lastMatch.opponentName}</Text>
              </View>
              <ChevronRight color="#3a3a3c" size={18} />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.navGrid}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.navCard}
                onPress={() => router.push(item.route as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.navCardIcon, { backgroundColor: item.bgColor }]}>
                  {item.icon}
                </View>
                <View style={styles.navCardText}>
                  <Text style={styles.navCardLabel}>{item.label}</Text>
                  <Text style={styles.navCardDesc}>{item.description}</Text>
                </View>
                <ChevronRight color="#2c2c2e" size={16} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Math.max(insets.bottom, 20) }} />
        </ScrollView>
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
              {features.faceoffs && totalFO > 0 && <Text style={styles.foText}>FO {foPct}%</Text>}
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
          {features.ppMode && (
            <>
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
            </>
          )}

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
        {features.momentum && <MomentumIndicator match={activeMatch} />}
        {features.shiftTracking && <LineShiftTracker />}

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
        {(features.blockedShots || features.wideShots || features.faceoffs) && (
          <View style={styles.quickRowSecondary}>
            {features.faceoffs && (
              <TouchableOpacity style={[styles.qBtnSec, styles.qFoLoss]} onPress={() => handleFaceoff('loss')}>
                <Text style={styles.qBtnSecText}>FO Loss</Text>
              </TouchableOpacity>
            )}
            {features.blockedShots && (
              <TouchableOpacity style={[styles.qBtnSec, styles.qBlocked]} onPress={handleShotBlocked}>
                <ShieldBan color="#fff" size={14} />
                <Text style={styles.qBtnSecText}>Block</Text>
              </TouchableOpacity>
            )}
            {features.wideShots && (
              <TouchableOpacity style={[styles.qBtnSec, styles.qWide]} onPress={handleShotWide}>
                <CircleOff color="#fff" size={14} />
                <Text style={styles.qBtnSecText}>Wide</Text>
              </TouchableOpacity>
            )}
            {features.faceoffs && (
              <TouchableOpacity style={[styles.qBtnSec, styles.qFoWin]} onPress={() => handleFaceoff('win')}>
                <Text style={styles.qBtnSecText}>FO Win</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.quickRowMain}>
          <TouchableOpacity style={[styles.qBtnMain, styles.qGoalAgainst]} onPress={() => handleAddGoal('opponent')}>
            <AlertCircle color="#fff" size={20} />
            <Text style={styles.qBtnMainText}>Goal Against</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtnMain, styles.qShotAgainst]} onPress={() => handleAddShot('opponent')}>
            <Target color="#fff" size={20} />
            <Text style={styles.qBtnMainText}>Shot Against</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtnMain, styles.qShot]} onPress={() => handleAddShot('our')}>
            <Target color="#fff" size={20} />
            <Text style={styles.qBtnMainText}>Our Shot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtnMain, styles.qGoal]} onPress={() => handleAddGoal('our')}>
            <Plus color="#fff" size={20} />
            <Text style={styles.qBtnMainText}>Our Goal</Text>
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

  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingBottom: 8,
  },
  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  homeBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,170,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#e8eaed',
    letterSpacing: -0.3,
  },
  homeSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#636366',
    marginTop: 1,
  },
  bigStartButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#14532d',
    borderWidth: 1,
    borderColor: 'rgba(76,217,100,0.25)',
    overflow: 'hidden',
  },
  bigStartInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  bigStartIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#4cd964',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigStartTextWrap: {
    flex: 1,
  },
  bigStartText: {
    color: '#e8eaed',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  bigStartHint: {
    color: '#4cd964',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#12162a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#1a1e32',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#e8eaed',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#636366',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  lastMatchCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: '#12162a',
    borderWidth: 1,
    borderColor: '#1a1e32',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMatchHeader: {
    position: 'absolute',
    top: -8,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0a0e1a',
    paddingHorizontal: 6,
  },
  lastMatchLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#636366',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  lastMatchBody: {
    flex: 1,
    marginTop: 4,
  },
  lastMatchScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMatchScore: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  lastMatchWin: {
    color: '#4cd964',
  },
  lastMatchLoss: {
    color: '#ff375f',
  },
  lastMatchDraw: {
    color: '#ffcc00',
  },
  lastMatchResult: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#636366',
    backgroundColor: '#1a1e32',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  lastMatchOpponent: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8e8e93',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#4a4a4e',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  navGrid: {
    paddingHorizontal: 16,
    gap: 2,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  navCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardText: {
    flex: 1,
  },
  navCardLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#e8eaed',
  },
  navCardDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#636366',
    marginTop: 1,
  },

  fixedTop: {
    backgroundColor: '#0a0e1a',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1e32',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  topIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  compactScore: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTeam: {
    alignItems: 'center',
    width: 64,
  },
  scoreTeamLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#4a4a4e',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  scoreBig: {
    fontSize: 38,
    fontWeight: '800' as const,
    color: '#e8eaed',
    lineHeight: 42,
  },
  scoreShotCount: {
    fontSize: 11,
    color: '#636366',
    fontWeight: '600' as const,
  },
  scoreMid: {
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 3,
  },
  opponentName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#636366',
    maxWidth: 120,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  periodBadgeText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#0af',
  },
  foText: {
    fontSize: 10,
    color: '#0af',
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
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#12162a',
    borderWidth: 1,
    borderColor: '#1a1e32',
  },
  gsChipActiveEven: {
    backgroundColor: '#2c2c3a',
    borderColor: '#3a3a4a',
  },
  gsChipActivePP: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  gsChipActiveSH: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  gsChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#4a4a4e',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(76,217,100,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76,217,100,0.2)',
  },
  goalieChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#4cd964',
  },
  endPeriodChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,55,95,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,55,95,0.2)',
  },
  endPeriodText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#ff375f',
  },

  middleScroll: {
    flex: 1,
  },
  middleContent: {
    paddingTop: 10,
    paddingBottom: 8,
  },

  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#12162a',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1e32',
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
    backgroundColor: '#12162a',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: CARD_WIDTH,
    borderWidth: 1,
    borderColor: '#1a1e32',
  },
  rosterBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  rosterNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  rosterName: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#e8eaed',
    marginBottom: 1,
    textAlign: 'center' as const,
  },
  rosterPosition: {
    fontSize: 9,
    color: '#636366',
  },

  fixedBottom: {
    backgroundColor: '#0a0e1a',
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1e32',
  },
  quickRowMain: {
    flexDirection: 'row',
    gap: 7,
  },
  quickRowSecondary: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 7,
  },
  qBtnMain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
    borderRadius: 12,
  },
  qBtnMainText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
  qBtnSec: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 13,
    borderRadius: 10,
  },
  qBtnSecText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  qGoal: {
    backgroundColor: '#248a3d',
  },
  qGoalAgainst: {
    backgroundColor: '#d70015',
  },
  qShot: {
    backgroundColor: '#0a84ff',
  },
  qShotAgainst: {
    backgroundColor: '#ff9f0a',
  },
  qBlocked: {
    backgroundColor: '#5856D6',
  },
  qWide: {
    backgroundColor: '#48484a',
  },
  qFoWin: {
    backgroundColor: '#1b4332',
  },
  qFoLoss: {
    backgroundColor: '#5c2d0e',
  },

  riskOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  riskModal: {
    backgroundColor: '#1c1c2e',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  riskModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#e8eaed',
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
    borderRadius: 14,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },

  ppshToast: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  ppshToastInner: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ppshToastPP: {
    backgroundColor: '#12162a',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.35)',
  },
  ppshToastSH: {
    backgroundColor: '#12162a',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.35)',
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
