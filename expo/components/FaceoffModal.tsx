import { useHockey } from '@/contexts/hockey-context';
import { X } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { FaceoffZone } from '@/types/hockey';
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

const ZONES: { key: FaceoffZone; label: string; color: string; bgColor: string }[] = [
  { key: 'dzone', label: 'D-Zone', color: '#FF3B30', bgColor: 'rgba(255,59,48,0.15)' },
  { key: 'neutral', label: 'Neutral', color: '#FF9500', bgColor: 'rgba(255,149,0,0.15)' },
  { key: 'ozone', label: 'O-Zone', color: '#34C759', bgColor: 'rgba(52,199,89,0.15)' },
];

export function FaceoffModal({ visible, type, onClose }: FaceoffModalProps) {
  const { players, activeMatch, addFaceoff } = useHockey();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

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

  const handleSelectPlayer = useCallback((playerId: string) => {
    setSelectedPlayerId(playerId);
  }, []);

  const handleSelectZone = useCallback((zone: FaceoffZone) => {
    if (!selectedPlayerId) return;
    if (type === 'win') {
      addFaceoff({ winnerId: selectedPlayerId, loserId: 'opponent', zone });
    } else {
      addFaceoff({ winnerId: 'opponent', loserId: selectedPlayerId, zone });
    }
    setSelectedPlayerId(null);
    onClose();
  }, [selectedPlayerId, type, addFaceoff, onClose]);

  const handleClose = useCallback(() => {
    setSelectedPlayerId(null);
    onClose();
  }, [onClose]);

  const handleBackToPlayers = useCallback(() => {
    setSelectedPlayerId(null);
  }, []);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return players.find(p => p.id === selectedPlayerId) ?? null;
  }, [selectedPlayerId, players]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Faceoff {type === 'win' ? 'Won' : 'Lost'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X color="#1c1c1e" size={24} />
            </TouchableOpacity>
          </View>

          {!selectedPlayerId ? (
            <>
              <Text style={styles.subtitle}>Who took the faceoff?</Text>
              <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {sortedPlayers.map((player) => {
                  const isCenter = activeMatch?.centers?.includes(player.id);
                  const fos = (activeMatch?.faceoffs || []).filter(
                    (f) => f.winnerId === player.id || f.loserId === player.id
                  );
                  const foCount = fos.length;
                  const foWins = fos.filter(f => f.winnerId === player.id).length;

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
                          {foCount > 0 ? ` • ${foWins}/${foCount} FO` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backRow} onPress={handleBackToPlayers}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <View style={styles.zoneSection}>
                <View style={styles.selectedPlayerBadge}>
                  <View style={styles.selectedJersey}>
                    <Text style={styles.selectedJerseyNum}>{selectedPlayer?.jerseyNumber}</Text>
                  </View>
                  <Text style={styles.selectedName}>{selectedPlayer?.name}</Text>
                </View>
                <Text style={styles.zoneTitle}>Where was the faceoff?</Text>
                <View style={styles.zoneGrid}>
                  {ZONES.map((z) => (
                    <TouchableOpacity
                      key={z.key}
                      style={[styles.zoneButton, { backgroundColor: z.bgColor, borderColor: z.color }]}
                      onPress={() => handleSelectZone(z.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.zoneDot, { backgroundColor: z.color }]} />
                      <Text style={[styles.zoneLabel, { color: z.color }]}>{z.label}</Text>
                      <Text style={styles.zoneHint}>
                        {z.key === 'dzone' ? 'Bad for us' : z.key === 'ozone' ? 'Good for us' : 'Center ice'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
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
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  zoneSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  selectedPlayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  selectedJersey: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedJerseyNum: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  selectedName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 14,
  },
  zoneGrid: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  zoneButton: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 6,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  zoneHint: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
});
