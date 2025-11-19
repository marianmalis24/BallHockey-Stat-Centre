import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Opponent } from '@/types/opponent';

const OPPONENTS_KEY = 'hockey_opponents';

export const [OpponentsProvider, useOpponents] = createContextHook(() => {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOpponents();
  }, []);

  const loadOpponents = async () => {
    try {
      const data = await AsyncStorage.getItem(OPPONENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setOpponents(parsed);
      }
    } catch (error) {
      console.error('Failed to load opponents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOpponents = async (updatedOpponents: Opponent[]) => {
    try {
      await AsyncStorage.setItem(OPPONENTS_KEY, JSON.stringify(updatedOpponents));
      setOpponents(updatedOpponents);
    } catch (error) {
      console.error('Failed to save opponents:', error);
    }
  };

  const addOpponent = useCallback(
    (name: string) => {
      const newOpponent: Opponent = {
        id: Date.now().toString(),
        name: name.trim(),
        createdAt: Date.now(),
      };
      const updated = [...opponents, newOpponent];
      saveOpponents(updated);
    },
    [opponents]
  );

  const deleteOpponent = useCallback(
    (id: string) => {
      const updated = opponents.filter((o) => o.id !== id);
      saveOpponents(updated);
    },
    [opponents]
  );

  return {
    opponents,
    isLoading,
    addOpponent,
    deleteOpponent,
  };
});
