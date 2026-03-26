import { useHockey } from '@/contexts/hockey-context';
import { useOpponents } from '@/contexts/opponents-context';
import { Stack, router } from 'expo-router';
import { Users, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';

export default function MatchSetupScreen() {
  const { players, startMatch, activeMatch } = useHockey();
  const { opponents } = useOpponents();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [opponentName, setOpponentName] = useState('');
  const [startingGoalie, setStartingGoalie] = useState<string | null>(null);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [showOpponentPicker, setShowOpponentPicker] = useState(false);

  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
      setSelectedCenters(selectedCenters.filter((id) => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const toggleCenter = (playerId: string) => {
    if (selectedCenters.includes(playerId)) {
      setSelectedCenters(selectedCenters.filter((id) => id !== playerId));
    } else {
      setSelectedCenters([...selectedCenters, playerId]);
    }
  };

  const handleStart = () => {
    const goalies = selectedPlayers.filter(
      (id) => players.find((p) => p.id === id)?.position === 'goalie'
    );
    const skaters = selectedPlayers.filter(
      (id) => players.find((p) => p.id === id)?.position !== 'goalie'
    );

    if (skaters.length < 10 || skaters.length > 20) {
      Alert.alert('Error', 'Please select 10-20 skaters');
      return;
    }

    if (goalies.length < 1 || goalies.length > 2) {
      Alert.alert('Error', 'Please select 1-2 goalies');
      return;
    }

    if (!opponentName.trim()) {
      Alert.alert('Error', 'Please enter opponent name');
      return;
    }

    if (!startingGoalie) {
      Alert.alert('Error', 'Please select a starting goalie');
      return;
    }

    startMatch(selectedPlayers, opponentName.trim(), startingGoalie, selectedCenters);
    router.replace('/');
  };

  if (activeMatch) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Match Setup' }} />
        <View style={styles.activeMatchContainer}>
          <Text style={styles.activeMatchTitle}>Match Already Active</Text>
          <Text style={styles.activeMatchText}>
            You already have an active match. End it before starting a new one.
          </Text>
          <TouchableOpacity
            style={styles.goToMatchButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goToMatchButtonText}>Go to Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (players.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Match Setup' }} />
        <View style={styles.emptyState}>
          <Users color="#8e8e93" size={48} />
          <Text style={styles.emptyTitle}>No Players Available</Text>
          <Text style={styles.emptyText}>
            Add players to your roster before starting a match
          </Text>
          <TouchableOpacity
            style={styles.addPlayersButton}
            onPress={() => router.push('/players')}
          >
            <Text style={styles.addPlayersButtonText}>Go to Players</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedGoalieIds = selectedPlayers.filter(
    (id) => players.find((p) => p.id === id)?.position === 'goalie'
  );
  const selectedGoalies = selectedGoalieIds.length;
  const selectedSkaters = selectedPlayers.filter(
    (id) => players.find((p) => p.id === id)?.position !== 'goalie'
  ).length;

  const selectedGoaliePlayers = players.filter((p) => selectedGoalieIds.includes(p.id));
  const selectedSkaterPlayers = players.filter((p) => selectedPlayers.includes(p.id) && p.position !== 'goalie');

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.position === 'goalie' && b.position !== 'goalie') return 1;
    if (a.position !== 'goalie' && b.position === 'goalie') return -1;
    return a.jerseyNumber - b.jerseyNumber;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Start New Match' }} />

      <View style={styles.header}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Opponent Name</Text>
          <TextInput
            style={styles.input}
            value={opponentName}
            onChangeText={setOpponentName}
            placeholder="Enter team name"
            placeholderTextColor="#999"
          />
          {opponents.length > 0 && (
            <TouchableOpacity
              style={styles.savedOpponentsButton}
              onPress={() => setShowOpponentPicker(true)}
            >
              <ChevronDown color="#007AFF" size={16} />
              <Text style={styles.savedOpponentsText}>Select from saved</Text>
            </TouchableOpacity>
          )}
        </View>

        {showOpponentPicker && (
          <View style={styles.opponentPicker}>
            <Text style={styles.pickerTitle}>Select Opponent</Text>
            <ScrollView style={styles.pickerScroll}>
              {opponents.map((opponent) => (
                <TouchableOpacity
                  key={opponent.id}
                  style={styles.opponentOption}
                  onPress={() => {
                    setOpponentName(opponent.name);
                    setShowOpponentPicker(false);
                  }}
                >
                  <Text style={styles.opponentOptionText}>{opponent.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelOption}
                onPress={() => setShowOpponentPicker(false)}
              >
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={styles.selectionInfo}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Skaters</Text>
            <Text
              style={[
                styles.infoValue,
                selectedSkaters >= 10 && selectedSkaters <= 20 && styles.infoValueValid,
              ]}
            >
              {selectedSkaters}/10-20
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Goalies</Text>
            <Text
              style={[
                styles.infoValue,
                selectedGoalies >= 1 && selectedGoalies <= 2 && styles.infoValueValid,
              ]}
            >
              {selectedGoalies}/1-2
            </Text>
          </View>
        </View>

        {selectedGoaliePlayers.length > 0 && (
          <View style={styles.goalieSection}>
            <Text style={styles.inputLabel}>Starting Goalie</Text>
            <View style={styles.goalieButtons}>
              {selectedGoaliePlayers.map((goalie) => (
                <TouchableOpacity
                  key={goalie.id}
                  style={[
                    styles.goalieButton,
                    startingGoalie === goalie.id && styles.goalieButtonSelected,
                  ]}
                  onPress={() => setStartingGoalie(goalie.id)}
                >
                  <View
                    style={[
                      styles.goalieJersey,
                      startingGoalie === goalie.id && styles.goalieJerseySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.goalieJerseyNumber,
                        startingGoalie === goalie.id && styles.goalieJerseyNumberSelected,
                      ]}
                    >
                      {goalie.jerseyNumber}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.goalieName,
                      startingGoalie === goalie.id && styles.goalieNameSelected,
                    ]}
                  >
                    {goalie.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedSkaterPlayers.length > 0 && (
          <View style={styles.goalieSection}>
             <Text style={styles.inputLabel}>Select Centers (Faceoffs)</Text>
             <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={selectedSkaterPlayers}
                keyExtractor={item => item.id}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                renderItem={({ item }) => {
                  const isCenter = selectedCenters.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.centerButton,
                        isCenter && styles.centerButtonSelected
                      ]}
                      onPress={() => toggleCenter(item.id)}
                    >
                      <Text style={[styles.centerButtonText, isCenter && styles.centerButtonTextSelected]}>
                        #{item.jerseyNumber} {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
             />
          </View>
        )}
      </View>

      <FlatList
        data={sortedPlayers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedPlayers.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.playerCard, isSelected && styles.playerCardSelected]}
              onPress={() => togglePlayer(item.id)}
            >
              <View style={styles.playerHeader}>
                <View
                  style={[
                    styles.jerseyBadge,
                    isSelected && styles.jerseyBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.jerseyNumber,
                      isSelected && styles.jerseyNumberSelected,
                    ]}
                  >
                    {item.jerseyNumber}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <Text style={styles.playerPosition}>
                    {item.position.charAt(0).toUpperCase() + item.position.slice(1)}
                  </Text>
                </View>
              </View>
              <View
                style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              >
                {isSelected && <View style={styles.checkmark} />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start Match</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  selectionInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FF3B30',
  },
  infoValueValid: {
    color: '#34C759',
  },
  listContent: {
    padding: 16,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F1FF',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jerseyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jerseyBadgeSelected: {
    backgroundColor: '#007AFF',
  },
  jerseyNumber: {
    color: '#8e8e93',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  jerseyNumberSelected: {
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 14,
    color: '#8e8e93',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addPlayersButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  addPlayersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  activeMatchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  activeMatchTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  activeMatchText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  goToMatchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  goToMatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  goalieSection: {
    marginTop: 16,
  },
  goalieButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  goalieButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalieButtonSelected: {
    borderColor: '#34C759',
    backgroundColor: '#E8F8EC',
  },
  goalieJersey: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  goalieJerseySelected: {
    backgroundColor: '#34C759',
  },
  goalieJerseyNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#8e8e93',
  },
  goalieJerseyNumberSelected: {
    color: '#fff',
  },
  goalieName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    textAlign: 'center',
  },
  goalieNameSelected: {
    color: '#34C759',
  },
  centerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  centerButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  centerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  centerButtonTextSelected: {
    color: '#fff',
  },
  savedOpponentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E5F1FF',
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  savedOpponentsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  opponentPicker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    maxHeight: 300,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  opponentOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  opponentOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  cancelOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    marginTop: 4,
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
  },
});
