import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Animated } from 'react-native';
import { Timer, Plus, X, Play, Square, Users } from 'lucide-react-native';
import { useHockey } from '@/contexts/hockey-context';
import { Line } from '@/types/hockey';

export const LineShiftTracker = React.memo(() => {
  const { activeMatch, players, setMatchLines, startShift, endShift, getLineTOI } = useHockey();
  const [lineSetupVisible, setLineSetupVisible] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineType, setNewLineType] = useState<'forward' | 'defense'>('forward');
  const [selectedLinePlayerIds, setSelectedLinePlayerIds] = useState<string[]>([]);
  const [, setTick] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeMatch?.activeLineId) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeMatch?.activeLineId, pulseAnim]);

  const formatTOI = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getCurrentShiftTime = useCallback((): string => {
    if (!activeMatch?.activeLineId || !activeMatch.shifts) return '0:00';
    const activeShift = activeMatch.shifts.find(s => !s.endTime && s.lineId === activeMatch.activeLineId);
    if (!activeShift) return '0:00';
    return formatTOI(Date.now() - activeShift.startTime);
  }, [activeMatch, formatTOI]);

  const handleAddLine = useCallback(() => {
    if (!activeMatch || !newLineName.trim() || selectedLinePlayerIds.length === 0) {
      Alert.alert('Error', 'Please provide a name and select players');
      return;
    }
    const newLine: Line = {
      id: Date.now().toString(),
      name: newLineName.trim(),
      playerIds: selectedLinePlayerIds,
      type: newLineType,
    };
    const existing = activeMatch.lines || [];
    setMatchLines([...existing, newLine]);
    setNewLineName('');
    setSelectedLinePlayerIds([]);
    setLineSetupVisible(false);
  }, [activeMatch, newLineName, selectedLinePlayerIds, newLineType, setMatchLines]);

  const handleDeleteLine = useCallback((lineId: string) => {
    if (!activeMatch) return;
    const updated = (activeMatch.lines || []).filter(l => l.id !== lineId);
    setMatchLines(updated);
  }, [activeMatch, setMatchLines]);

  const handleToggleShift = useCallback((lineId: string) => {
    if (!activeMatch) return;
    if (activeMatch.activeLineId === lineId) {
      endShift();
    } else {
      startShift(lineId);
    }
  }, [activeMatch, startShift, endShift]);

  const toggleLinePlayer = useCallback((playerId: string) => {
    setSelectedLinePlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  }, []);

  if (!activeMatch) return null;

  const lines = activeMatch.lines || [];
  const rosterPlayers = players.filter(p => activeMatch.roster.some(r => r.playerId === p.id) && p.position !== 'goalie');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={16} color="#5ac8fa" />
          <Text style={styles.title}>Lines & Shifts</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setLineSetupVisible(true)}>
          <Plus size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {activeMatch.activeLineId && (
        <View style={styles.activeShiftBanner}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.activeShiftText}>
            {lines.find(l => l.id === activeMatch.activeLineId)?.name || 'Line'} — {getCurrentShiftTime()}
          </Text>
        </View>
      )}

      {lines.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={() => setLineSetupVisible(true)}>
          <Text style={styles.emptyText}>Tap to set up lines</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linesScroll}>
          {lines.map((line) => {
            const isActive = activeMatch.activeLineId === line.id;
            const toi = getLineTOI(line.id);
            const linePlayerNames = line.playerIds
              .map(id => players.find(p => p.id === id))
              .filter(Boolean)
              .map(p => `#${p!.jerseyNumber}`)
              .join(' ');

            return (
              <View key={line.id} style={[styles.lineCard, isActive && styles.lineCardActive]}>
                <View style={styles.lineCardTop}>
                  <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteLine(line.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={14} color="#636366" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.linePlayersList} numberOfLines={1}>{linePlayerNames}</Text>
                <View style={styles.lineCardBottom}>
                  <View style={styles.toiBox}>
                    <Timer size={12} color="#5ac8fa" />
                    <Text style={styles.toiText}>{formatTOI(toi)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.shiftBtn, isActive && styles.shiftBtnActive]}
                    onPress={() => handleToggleShift(line.id)}
                  >
                    {isActive ? <Square size={14} color="#fff" /> : <Play size={14} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={lineSetupVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Line</Text>
            <TextInput
              style={styles.input}
              value={newLineName}
              onChangeText={setNewLineName}
              placeholder="Line name (e.g. Line 1, D-Pair 1)"
              placeholderTextColor="#636366"
            />
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, newLineType === 'forward' && styles.typeBtnActive]}
                onPress={() => setNewLineType('forward')}
              >
                <Text style={[styles.typeBtnText, newLineType === 'forward' && styles.typeBtnTextActive]}>Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, newLineType === 'defense' && styles.typeBtnActive]}
                onPress={() => setNewLineType('defense')}
              >
                <Text style={[styles.typeBtnText, newLineType === 'defense' && styles.typeBtnTextActive]}>Defense</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pickLabel}>Select Players</Text>
            <ScrollView style={styles.playerScroll}>
              <View style={styles.playerGrid}>
                {rosterPlayers
                  .filter(p => newLineType === 'forward' ? p.position === 'forward' : p.position === 'defense')
                  .map(p => {
                    const selected = selectedLinePlayerIds.includes(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.playerBadge, selected && styles.playerBadgeSelected]}
                        onPress={() => toggleLinePlayer(p.id)}
                      >
                        <Text style={[styles.playerBadgeText, selected && styles.playerBadgeTextSelected]}>
                          #{p.jerseyNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLineSetupVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddLine}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeShiftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  activeShiftText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  emptyCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 13,
    color: '#636366',
  },
  linesScroll: {
    gap: 8,
    paddingRight: 16,
  },
  lineCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 10,
    width: 140,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  lineCardActive: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52,199,89,0.08)',
  },
  lineCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lineName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
    flex: 1,
  },
  linePlayersList: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 8,
  },
  lineCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toiText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#5ac8fa',
  },
  shiftBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftBtnActive: {
    backgroundColor: '#FF3B30',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#fff',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#007AFF',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  pickLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
    marginBottom: 8,
  },
  playerScroll: {
    maxHeight: 180,
    marginBottom: 16,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  playerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeSelected: {
    backgroundColor: '#007AFF',
  },
  playerBadgeText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#8e8e93',
  },
  playerBadgeTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
