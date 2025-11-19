import { Shot, Player } from '@/types/hockey';
import { Target } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface ShotDiagramProps {
  shots: Shot[];
  players: Player[];
  isOurTeam: boolean;
}

const NET_WIDTH = Dimensions.get('window').width - 32;
const NET_HEIGHT = NET_WIDTH * 0.6;

export function ShotDiagram({ shots, players, isOurTeam }: ShotDiagramProps) {
  const filteredShots = shots.filter(
    (shot) => shot.isOurTeam === isOurTeam && shot.location
  );

  if (filteredShots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No shots on target recorded</Text>
      </View>
    );
  }

  const adjustedShots = filteredShots.map((shot, index) => {
    if (!shot.location) return shot;

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

  return (
    <View style={styles.container}>
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
                    color={isGoal ? '#FFD700' : '#007AFF'}
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
          <Text style={styles.legendText}>Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.saveCircle]} />
          <Text style={styles.legendText}>Save</Text>
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
    borderColor: '#FFB800',
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
    color: '#1c1c1e',
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
});
