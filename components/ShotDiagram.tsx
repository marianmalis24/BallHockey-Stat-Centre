import { Shot, Player } from '@/types/hockey';
import { Target } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
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

  const adjustedShots = useMemo(() => {
    const shotsWithDefaults = filteredShots.map((shot) => ({
      ...shot,
      location: shot.location || { x: 0.5, y: 0.5 },
    }));

    const result: typeof shotsWithDefaults = [];
    const COLLISION_THRESHOLD = 0.06;

    shotsWithDefaults.forEach((shot, index) => {
      let adjustedX = shot.location.x;
      let adjustedY = shot.location.y;

      for (const prev of result) {
        const dx = adjustedX - prev.location.x;
        const dy = adjustedY - prev.location.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < COLLISION_THRESHOLD) {
          const angle = index * 1.3 + Math.atan2(dy || 0.01, dx || 0.01);
          adjustedX = prev.location.x + Math.cos(angle) * COLLISION_THRESHOLD * 1.5;
          adjustedY = prev.location.y + Math.sin(angle) * COLLISION_THRESHOLD * 1.5;
        }
      }

      adjustedX = Math.max(0.05, Math.min(0.95, adjustedX));
      adjustedY = Math.max(0.05, Math.min(0.95, adjustedY));

      result.push({ ...shot, location: { x: adjustedX, y: adjustedY } });
    });

    return result;
  }, [filteredShots]);

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
          const riskColors = {
            high: { bg: '#FF3B30', border: '#cc2f26' },
            medium: { bg: '#FF9500', border: '#cc7700' },
            low: { bg: '#34C759', border: '#2aa147' },
          };
          const riskColor = shot.shotRisk ? riskColors[shot.shotRisk] : null;
          const bgColor = isGoal ? '#FFD700' : (riskColor ? riskColor.bg : '#007AFF');
          const borderColor = isGoal ? '#FFA500' : (riskColor ? riskColor.border : '#0051D5');
          const textColor = isGoal ? '#000' : '#fff';

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
                  { backgroundColor: bgColor, borderColor: borderColor },
                ]}
              >
                {player && (
                  <Text
                    style={[
                      styles.playerNumber,
                      { color: textColor },
                    ]}
                  >
                    {player.jerseyNumber}
                  </Text>
                )}
                {!player && (
                  <Target
                    color={textColor}
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
          <View style={[styles.legendCircle, { backgroundColor: '#FFD700', borderColor: '#FFA500' }]} />
          <Text style={styles.legendText}>Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, { backgroundColor: '#FF3B30', borderColor: '#cc2f26' }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, { backgroundColor: '#FF9500', borderColor: '#cc7700' }]} />
          <Text style={styles.legendText}>Med</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, { backgroundColor: '#34C759', borderColor: '#2aa147' }]} />
          <Text style={styles.legendText}>Low</Text>
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
    overflow: 'hidden',
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
