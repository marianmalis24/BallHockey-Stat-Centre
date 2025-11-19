import { useOpponents } from '@/contexts/opponents-context';
import { Stack } from 'expo-router';
import { Plus, Trash2, Shield } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';

export default function OpponentsScreen() {
  const { opponents, addOpponent, deleteOpponent } = useOpponents();
  const [newOpponentName, setNewOpponentName] = useState('');

  const handleAddOpponent = () => {
    if (!newOpponentName.trim()) {
      Alert.alert('Error', 'Please enter an opponent name');
      return;
    }

    addOpponent(newOpponentName);
    setNewOpponentName('');
  };

  const handleDeleteOpponent = (id: string, name: string) => {
    Alert.alert('Delete Opponent', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteOpponent(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Opponents', headerShown: true }} />

      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Add New Opponent</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newOpponentName}
            onChangeText={setNewOpponentName}
            placeholder="Enter opponent name"
            placeholderTextColor="#999"
            returnKeyType="done"
            onSubmitEditing={handleAddOpponent}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddOpponent}>
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Saved Opponents ({opponents.length})
        </Text>

        {opponents.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield color="#8e8e93" size={48} />
            <Text style={styles.emptyTitle}>No Opponents</Text>
            <Text style={styles.emptyText}>
              Add opponents you frequently play against for quick match setup
            </Text>
          </View>
        ) : (
          <FlatList
            data={opponents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.opponentCard}>
                <View style={styles.opponentIcon}>
                  <Shield color="#007AFF" size={24} />
                </View>
                <View style={styles.opponentInfo}>
                  <Text style={styles.opponentName}>{item.name}</Text>
                  <Text style={styles.opponentDate}>
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteOpponent(item.id, item.name)}
                >
                  <Trash2 color="#FF3B30" size={20} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  addSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    gap: 12,
  },
  opponentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  opponentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  opponentDate: {
    fontSize: 13,
    color: '#8e8e93',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
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
  },
});
