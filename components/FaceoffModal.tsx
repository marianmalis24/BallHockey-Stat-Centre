import { useHockey } from '@/contexts/hockey-context';
import { X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';

interface FaceoffModalProps {
  visible: boolean;
  type: 'win' | 'loss';
  onClose: () => void;
}

export function FaceoffModal({ visible, type, onClose }: FaceoffModalProps) {
  const { players, activeMatch, addFaceoff } = useHockey();

  const sortedPlayers = useMemo(() => {
    if (!activeMatch) return [];

    const rosterPlayers = players.filter(
      (p) =>
        activeMatch.roster.some((r) => r.playerId === p.id) &&
        p.position !== 'goalie'
    );

    const faceoffCounts = new Map<string, number>();
    (activeMatch.faceoffs || []).forEach((f) => {
      const count = faceoffCounts.get(f.winnerId) || 0;
      faceoffCounts.set(f.winnerId, count + 1);
      const lCount = faceoffCounts.get(f.loserId) || 0;
      faceoffCounts.set(f.loserId, lCount + 1);
    });

    return rosterPlayers.sort((a, b) => {
      const aIsCenter = activeMatch.centers?.includes(a.id) ? 1 : 0;
      const bIsCenter = activeMatch.centers?.includes(b.id) ? 1 : 0;
      if (bIsCenter !== aIsCenter) return bIsCenter - aIsCenter;

      const aCount = faceoffCounts.get(a.id) || 0;
      const bCount = faceoffCounts.get(b.id) || 0;
      return bCount - aCount;
    });
  }, [activeMatch, players]);

  const handleSelectPlayer = (playerId: string) => {
    if (type === 'win') {
      addFaceoff({ winnerId: playerId, loserId: 'opponent' });
    } else {
      addFaceoff({ winnerId: 'opponent', loserId: playerId });
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Faceoff {type === 'win' ? 'Won' : 'Lost'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#1c1c1e" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Who took the faceoff?</Text>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {sortedPlayers.map((player) => {
              const isCenter = activeMatch?.centers?.includes(player.id);
              const foCount = (activeMatch?.faceoffs || []).filter(
                (f) => f.winnerId === player.id || f.loserId === player.id
              ).length;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerRow, isCenter && styles.playerRowCenter]}
                  onPress={() => handleSelectPlayer(player.id)}
                >
                  <View style={[styles.jerseyBadge, isCenter && styles.jerseyBadgeCenter]}>
                    <Text style={styles.jerseyNumber}>{player.jerseyNumber}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerMeta}>
                      {player.position[0].toUpperCase()}
                      {isCenter ? ' • Center' : ''}
                      {foCount > 0 ? ` • ${foCount} FO` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxHeight: '75%',
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
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8e8e93',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  playerRowCenter: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  jerseyBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyBadgeCenter: {
    backgroundColor: '#FF9500',
  },
  jerseyNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  playerMeta: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
});
