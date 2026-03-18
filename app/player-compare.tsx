import { useHockey } from '@/contexts/hockey-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';

export default function PlayerCompareScreen() {
  const { players, calculatePlayerStats, calculateGoalieStats, matches } = useHockey();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const playersWithGames = useMemo(() => {
    return players.filter(p => {
      const gp = matches.filter(m => !m.isActive && m.roster.some(r => r.playerId === p.id)).length;
      return gp > 0;
    });
  }, [players, matches]);

  const comparisonData = useMemo(() => {
    return selectedIds.map(id => {
      const player = players.find(p => p.id === id);
      if (!player) return null;
      const isGoalie = player.position === 'goalie';
      const skaterStats = !isGoalie ? calculatePlayerStats(id) : null;
      const goalieStats = isGoalie ? calculateGoalieStats(id) : null;
      return { player, skaterStats, goalieStats, isGoalie };
    }).filter(Boolean) as Array<{
      player: typeof players[0];
      skaterStats: ReturnType<typeof calculatePlayerStats> | null;
      goalieStats: ReturnType<typeof calculateGoalieStats> | null;
      isGoalie: boolean;
    }>;
  }, [selectedIds, players, calculatePlayerStats, calculateGoalieStats]);

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removePlayer = (id: string) => {
    setSelectedIds(selectedIds.filter(pid => pid !== id));
  };

  const hasSkaters = comparisonData.some(d => !d.isGoalie);
  const hasGoalies = comparisonData.some(d => d.isGoalie);

  const skaterStatRows: { label: string; key: string; format?: (v: number) => string; highlight?: 'high' | 'low' }[] = [
    { label: 'GP', key: 'gamesPlayed' },
    { label: 'Goals', key: 'goals', highlight: 'high' },
    { label: 'Assists', key: 'assists', highlight: 'high' },
    { label: 'Points', key: 'points', highlight: 'high' },
    { label: '+/-', key: 'plusMinus', highlight: 'high' },
    { label: 'Shots', key: 'shots', highlight: 'high' },
    { label: 'Shot %', key: 'shotPercentage', format: (v) => `${v.toFixed(1)}%`, highlight: 'high' },
    { label: 'Blocks', key: 'shotBlocks', highlight: 'high' },
    { label: 'Wide', key: 'shotsWide', highlight: 'low' },
    { label: 'PIM', key: 'penaltyMinutes', highlight: 'low' },
    { label: 'FO %', key: 'faceoffPercentage', format: (v) => `${v.toFixed(1)}%`, highlight: 'high' },
    { label: 'Rating', key: 'rating', format: (v) => v.toFixed(1), highlight: 'high' },
  ];

  const goalieStatRows: { label: string; key: string; format?: (v: number) => string; highlight?: 'high' | 'low' }[] = [
    { label: 'GP', key: 'gamesPlayed' },
    { label: 'SA', key: 'shotsAgainst' },
    { label: 'Saves', key: 'saves', highlight: 'high' },
    { label: 'GA', key: 'goalsAgainst', highlight: 'low' },
    { label: 'SV%', key: 'savePercentage', format: (v) => `${v.toFixed(1)}%`, highlight: 'high' },
    { label: 'Rating', key: 'rating', format: (v) => v.toFixed(1), highlight: 'high' },
  ];

  const getBestValue = (data: Array<{ stats: Record<string, number> }>, key: string, type: 'high' | 'low') => {
    const values = data.map(d => d.stats[key] ?? 0);
    return type === 'high' ? Math.max(...values) : Math.min(...values);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Compare Players',
          headerStyle: { backgroundColor: '#0a0e1a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.selectionSection}>
          <View style={styles.selectedPlayers}>
            {selectedIds.map(id => {
              const p = players.find(pl => pl.id === id);
              if (!p) return null;
              return (
                <View key={id} style={styles.selectedChip}>
                  <View style={styles.chipBadge}>
                    <Text style={styles.chipNumber}>{p.jerseyNumber}</Text>
                  </View>
                  <Text style={styles.chipName} numberOfLines={1}>{p.name}</Text>
                  <TouchableOpacity onPress={() => removePlayer(id)}>
                    <X size={14} color="#8e8e93" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {selectedIds.length < 4 && (
              <TouchableOpacity style={styles.addPlayerBtn} onPress={() => setPickerVisible(true)}>
                <Text style={styles.addPlayerText}>+ Add Player</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {comparisonData.length < 2 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Select 2-4 Players</Text>
            <Text style={styles.emptyText}>Choose players above to compare their stats side by side</Text>
          </View>
        )}

        {comparisonData.length >= 2 && hasSkaters && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Skater Comparison</Text>
            <View style={styles.tableHeaderRow}>
              <View style={styles.labelCol} />
              {comparisonData.filter(d => !d.isGoalie).map(d => (
                <View key={d.player.id} style={styles.valueCol}>
                  <View style={[styles.miniJersey, { backgroundColor: '#007AFF' }]}>
                    <Text style={styles.miniJerseyText}>{d.player.jerseyNumber}</Text>
                  </View>
                </View>
              ))}
            </View>
            {skaterStatRows.map(row => {
              const skatersData = comparisonData.filter(d => !d.isGoalie).map(d => ({
                id: d.player.id,
                stats: (d.skaterStats ?? {}) as unknown as Record<string, number>,
              }));
              const bestVal = row.highlight ? getBestValue(skatersData, row.key, row.highlight) : null;

              return (
                <View key={row.key} style={styles.tableRow}>
                  <View style={styles.labelCol}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {skatersData.map(d => {
                    const val = (d.stats[row.key] ?? 0) as number;
                    const isBest = bestVal !== null && val === bestVal && skatersData.length > 1;
                    return (
                      <View key={d.id} style={styles.valueCol}>
                        <Text style={[styles.rowValue, isBest && styles.rowValueBest]}>
                          {row.format ? row.format(val) : val}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {comparisonData.length >= 2 && hasGoalies && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Goalie Comparison</Text>
            <View style={styles.tableHeaderRow}>
              <View style={styles.labelCol} />
              {comparisonData.filter(d => d.isGoalie).map(d => (
                <View key={d.player.id} style={styles.valueCol}>
                  <View style={[styles.miniJersey, { backgroundColor: '#34C759' }]}>
                    <Text style={styles.miniJerseyText}>{d.player.jerseyNumber}</Text>
                  </View>
                </View>
              ))}
            </View>
            {goalieStatRows.map(row => {
              const goaliesData = comparisonData.filter(d => d.isGoalie).map(d => ({
                id: d.player.id,
                stats: (d.goalieStats ?? {}) as unknown as Record<string, number>,
              }));
              const bestVal = row.highlight ? getBestValue(goaliesData, row.key, row.highlight) : null;

              return (
                <View key={row.key} style={styles.tableRow}>
                  <View style={styles.labelCol}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {goaliesData.map(d => {
                    const val = (d.stats[row.key] ?? 0) as number;
                    const isBest = bestVal !== null && val === bestVal && goaliesData.length > 1;
                    return (
                      <View key={d.id} style={styles.valueCol}>
                        <Text style={[styles.rowValue, isBest && styles.rowValueBest]}>
                          {row.format ? row.format(val) : val}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {comparisonData.length >= 2 && hasSkaters && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Per Game Averages</Text>
            <View style={styles.tableHeaderRow}>
              <View style={styles.labelCol} />
              {comparisonData.filter(d => !d.isGoalie).map(d => (
                <View key={d.player.id} style={styles.valueCol}>
                  <Text style={styles.headerPlayerName}>#{d.player.jerseyNumber}</Text>
                </View>
              ))}
            </View>
            {[
              { label: 'G/G', calc: (s: ReturnType<typeof calculatePlayerStats>) => s.gamesPlayed > 0 ? s.goals / s.gamesPlayed : 0 },
              { label: 'A/G', calc: (s: ReturnType<typeof calculatePlayerStats>) => s.gamesPlayed > 0 ? s.assists / s.gamesPlayed : 0 },
              { label: 'P/G', calc: (s: ReturnType<typeof calculatePlayerStats>) => s.gamesPlayed > 0 ? s.points / s.gamesPlayed : 0 },
              { label: 'S/G', calc: (s: ReturnType<typeof calculatePlayerStats>) => s.gamesPlayed > 0 ? s.shots / s.gamesPlayed : 0 },
            ].map(row => (
              <View key={row.label} style={styles.tableRow}>
                <View style={styles.labelCol}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                {comparisonData.filter(d => !d.isGoalie).map(d => {
                  const val = d.skaterStats ? row.calc(d.skaterStats) : 0;
                  return (
                    <View key={d.player.id} style={styles.valueCol}>
                      <Text style={styles.rowValue}>{val.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={pickerVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Player</Text>
            <ScrollView style={styles.pickerScroll}>
              {playersWithGames
                .filter(p => !selectedIds.includes(p.id))
                .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                .map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pickerRow}
                    onPress={() => {
                      togglePlayer(p.id);
                      setPickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerBadge}>
                      <Text style={styles.pickerBadgeText}>{p.jerseyNumber}</Text>
                    </View>
                    <View>
                      <Text style={styles.pickerName}>{p.name}</Text>
                      <Text style={styles.pickerPos}>{p.position}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  selectionSection: {
    marginBottom: 16,
  },
  selectedPlayers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  chipName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    maxWidth: 80,
  },
  addPlayerBtn: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderStyle: 'dashed',
  },
  addPlayerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  tableCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 10,
    marginBottom: 4,
  },
  labelCol: {
    width: 60,
    justifyContent: 'center',
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniJersey: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniJerseyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  headerPlayerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44,44,46,0.5)',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  rowValueBest: {
    color: '#34C759',
    fontWeight: '700' as const,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pickerModal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  pickerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBadgeText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  pickerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  pickerPos: {
    fontSize: 12,
    color: '#8e8e93',
  },
  pickerCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  pickerCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
});
