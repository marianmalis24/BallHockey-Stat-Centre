import { useHockey } from '@/contexts/hockey-context';
import { X, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Player } from '@/types/hockey';

interface PlayerActionModalProps {
  visible: boolean;
  player: Player | null;
  isCenter?: boolean;
  onClose: () => void;
}

export function PlayerActionModal({ visible, player, isCenter, onClose }: PlayerActionModalProps) {
  const { addPenalty, addPossession, addFaceoff } = useHockey();

  if (!player) return null;

  const handlePenalty = (minutes: number, label: string) => {
    addPenalty({
      playerId: player.id,
      minutes,
      infraction: label,
    });
    onClose();
  };

  const handlePossession = (type: 'gain' | 'loss') => {
    addPossession({
      playerId: player.id,
      type,
    });
    onClose();
  };

  const handleFaceoff = (winnerId: string, loserId: string) => {
    addFaceoff({
      winnerId,
      loserId,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.playerInfo}>
              <View style={styles.jerseyBadge}>
                <Text style={styles.jerseyNumber}>{player.jerseyNumber}</Text>
              </View>
              <View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerPosition}>
                  {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#1c1c1e" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isCenter && (
               <>
                  <Text style={styles.sectionTitle}>Faceoff</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.gainButton]}
                      onPress={() => handleFaceoff(player.id, 'opponent')}
                    >
                      <Text style={styles.actionButtonText}>Win</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.lossButton]}
                      onPress={() => handleFaceoff('opponent', player.id)}
                    >
                      <Text style={styles.actionButtonText}>Loss</Text>
                    </TouchableOpacity>
                  </View>
               </>
            )}

            <Text style={styles.sectionTitle}>Possession</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.gainButton]}
                onPress={() => handlePossession('gain')}
              >
                <ArrowUpCircle color="#fff" size={28} />
                <Text style={styles.actionButtonText}>Gain</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.lossButton]}
                onPress={() => handlePossession('loss')}
              >
                <ArrowDownCircle color="#fff" size={28} />
                <Text style={styles.actionButtonText}>Loss</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Penalty</Text>
            <View style={styles.penaltySection}>
              <TouchableOpacity
                style={[styles.actionButton, styles.penaltyButton]}
                onPress={() => handlePenalty(2, '2 Min')}
              >
                <AlertTriangle color="#fff" size={24} />
                <Text style={styles.actionButtonText}>2 Min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.penaltyButton]}
                onPress={() => handlePenalty(4, '2+2 Min')}
              >
                <AlertTriangle color="#fff" size={24} />
                <Text style={styles.actionButtonText}>2+2 Min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.penaltyButton]}
                onPress={() => handlePenalty(5, '5 Min')}
              >
                <AlertTriangle color="#fff" size={24} />
                <Text style={styles.actionButtonText}>5 Min</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jerseyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  playerPosition: {
    fontSize: 14,
    color: '#8e8e93',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  gainButton: {
    backgroundColor: '#34C759',
  },
  lossButton: {
    backgroundColor: '#FF9500',
  },
  penaltyButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  penaltySection: {
    gap: 8,
  },
});
