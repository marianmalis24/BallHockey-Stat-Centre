import { useHockey } from '@/contexts/hockey-context';
import { X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';

interface GoalModalProps {
  visible: boolean;
  isOurTeam: boolean;
  onClose: () => void;
  onOpenShotModal?: (scorerId: string, goalTimestamp: string) => void;
}

const NET_WIDTH = Dimensions.get('window').width - 32;
const NET_HEIGHT = NET_WIDTH * 0.6;

export function GoalModal({ visible, isOurTeam, onClose, onOpenShotModal }: GoalModalProps) {
  const { players, activeMatch, addGoal } = useHockey();
  const [scorer, setScorer] = useState<string | null>(null);
  const [assists, setAssists] = useState<string[]>([]);
  const [plusPlayers, setPlusPlayers] = useState<string[]>([]);
  const [minusPlayers, setMinusPlayers] = useState<string[]>([]);
  const [autoSelectedPlus, setAutoSelectedPlus] = useState<string[]>([]);

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
    }
  }, [visible]);

  const handleSave = () => {
    console.log('=== GoalModal handleSave called ===');
    console.log('isOurTeam:', isOurTeam);
    console.log('scorer:', scorer);
    console.log('minusPlayers:', minusPlayers);
    
    if (isOurTeam && !scorer) {
      Alert.alert('Missing Information', 'Please select the goal scorer');
      return;
    }

    if (!isOurTeam && minusPlayers.length === 0) {
      Alert.alert('Missing Information', 'Please select the players who get minus (-)');
      return;
    }

    console.log('GoalModal: All validations passed, calling addGoal');
    
    const goalData = {
      scorerId: scorer || '',
      assists: assists,
      plusPlayers: isOurTeam ? plusPlayers : [],
      minusPlayers: !isOurTeam ? minusPlayers : [],
      isOurTeam,
    };
    
    console.log('GoalModal: Goal data:', goalData);
    console.log('GoalModal: About to call addGoal function');
    
    const goalTimestamp = Date.now();
    
    addGoal(goalData);
    console.log('GoalModal: addGoal function called (includes automatic shot recording)');
    console.log('GoalModal: Goal timestamp:', goalTimestamp);

    console.log('GoalModal: Closing modal');
    resetAndClose();
    
    if (isOurTeam && onOpenShotModal && scorer) {
      console.log('GoalModal: Opening shot modal for goal shot location with scorer:', scorer, 'goalTimestamp:', goalTimestamp + 1);
      onOpenShotModal(scorer, (goalTimestamp + 1).toString());
    }
    console.log('=== GoalModal handleSave finished ===');
  };

  const resetAndClose = () => {
    setScorer(null);
    setAssists([]);
    setPlusPlayers([]);
    setMinusPlayers([]);
    setAutoSelectedPlus([]);
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
    if (autoSelectedPlus.includes(playerId)) {
      return;
    }
    
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
                            assists.includes(player.id) &&
                              styles.playerBadgeNumberSelected,
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
                <Text style={styles.sectionHint}>Scorer and assisters are automatically selected. Select up to {6 - autoSelectedPlus.length} more.</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => {
                    const isAutoSelected = autoSelectedPlus.includes(player.id);
                    const canSelect = plusPlayers.length < 6 || plusPlayers.includes(player.id);
                    
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerBadge,
                          plusPlayers.includes(player.id) &&
                            styles.playerBadgeSelectedGreen,
                          isAutoSelected && styles.playerBadgeAuto,
                          !canSelect && styles.playerBadgeDisabled,
                        ]}
                        onPress={() => togglePlusPlayer(player.id)}
                        disabled={isAutoSelected || !canSelect}
                      >
                        <Text
                          style={[
                            styles.playerBadgeNumber,
                            plusPlayers.includes(player.id) &&
                              styles.playerBadgeNumberSelected,
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
                        minusPlayers.includes(player.id) &&
                          styles.playerBadgeNumberSelected,
                      ]}
                    >
                      {player.jerseyNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
  net: {
    width: NET_WIDTH,
    height: NET_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF3B30',
    position: 'relative' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netPlaceholder: {
    color: '#8e8e93',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  shotMarker: {
    position: 'absolute' as const,
    width: 16,
    height: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 8,
    fontStyle: 'italic' as const,
  },
  playerBadgeAuto: {
    opacity: 0.8,
  },
  playerBadgeDisabled: {
    opacity: 0.3,
  },
});
