import { useHockey } from '@/contexts/hockey-context';
import { Player, PlayerPosition } from '@/types/hockey';
import { Stack } from 'expo-router';
import { Plus, Trash2, Edit2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';

export default function PlayersScreen() {
  const { players, addPlayer, deletePlayer, updatePlayer } = useHockey();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('forward');

  const handleSave = () => {
    if (!name.trim() || !jerseyNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const number = parseInt(jerseyNumber, 10);
    if (isNaN(number) || number < 0 || number > 99) {
      Alert.alert('Error', 'Jersey number must be between 0 and 99');
      return;
    }

    const duplicate = players.find(
      (p) => p.jerseyNumber === number && p.id !== editingPlayer?.id
    );
    if (duplicate) {
      Alert.alert('Error', 'Jersey number already exists');
      return;
    }

    if (editingPlayer) {
      updatePlayer(editingPlayer.id, {
        name: name.trim(),
        jerseyNumber: number,
        position,
      });
    } else {
      addPlayer({
        name: name.trim(),
        jerseyNumber: number,
        position,
      });
    }

    resetForm();
    setModalVisible(false);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setName(player.name);
    setJerseyNumber(player.jerseyNumber.toString());
    setPosition(player.position);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Player', 'Are you sure you want to delete this player?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlayer(id) },
    ]);
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setName('');
    setJerseyNumber('');
    setPosition('forward');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const sortedPlayers = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Players',
          headerRight: () => (
            <TouchableOpacity onPress={openAddModal} style={styles.headerButton}>
              <Plus color="#007AFF" size={28} />
            </TouchableOpacity>
          ),
        }}
      />

      {players.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Players Yet</Text>
          <Text style={styles.emptyText}>
            Add players to start tracking statistics
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus color="#fff" size={20} />
            <Text style={styles.addButtonText}>Add First Player</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedPlayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <View style={styles.jerseyBadge}>
                  <Text style={styles.jerseyNumber}>{item.jerseyNumber}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <Text style={styles.playerPosition}>
                    {item.position.charAt(0).toUpperCase() + item.position.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.actionButton}
                >
                  <Edit2 color="#007AFF" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.actionButton}
                >
                  <Trash2 color="#FF3B30" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter player name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Jersey Number</Text>
              <TextInput
                style={styles.input}
                value={jerseyNumber}
                onChangeText={setJerseyNumber}
                placeholder="0-99"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Position</Text>
              <View style={styles.positionButtons}>
                <TouchableOpacity
                  style={[
                    styles.positionButton,
                    position === 'forward' && styles.positionButtonActive,
                  ]}
                  onPress={() => setPosition('forward')}
                >
                  <Text
                    style={[
                      styles.positionButtonText,
                      position === 'forward' && styles.positionButtonTextActive,
                    ]}
                  >
                    Forward
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.positionButton,
                    position === 'defense' && styles.positionButtonActive,
                  ]}
                  onPress={() => setPosition('defense')}
                >
                  <Text
                    style={[
                      styles.positionButtonText,
                      position === 'defense' && styles.positionButtonTextActive,
                    ]}
                  >
                    Defense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.positionButton,
                    position === 'goalie' && styles.positionButtonActive,
                  ]}
                  onPress={() => setPosition('goalie')}
                >
                  <Text
                    style={[
                      styles.positionButtonText,
                      position === 'goalie' && styles.positionButtonTextActive,
                    ]}
                  >
                    Goalie
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerButton: {
    paddingHorizontal: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jerseyNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 44,
  },
  headerSpacer: {
    width: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  saveButton: {
    padding: 4,
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  positionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  positionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  positionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  positionButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1c1c1e',
  },
  positionButtonTextActive: {
    color: '#fff',
  },
});
