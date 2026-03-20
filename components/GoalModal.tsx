import { useHockey } from '@/contexts/hockey-context';
import { useMatchFeatures } from '@/contexts/match-features-context';
import { X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { ShotRisk } from '@/types/hockey';

interface GoalModalProps {
  visible: boolean;
  isOurTeam: boolean;
  onClose: () => void;
  onOpenShotModal?: (scorerId: string, goalShotId: string) => void;
}

export function GoalModal({ visible, isOurTeam, onClose, onOpenShotModal }: GoalModalProps) {
  const { players, activeMatch, addGoal } = useHockey();
  const { features } = useMatchFeatures();
  const [scorer, setScorer] = useState<string | null>(null);
  const [assists, setAssists] = useState<string[]>([]);
  const [plusPlayers, setPlusPlayers] = useState<string[]>([]);
  const [minusPlayers, setMinusPlayers] = useState<string[]>([]);
  const [autoSelectedPlus, setAutoSelectedPlus] = useState<string[]>([]);
  const [shotRisk, setShotRisk] = useState<ShotRisk>('medium');
  const [isEmptyNet, setIsEmptyNet] = useState(false);

  const rosterPlayers = activeMatch
    ? players.filter((p) =>
        activeMatch.roster.some((r) => r.playerId === p.id && p.position !== 'goalie')
      )
    : [];

  useEffect(() => {
    if (!visible) {
      setScorer(null);
      setAssists([]);
      setPlusPlayers([]);
      setMinusPlayers([]);
      setAutoSelectedPlus([]);
      setShotRisk('medium');
      setIsEmptyNet(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (isOurTeam && !scorer) {
      Alert.alert('Missing Information', 'Please select the goal scorer');
      return;
    }

    if (!isOurTeam && minusPlayers.length === 0) {
      Alert.alert('Missing Information', 'Please select the players who get minus (-)');
      return;
    }

    const goalData = {
      scorerId: scorer || '',
      assists: assists,
      plusPlayers: isOurTeam ? plusPlayers : [],
      minusPlayers: !isOurTeam ? minusPlayers : [],
      isOurTeam,
      shotRisk,
      isEmptyNet: !isOurTeam ? isEmptyNet : undefined,
    };

    const goalShotId = addGoal(goalData);
    resetAndClose();

    if (isOurTeam && onOpenShotModal && scorer && goalShotId) {
      onOpenShotModal(scorer, goalShotId);
    }
  };

  const resetAndClose = () => {
    setScorer(null);
    setAssists([]);
    setPlusPlayers([]);
    setMinusPlayers([]);
    setAutoSelectedPlus([]);
    setShotRisk('medium');
    setIsEmptyNet(false);
    onClose();
  };

  const toggleAssist = (playerId: string) => {
    const wasIncluded = assists.includes(playerId);
    let newAssists: string[];

    if (wasIncluded) {
      newAssists = assists.filter((id) => id !== playerId);
      setPlusPlayers(plusPlayers.filter((id) => id !== playerId));
      setAutoSelectedPlus(autoSelectedPlus.filter((id) => id !== playerId));
    } else if (assists.length < 2) {
      newAssists = [...assists, playerId];
      if (!plusPlayers.includes(playerId)) {
        setPlusPlayers([...plusPlayers, playerId]);
        setAutoSelectedPlus([...autoSelectedPlus, playerId]);
      }
    } else {
      newAssists = assists;
    }

    setAssists(newAssists);
  };

  const togglePlusPlayer = (playerId: string) => {
    if (autoSelectedPlus.includes(playerId)) return;

    if (plusPlayers.includes(playerId)) {
      setPlusPlayers(plusPlayers.filter((id) => id !== playerId));
    } else if (plusPlayers.length < 6) {
      setPlusPlayers([...plusPlayers, playerId]);
    }
  };

  const toggleMinusPlayer = (playerId: string) => {
    if (minusPlayers.includes(playerId)) {
      setMinusPlayers(minusPlayers.filter((id) => id !== playerId));
    } else {
      setMinusPlayers([...minusPlayers, playerId]);
    }
  };

  const riskColors: Record<ShotRisk, string> = {
    low: '#8e8e93',
    medium: '#FF9500',
    high: '#FF3B30',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isOurTeam ? 'Goal Scored!' : 'Goal Conceded'}
          </Text>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {features.shotRisk && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shot Danger</Text>
              <View style={styles.riskRow}>
                {(['low', 'medium', 'high'] as ShotRisk[]).map((risk) => (
                  <TouchableOpacity
                    key={risk}
                    style={[
                      styles.riskBadge,
                      shotRisk === risk && { backgroundColor: riskColors[risk], borderColor: riskColors[risk] },
                    ]}
                    onPress={() => setShotRisk(risk)}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        shotRisk === risk && styles.riskBadgeTextSelected,
                      ]}
                    >
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isOurTeam && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Scorer</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerBadge,
                        scorer === player.id && styles.playerBadgeSelected,
                      ]}
                      onPress={() => {
                        const prevScorer = scorer;
                        setScorer(player.id);

                        if (prevScorer && autoSelectedPlus.includes(prevScorer)) {
                          setPlusPlayers(plusPlayers.filter((id) => id !== prevScorer));
                          setAutoSelectedPlus(autoSelectedPlus.filter((id) => id !== prevScorer));
                        }

                        if (!plusPlayers.includes(player.id)) {
                          setPlusPlayers([...plusPlayers.filter((id) => id !== prevScorer), player.id]);
                          setAutoSelectedPlus([...autoSelectedPlus.filter((id) => id !== prevScorer), player.id]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.playerBadgeNumber,
                          scorer === player.id && styles.playerBadgeNumberSelected,
                        ]}
                      >
                        {player.jerseyNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assists (0-2)</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers
                    .filter((p) => p.id !== scorer)
                    .map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerBadge,
                          assists.includes(player.id) && styles.playerBadgeSelected,
                        ]}
                        onPress={() => toggleAssist(player.id)}
                      >
                        <Text
                          style={[
                            styles.playerBadgeNumber,
                            assists.includes(player.id) && styles.playerBadgeNumberSelected,
                          ]}
                        >
                          {player.jerseyNumber}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>+ Players on Ice (Up to 6)</Text>
                <Text style={styles.sectionHint}>Scorer and assisters are automatically selected.</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => {
                    const isAutoSelected = autoSelectedPlus.includes(player.id);
                    const canSelect = plusPlayers.length < 6 || plusPlayers.includes(player.id);

                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerBadge,
                          plusPlayers.includes(player.id) && styles.playerBadgeSelectedGreen,
                          isAutoSelected && styles.playerBadgeAuto,
                          !canSelect && styles.playerBadgeDisabled,
                        ]}
                        onPress={() => togglePlusPlayer(player.id)}
                        disabled={isAutoSelected || !canSelect}
                      >
                        <Text
                          style={[
                            styles.playerBadgeNumber,
                            plusPlayers.includes(player.id) && styles.playerBadgeNumberSelected,
                          ]}
                        >
                          {player.jerseyNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {!isOurTeam && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Empty Net?</Text>
                <TouchableOpacity
                  style={[styles.emptyNetToggle, isEmptyNet && styles.emptyNetToggleActive]}
                  onPress={() => setIsEmptyNet(!isEmptyNet)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.emptyNetDot, isEmptyNet && styles.emptyNetDotActive]} />
                  <Text style={[styles.emptyNetLabel, isEmptyNet && styles.emptyNetLabelActive]}>
                    {isEmptyNet ? 'Empty Net — won\'t count for goalie stats' : 'Goalie was in net'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>- Players on Ice</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerBadge,
                        minusPlayers.includes(player.id) && styles.playerBadgeSelectedRed,
                      ]}
                      onPress={() => toggleMinusPlayer(player.id)}
                    >
                      <Text
                        style={[
                          styles.playerBadgeNumber,
                          minusPlayers.includes(player.id) && styles.playerBadgeNumberSelected,
                        ]}
                      >
                        {player.jerseyNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Goal</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 8,
    fontStyle: 'italic' as const,
  },
  riskRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riskBadge: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  riskBadgeText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  riskBadgeTextSelected: {
    color: '#fff',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  playerBadgeSelectedGreen: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  playerBadgeSelectedRed: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  playerBadgeAuto: {
    opacity: 0.8,
  },
  playerBadgeDisabled: {
    opacity: 0.3,
  },
  playerBadgeNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  playerBadgeNumberSelected: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyNetToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
  },
  emptyNetToggleActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9500',
  },
  emptyNetDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c7c7cc',
    backgroundColor: '#fff',
  },
  emptyNetDotActive: {
    borderColor: '#FF9500',
    backgroundColor: '#FF9500',
  },
  emptyNetLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#8e8e93',
    flex: 1,
  },
  emptyNetLabelActive: {
    color: '#1c1c1e',
    fontWeight: '600' as const,
  },
});
