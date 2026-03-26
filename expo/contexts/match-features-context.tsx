import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';

const FEATURES_KEY = 'match_features';

export interface MatchFeatures {
  shotRisk: boolean;
  ppMode: boolean;
  wideShots: boolean;
  blockedShots: boolean;
  faceoffs: boolean;
  penalties: boolean;
  shotMap: boolean;
  shiftTracking: boolean;
  momentum: boolean;
}

const DEFAULT_FEATURES: MatchFeatures = {
  shotRisk: true,
  ppMode: true,
  wideShots: true,
  blockedShots: true,
  faceoffs: true,
  penalties: true,
  shotMap: true,
  shiftTracking: true,
  momentum: true,
};

export const [MatchFeaturesProvider, useMatchFeatures] = createContextHook(() => {
  const [features, setFeatures] = useState<MatchFeatures>(DEFAULT_FEATURES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const stored = await AsyncStorage.getItem(FEATURES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MatchFeatures>;
        setFeatures({ ...DEFAULT_FEATURES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load match features:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFeatures = async (updated: MatchFeatures) => {
    try {
      await AsyncStorage.setItem(FEATURES_KEY, JSON.stringify(updated));
      setFeatures(updated);
    } catch (error) {
      console.error('Failed to save match features:', error);
    }
  };

  const toggleFeature = useCallback(
    (key: keyof MatchFeatures) => {
      const updated = { ...features, [key]: !features[key] };
      void saveFeatures(updated);
    },
    [features]
  );

  const resetToDefaults = useCallback(() => {
    void saveFeatures(DEFAULT_FEATURES);
  }, []);

  return useMemo(() => ({ features, toggleFeature, resetToDefaults, isLoaded }), [features, toggleFeature, resetToDefaults, isLoaded]);
});
