import { Shot, Player } from '@/types/hockey';
import { Target } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface ShotDiagramProps {
  shots: Shot[];
  players: Player[];
  isOurTeam: boolean;
  periods?: number;
}

const NET_WIDTH = Dimensions.get('window').width - 32;
const NET_HEIGHT = NET_WIDTH * 0.6;

export function ShotDiagram({ shots, players, isOurTeam, periods = 3 }: ShotDiagramProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'all'>('all');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  if (!isOurTeam) {
    return null;
  }

  const teamPlayers = players.filter((p) =>
    shots.some((s) => s.isOurTeam === isOurTeam && s.playerId === p.id)
  );

  const filteredShots = shots.filter((shot) => {
    if (shot.isOurTeam !== isOurTeam) return false;
    if (selectedPeriod !== 'all' && shot.period !== selectedPeriod) return false;
    if (selectedPlayers.size > 0 && shot.playerId && !selectedPlayers.has(shot.playerId)) {
      return false;
    }
    return true;
  });

  const adjustedShots = filteredShots.map((shot, index) => {
    if (!shot.location) {
      return {
        ...shot,
        location: { x: 0.5, y: 0.5 }
      };
    }

    const COLLISION_THRESHOLD = 0.05;
    let adjustedX = shot.location.x;
    let adjustedY = shot.location.y;

    for (let i = 0; i < index; i++) {
      const otherShot = filteredShots[i];
      if (!otherShot.location) continue;

      const dx = adjustedX - otherShot.location.x;
      const dy = adjustedY - otherShot.location.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < COLLISION_THRESHOLD) {
        const angle = Math.atan2(dy, dx);
        const offsetDistance = COLLISION_THRESHOLD * 1.2;
        adjustedX = otherShot.location.x + Math.cos(angle) * offsetDistance;
        adjustedY = otherShot.location.y + Math.sin(angle) * offsetDistance;
      }
    }

    adjustedX = Math.max(0.05, Math.min(0.95, adjustedX));
    adjustedY = Math.max(0.05, Math.min(0.95, adjustedY));

    return {
      ...shot,
      location: { x: adjustedX, y: adjustedY },
    };
  });

  const togglePlayerFilter = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  return (
    <View style={styles.container}>
      {isOurTeam && teamPlayers.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Player:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerFilters}
          >
            {teamPlayers.map((player) => {
              const isSelected = selectedPlayers.has(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerFilterChip,
                    isSelected && styles.playerFilterChipActive,
                  ]}
                  onPress={() => togglePlayerFilter(player.id)}
                >
                  <Text
                    style={[
                      styles.playerFilterText,
                      isSelected && styles.playerFilterTextActive,
                    ]}
                  >
                    #{player.jerseyNumber} {player.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {periods > 0 && (
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'all' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('all')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'all' && styles.periodButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {Array.from({ length: periods }, (_, i) => i + 1).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                P{period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.net}>
        {adjustedShots.map((shot) => {
          if (!shot.location) return null;

          const player = shot.playerId
            ? players.find((p) => p.id === shot.playerId)
            : null;

          const isGoal = shot.result === 'goal';

          return (
            <View
              key={shot.id}
              style={[
                styles.shotMarker,
                {
                  left: shot.location.x * NET_WIDTH - 16,
                  top: shot.location.y * NET_HEIGHT - 16,
                },
              ]}
            >
              <View
                style={[
                  styles.shotCircle,
                  isGoal ? styles.goalCircle : styles.saveCircle,
                ]}
              >
                {player && (
                  <Text
                    style={[
                      styles.playerNumber,
                      isGoal ? styles.goalText : styles.saveText,
                    ]}
                  >
                    {player.jerseyNumber}
                  </Text>
                )}
                {!player && (
                  <Target
                    color={isGoal ? '#000' : '#007AFF'}
                    size={16}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.goalCircle]} />
          <Text style={styles.legendText}>Goal (Gold)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.saveCircle]} />
          <Text style={styles.legendText}>Save (Blue)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  net: {
    width: NET_WIDTH,
    height: NET_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF3B30',
    position: 'relative' as const,
    alignSelf: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  goalCircle: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
  },
  saveCircle: {
    backgroundColor: '#007AFF',
    borderColor: '#0051D5',
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  goalText: {
    color: '#000',
  },
  saveText: {
    color: '#fff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '500' as const,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  playerFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  playerFilterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  playerFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  playerFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1c1c1e',
  },
  playerFilterTextActive: {
    color: '#fff',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
});
