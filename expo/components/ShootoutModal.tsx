import { useHockey } from '@/contexts/hockey-context';
import { X, Check, Minus, ArrowLeftRight } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { ShootoutAttempt, ShootoutData } from '@/types/hockey';

interface ShootoutModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'setup' | 'play' | 'reverse_prompt';

export function ShootoutModal({ visible, onClose, onComplete }: ShootoutModalProps) {
  const { players, activeMatch, updateShootout } = useHockey();
  const [phase, setPhase] = useState<Phase>('setup');
  const [totalRounds, setTotalRounds] = useState(3);
  const [startingTeam, setStartingTeam] = useState<'us' | 'them'>('us');
  const [currentStartingTeam, setCurrentStartingTeam] = useState<'us' | 'them'>('us');
  const [attempts, setAttempts] = useState<ShootoutAttempt[]>([]);
  const [ourScore, setOurScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [selectingPlayer, setSelectingPlayer] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentTeamIsUs, setCurrentTeamIsUs] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [hasAskedReverse, setHasAskedReverse] = useState(false);

  const rosterPlayers = useMemo(() => {
    if (!activeMatch) return [];
    return players.filter(
      (p) =>
        activeMatch.roster.some((r) => r.playerId === p.id) &&
        p.position !== 'goalie'
    );
  }, [activeMatch, players]);

  const resetState = () => {
    setPhase('setup');
    setTotalRounds(3);
    setStartingTeam('us');
    setCurrentStartingTeam('us');
    setAttempts([]);
    setOurScore(0);
    setOppScore(0);
    setSelectingPlayer(false);
    setCurrentRound(1);
    setCurrentTeamIsUs(true);
    setIsFinished(false);
    setHasAskedReverse(false);
  };

  const handleStart = () => {
    setPhase('play');
    setCurrentStartingTeam(startingTeam);
    setCurrentTeamIsUs(startingTeam === 'us');
    setCurrentRound(1);
  };

  const checkIfDecided = (newOurScore: number, newOppScore: number, newAttempts: ShootoutAttempt[], round: number): boolean => {
    const usAttemptsInRound = newAttempts.filter((a) => a.isOurTeam && a.round === round).length;
    const themAttemptsInRound = newAttempts.filter((a) => !a.isOurTeam && a.round === round).length;

    if (round <= totalRounds) {
      const usRoundsLeft = totalRounds - (usAttemptsInRound > 0 ? round : round - 1);
      const themRoundsLeft = totalRounds - (themAttemptsInRound > 0 ? round : round - 1);

      if (newOurScore > newOppScore + themRoundsLeft) return true;
      if (newOppScore > newOurScore + usRoundsLeft) return true;
    }

    if (round > totalRounds && usAttemptsInRound > 0 && themAttemptsInRound > 0) {
      if (newOurScore !== newOppScore) return true;
    }

    return false;
  };

  const advanceToNext = (newAttempts: ShootoutAttempt[], newOurScore: number, newOppScore: number) => {
    const decided = checkIfDecided(newOurScore, newOppScore, newAttempts, currentRound);
    if (decided) {
      setIsFinished(true);
      return;
    }

    if (currentTeamIsUs) {
      setCurrentTeamIsUs(false);
    } else {
      const bothDone = newAttempts.filter((a) => a.round === currentRound).length >= 2;
      if (bothDone) {
        if (currentRound >= totalRounds && newOurScore === newOppScore) {
          if (!hasAskedReverse) {
            setHasAskedReverse(true);
            setPhase('reverse_prompt');
          } else {
            const nextRound = currentRound + 1;
            setCurrentRound(nextRound);
            setCurrentTeamIsUs(currentStartingTeam === 'us');
          }
        } else if (currentRound < totalRounds) {
          setCurrentRound(currentRound + 1);
          setCurrentTeamIsUs(currentStartingTeam === 'us');
        } else {
          setIsFinished(true);
        }
      } else {
        setCurrentTeamIsUs(true);
      }
    }
  };

  const handleReverseChoice = (reverse: boolean) => {
    const newStarting = reverse
      ? (currentStartingTeam === 'us' ? 'them' : 'us') as 'us' | 'them'
      : currentStartingTeam;
    setCurrentStartingTeam(newStarting);
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    setCurrentTeamIsUs(newStarting === 'us');
    setPhase('play');
  };

  const handleOurAttempt = (playerId: string, result: 'goal' | 'no_goal') => {
    const newAttempt: ShootoutAttempt = {
      playerId,
      result,
      isOurTeam: true,
      round: currentRound,
    };
    const newAttempts = [...attempts, newAttempt];
    const newScore = result === 'goal' ? ourScore + 1 : ourScore;
    setAttempts(newAttempts);
    setOurScore(newScore);
    setSelectingPlayer(false);
    advanceToNext(newAttempts, newScore, oppScore);
  };

  const handleOppAttempt = (result: 'goal' | 'no_goal') => {
    const newAttempt: ShootoutAttempt = {
      result,
      isOurTeam: false,
      round: currentRound,
    };
    const newAttempts = [...attempts, newAttempt];
    const newScore = result === 'goal' ? oppScore + 1 : oppScore;
    setAttempts(newAttempts);
    setOppScore(newScore);
    advanceToNext(newAttempts, ourScore, newScore);
  };

  const handleFinish = () => {
    const shootoutData: ShootoutData = {
      attempts,
      totalRounds,
      startingTeam,
      ourScore,
      opponentScore: oppScore,
      completed: true,
    };
    updateShootout(shootoutData);
    resetState();
    onComplete();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shootout</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
        </View>

        {phase === 'setup' && (
          <View style={styles.setupContent}>
            <Text style={styles.setupLabel}>Number of Rounds</Text>
            <View style={styles.roundPicker}>
              {[3, 5].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roundOption, totalRounds === r && styles.roundOptionActive]}
                  onPress={() => setTotalRounds(r)}
                >
                  <Text style={[styles.roundOptionText, totalRounds === r && styles.roundOptionTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.setupLabel}>Starting Team</Text>
            <View style={styles.roundPicker}>
              <TouchableOpacity
                style={[styles.teamOption, startingTeam === 'us' && styles.teamOptionActive]}
                onPress={() => setStartingTeam('us')}
              >
                <Text style={[styles.teamOptionText, startingTeam === 'us' && styles.teamOptionTextActive]}>
                  Us
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamOption, startingTeam === 'them' && styles.teamOptionActiveOpp]}
                onPress={() => setStartingTeam('them')}
              >
                <Text style={[styles.teamOptionText, startingTeam === 'them' && styles.teamOptionTextActive]}>
                  Them
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Start Shootout</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'reverse_prompt' && (
          <View style={styles.reverseContent}>
            <View style={styles.reverseCard}>
              <View style={styles.reverseIconCircle}>
                <ArrowLeftRight color="#007AFF" size={32} />
              </View>
              <Text style={styles.reverseTitle}>Reverse Shooting Order?</Text>
              <Text style={styles.reverseSubtitle}>
                After {totalRounds} rounds it's {ourScore} - {oppScore}. Sudden death begins.
              </Text>
              <Text style={styles.reverseCurrentOrder}>
                Current order: {currentStartingTeam === 'us' ? 'Us first' : 'Them first'}
              </Text>
              <TouchableOpacity
                style={styles.reverseYesBtn}
                onPress={() => handleReverseChoice(true)}
              >
                <ArrowLeftRight color="#fff" size={18} />
                <Text style={styles.reverseBtnText}>Yes, Reverse Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reverseNoBtn}
                onPress={() => handleReverseChoice(false)}
              >
                <Text style={styles.reverseNoBtnText}>Keep Same Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {phase === 'play' && (
          <ScrollView style={styles.playContent} contentContainerStyle={styles.playScrollContent}>
            <View style={styles.shootoutScore}>
              <View style={styles.shootoutTeam}>
                <Text style={styles.shootoutTeamLabel}>Us</Text>
                <Text style={styles.shootoutScoreNum}>{ourScore}</Text>
              </View>
              <View style={styles.shootoutDivider} />
              <View style={styles.shootoutTeam}>
                <Text style={styles.shootoutTeamLabel}>Them</Text>
                <Text style={styles.shootoutScoreNum}>{oppScore}</Text>
              </View>
            </View>

            <Text style={styles.roundLabel}>Round {currentRound}{currentRound > totalRounds ? ' (Sudden Death)' : ''}</Text>

            {attempts.length > 0 && (
              <View style={styles.attemptsLog}>
                {Array.from({ length: Math.max(currentRound, totalRounds) }, (_, i) => i + 1).map((round) => {
                  const usAttempt = attempts.find((a) => a.isOurTeam && a.round === round);
                  const themAttempt = attempts.find((a) => !a.isOurTeam && a.round === round);
                  if (!usAttempt && !themAttempt) return null;

                  const usPlayer = usAttempt?.playerId
                    ? players.find((p) => p.id === usAttempt.playerId)
                    : null;

                  return (
                    <View key={round} style={[styles.attemptRow, round === currentRound && styles.attemptRowCurrent]}>
                      <Text style={styles.attemptRound}>R{round}</Text>
                      <View style={styles.attemptResult}>
                        {usAttempt ? (
                          <View style={styles.attemptTeamResult}>
                            <Text style={styles.attemptPlayerName}>
                              {usPlayer ? `#${usPlayer.jerseyNumber}` : 'Us'}
                            </Text>
                            {usAttempt.result === 'goal' ? (
                              <Check color="#34C759" size={18} />
                            ) : (
                              <Minus color="#FF3B30" size={18} />
                            )}
                          </View>
                        ) : (
                          <Text style={styles.attemptPending}>-</Text>
                        )}
                      </View>
                      <View style={styles.attemptResult}>
                        {themAttempt ? (
                          <View style={styles.attemptTeamResult}>
                            <Text style={styles.attemptPlayerName}>Opp</Text>
                            {themAttempt.result === 'goal' ? (
                              <Check color="#34C759" size={18} />
                            ) : (
                              <Minus color="#FF3B30" size={18} />
                            )}
                          </View>
                        ) : (
                          <Text style={styles.attemptPending}>-</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {!isFinished && currentTeamIsUs && !selectingPlayer && (
              <View style={styles.actionSection}>
                <Text style={styles.actionTitle}>Our Turn</Text>
                <TouchableOpacity
                  style={styles.selectPlayerButton}
                  onPress={() => setSelectingPlayer(true)}
                >
                  <Text style={styles.selectPlayerText}>Select Shooter</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isFinished && currentTeamIsUs && selectingPlayer && (
              <View style={styles.actionSection}>
                <Text style={styles.actionTitle}>Select Shooter</Text>
                {rosterPlayers.map((player) => (
                  <View key={player.id} style={styles.shooterRow}>
                    <View style={styles.shooterInfo}>
                      <View style={styles.shooterBadge}>
                        <Text style={styles.shooterBadgeNum}>{player.jerseyNumber}</Text>
                      </View>
                      <Text style={styles.shooterName}>{player.name}</Text>
                    </View>
                    <View style={styles.resultButtons}>
                      <TouchableOpacity
                        style={styles.goalButton}
                        onPress={() => handleOurAttempt(player.id, 'goal')}
                      >
                        <Text style={styles.goalButtonText}>Goal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.noGoalButton}
                        onPress={() => handleOurAttempt(player.id, 'no_goal')}
                      >
                        <Text style={styles.noGoalButtonText}>No Goal</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!isFinished && !currentTeamIsUs && (
              <View style={styles.actionSection}>
                <Text style={styles.actionTitle}>Opponent's Turn</Text>
                <View style={styles.oppButtons}>
                  <TouchableOpacity
                    style={styles.oppGoalBtn}
                    onPress={() => handleOppAttempt('goal')}
                  >
                    <Check color="#fff" size={24} />
                    <Text style={styles.oppGoalText}>Goal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.oppNoGoalBtn}
                    onPress={() => handleOppAttempt('no_goal')}
                  >
                    <Minus color="#fff" size={24} />
                    <Text style={styles.oppNoGoalText}>No Goal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isFinished && (
              <View style={styles.finishedSection}>
                <Text style={styles.finishedTitle}>
                  {ourScore > oppScore ? 'We Win!' : 'They Win'}
                </Text>
                <Text style={styles.finishedScore}>
                  Shootout: {ourScore} - {oppScore}
                </Text>
                <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                  <Text style={styles.finishButtonText}>End Match</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
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
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  closeButton: {
    padding: 4,
  },
  setupContent: {
    padding: 24,
  },
  setupLabel: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 12,
    marginTop: 16,
  },
  roundPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  roundOption: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  roundOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roundOptionText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  roundOptionTextActive: {
    color: '#fff',
  },
  teamOption: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  teamOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  teamOptionActiveOpp: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  teamOptionText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  teamOptionTextActive: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  reverseContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  reverseCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  reverseIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reverseTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  reverseSubtitle: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center' as const,
    marginBottom: 8,
    lineHeight: 20,
  },
  reverseCurrentOrder: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3a3a3c',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  reverseYesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    marginBottom: 10,
  },
  reverseBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  reverseNoBtn: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },
  reverseNoBtnText: {
    color: '#3a3a3c',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  playContent: {
    flex: 1,
  },
  playScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  shootoutScore: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  shootoutTeam: {
    flex: 1,
    alignItems: 'center',
  },
  shootoutTeamLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 4,
  },
  shootoutScoreNum: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#fff',
  },
  shootoutDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#3a3a3c',
    marginHorizontal: 16,
  },
  roundLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  attemptsLog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  attemptRowCurrent: {
    backgroundColor: '#f0f6ff',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  attemptRound: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
    width: 40,
  },
  attemptResult: {
    flex: 1,
    alignItems: 'center',
  },
  attemptTeamResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attemptPlayerName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1c1c1e',
  },
  attemptPending: {
    fontSize: 14,
    color: '#8e8e93',
  },
  actionSection: {
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  selectPlayerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectPlayerText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  shooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  shooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shooterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shooterBadgeNum: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  shooterName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1c1c1e',
    flex: 1,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  goalButton: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  goalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noGoalButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  noGoalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  oppButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  oppGoalBtn: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  oppGoalText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  oppNoGoalBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  oppNoGoalText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  finishedSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  finishedScore: {
    fontSize: 18,
    color: '#8e8e93',
    marginBottom: 24,
  },
  finishButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
});
