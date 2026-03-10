import { useHockey } from '@/contexts/hockey-context';
import { X, Check } from 'lucide-react-native';
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
import { Goal } from '@/types/hockey';

interface EditGoalModalProps {
  visible: boolean;
  matchId: string;
  goal: Goal | null;
  rosterPlayerIds: string[];
  onClose: () => void;
}

export function EditGoalModal({ visible, matchId, goal, rosterPlayerIds, onClose }: EditGoalModalProps) {
  const { players, updateMatchGoal } = useHockey();
  const [scorer, setScorer] = useState<string>('');
  const [assists, setAssists] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const rosterPlayers = players.filter(
    (p) => rosterPlayerIds.includes(p.id) && p.position !== 'goalie'
  );

  useEffect(() => {
    if (visible && goal) {
      setScorer(goal.scorerId);
      setAssists([...goal.assists]);
      setHasChanges(false);
    }
  }, [visible, goal]);

  if (!goal) return null;

  const handleScorerChange = (playerId: string) => {
    setScorer(playerId);
    setAssists(assists.filter((a) => a !== playerId));
    setHasChanges(true);
  };

  const toggleAssist = (playerId: string) => {
    if (playerId === scorer) return;

    if (assists.includes(playerId)) {
      setAssists(assists.filter((a) => a !== playerId));
    } else if (assists.length < 2) {
      setAssists([...assists, playerId]);
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    if (goal.isOurTeam && !scorer) {
      Alert.alert('Error', 'Please select a goal scorer');
      return;
    }

    const updates: { scorerId?: string; assists?: string[] } = {};

    if (scorer !== goal.scorerId) {
      updates.scorerId = scorer;
    }

    const assistsChanged =
      assists.length !== goal.assists.length ||
      assists.some((a, i) => a !== goal.assists[i]);

    if (assistsChanged) {
      updates.assists = assists;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    updateMatchGoal(matchId, goal.id, updates);
    Alert.alert('Updated', 'Goal details have been updated. Stats and ratings will reflect the changes.');
    onClose();
  };

  const getPlayerName = (playerId: string): string => {
    const player = players.find((p) => p.id === playerId);
    return player ? `#${player.jerseyNumber} ${player.name}` : 'Unknown';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Goal</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
            disabled={!hasChanges}
          >
            <Check color={hasChanges ? '#007AFF' : '#c7c7cc'} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.currentInfo}>
            <Text style={styles.currentLabel}>Current</Text>
            <Text style={styles.currentValue}>
              Scorer: {getPlayerName(goal.scorerId)}
            </Text>
            {goal.assists.length > 0 && (
              <Text style={styles.currentValue}>
                Assists: {goal.assists.map(getPlayerName).join(', ')}
              </Text>
            )}
            <View style={[styles.teamBadge, goal.isOurTeam ? styles.ourTeamBadge : styles.oppTeamBadge]}>
              <Text style={styles.teamBadgeText}>
                {goal.isOurTeam ? 'Our Goal' : 'Goal Against'} • P{goal.period}
              </Text>
            </View>
          </View>

          {goal.isOurTeam && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goal Scorer</Text>
                <Text style={styles.sectionHint}>Changing the scorer also updates the shot taker</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerBadge,
                        scorer === player.id && styles.playerBadgeSelected,
                      ]}
                      onPress={() => handleScorerChange(player.id)}
                    >
                      <Text
                        style={[
                          styles.playerBadgeNumber,
                          scorer === player.id && styles.playerBadgeNumberSelected,
                        ]}
                      >
                        {player.jerseyNumber}
                      </Text>
                      <Text
                        style={[
                          styles.playerBadgeName,
                          scorer === player.id && styles.playerBadgeNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {player.name}
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
                          assists.includes(player.id) && styles.playerBadgeAssist,
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
                        <Text
                          style={[
                            styles.playerBadgeName,
                            assists.includes(player.id) && styles.playerBadgeNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {player.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </>
          )}

          {!goal.isOurTeam && (
            <View style={styles.section}>
              <Text style={styles.oppNotice}>
                Opponent goals cannot have their scorer edited, but you can change which of your players were on ice for +/- through the original goal recording.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Save Changes
            </Text>
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
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  saveBtn: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end' as const,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  currentInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 15,
    color: '#1c1c1e',
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  teamBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  ourTeamBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
  },
  oppTeamBadge: {
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 12,
    fontStyle: 'italic' as const,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  playerBadge: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  playerBadgeSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  playerBadgeAssist: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  playerBadgeNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 2,
  },
  playerBadgeNumberSelected: {
    color: '#fff',
  },
  playerBadgeName: {
    fontSize: 10,
    color: '#8e8e93',
    textAlign: 'center' as const,
    paddingHorizontal: 4,
  },
  playerBadgeNameSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  oppNotice: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center' as const,
    paddingVertical: 24,
    lineHeight: 22,
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
  saveButtonDisabled: {
    backgroundColor: '#e5e5ea',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  saveButtonTextDisabled: {
    color: '#8e8e93',
  },
});
