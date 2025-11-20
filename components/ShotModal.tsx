import { useHockey } from '@/contexts/hockey-context';
import { ShotLocation } from '@/types/hockey';
import { X, Target } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';

interface ShotModalProps {
  visible: boolean;
  isOurTeam: boolean;
  onClose: () => void;
  preselectedScorer?: string;
  isGoalShot?: boolean;
}

const NET_WIDTH = Dimensions.get('window').width - 32;
const NET_HEIGHT = NET_WIDTH * 0.6;

export function ShotModal({ visible, isOurTeam, onClose, preselectedScorer, isGoalShot = false }: ShotModalProps) {
  const { players, activeMatch, addShot } = useHockey();
  const [location, setLocation] = useState<ShotLocation | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(preselectedScorer || null);

  React.useEffect(() => {
    if (visible) {
      if (preselectedScorer) {
        setSelectedPlayer(preselectedScorer);
      }
    } else {
      setLocation(null);
      setSelectedPlayer(null);
    }
  }, [visible, preselectedScorer]);

  const rosterPlayers = activeMatch
    ? players.filter((p) =>
        activeMatch.roster.some((r) => r.playerId === p.id && p.position !== 'goalie')
      )
    : [];

  const handleNetPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setLocation({ x: locationX / NET_WIDTH, y: locationY / NET_HEIGHT });
  };

  const handleSave = () => {
    addShot({
      playerId: selectedPlayer || undefined,
      location: location || undefined,
      isOurTeam,
      onGoal: true,
      result: isGoalShot ? 'goal' : 'save',
    });

    resetAndClose();
  };

  const resetAndClose = () => {
    setTimeout(() => {
      setLocation(null);
      setSelectedPlayer(null);
    }, 300);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isGoalShot ? 'Mark Goal Shot Location' : (isOurTeam ? 'Shot Taken' : 'Shot Against')}
          </Text>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {isOurTeam && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shooter</Text>
                <View style={styles.playerGrid}>
                  {rosterPlayers.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerBadge,
                        selectedPlayer === player.id && styles.playerBadgeSelected,
                      ]}
                      onPress={() => setSelectedPlayer(player.id)}
                    >
                      <Text
                        style={[
                          styles.playerBadgeNumber,
                          selectedPlayer === player.id &&
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
                <Text style={styles.sectionTitle}>Shot Target Location (Tap on net)</Text>
                <TouchableOpacity
                  style={styles.net}
                  onPress={handleNetPress}
                  activeOpacity={0.9}
                >
                  {location && selectedPlayer && (
                    <View
                      style={[
                        styles.shotMarker,
                        {
                          left: location.x * NET_WIDTH - 16,
                          top: location.y * NET_HEIGHT - 16,
                        },
                      ]}
                    >
                      <View style={styles.shotCircle}>
                        <Text style={styles.shotPlayerNumber}>
                          {players.find(p => p.id === selectedPlayer)?.jerseyNumber}
                        </Text>
                      </View>
                    </View>
                  )}
                  {location && !selectedPlayer && (
                    <View
                      style={[
                        styles.shotMarker,
                        {
                          left: location.x * NET_WIDTH - 8,
                          top: location.y * NET_HEIGHT - 8,
                        },
                      ]}
                    >
                      <Target color="#007AFF" size={16} />
                    </View>
                  )}
                  {!location && (
                    <Text style={styles.netPlaceholder}>Tap to mark where on target shot went</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Shot</Text>
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
  playerBadgeNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  playerBadgeNumberSelected: {
    color: '#fff',
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
    width: 32,
    height: 32,
  },
  shotCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#0051D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotPlayerNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  resultButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  resultButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  resultButtonTextSelected: {
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
});
