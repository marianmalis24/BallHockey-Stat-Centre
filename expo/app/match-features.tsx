import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Crosshair,
  Zap,
  CircleOff,
  ShieldBan,
  Target,
  AlertTriangle,
  Map,
  Users,
  TrendingUp,
  RotateCcw,
} from 'lucide-react-native';
import { useMatchFeatures, MatchFeatures } from '@/contexts/match-features-context';

interface FeatureItem {
  key: keyof MatchFeatures;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const FEATURE_LIST: FeatureItem[] = [
  {
    key: 'shotRisk',
    label: 'Shot Danger Rating',
    description: 'Track low/medium/high danger on opponent shots',
    icon: <Crosshair size={20} color="#FF9500" />,
    color: '#FF9500',
  },
  {
    key: 'ppMode',
    label: 'PP / SH Mode',
    description: 'Track power play and shorthanded game states',
    icon: <Zap size={20} color="#FF3B30" />,
    color: '#FF3B30',
  },
  {
    key: 'wideShots',
    label: 'Wide Shots',
    description: 'Track shots that miss the net',
    icon: <CircleOff size={20} color="#636366" />,
    color: '#636366',
  },
  {
    key: 'blockedShots',
    label: 'Blocked Shots',
    description: 'Track shots blocked by your players',
    icon: <ShieldBan size={20} color="#5856D6" />,
    color: '#5856D6',
  },
  {
    key: 'faceoffs',
    label: 'Faceoffs',
    description: 'Track faceoff wins and losses',
    icon: <Target size={20} color="#34C759" />,
    color: '#34C759',
  },
  {
    key: 'penalties',
    label: 'Penalties (PIM)',
    description: 'Track penalty minutes per player',
    icon: <AlertTriangle size={20} color="#FF2D55" />,
    color: '#FF2D55',
  },
  {
    key: 'shotMap',
    label: 'Shot Map',
    description: 'Record shot locations on the rink diagram',
    icon: <Map size={20} color="#007AFF" />,
    color: '#007AFF',
  },
  {
    key: 'shiftTracking',
    label: 'Shift Tracking',
    description: 'Track line shifts and time on ice',
    icon: <Users size={20} color="#5ac8fa" />,
    color: '#5ac8fa',
  },
  {
    key: 'momentum',
    label: 'Momentum Indicator',
    description: 'Visual momentum tracker during the match',
    icon: <TrendingUp size={20} color="#AF52DE" />,
    color: '#AF52DE',
  },
];

export default function MatchFeaturesScreen() {
  const { features, toggleFeature, resetToDefaults } = useMatchFeatures();

  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Match Features' }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Active Features</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryCount}>{enabledCount}</Text>
            <Text style={styles.summaryTotal}>/ {FEATURE_LIST.length}</Text>
          </View>
          <Text style={styles.summaryHint}>
            Toggle features on or off for your next match. Disabled features won't appear during gameplay.
          </Text>
        </View>

        <View style={styles.featuresList}>
          {FEATURE_LIST.map((item) => {
            const isEnabled = features[item.key];
            return (
              <View key={item.key} style={[styles.featureCard, !isEnabled && styles.featureCardDisabled]}>
                <View style={[styles.featureIcon, { backgroundColor: isEnabled ? `${item.color}20` : '#f0f0f0' }]}>
                  {item.icon}
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureLabel, !isEnabled && styles.featureLabelDisabled]}>
                    {item.label}
                  </Text>
                  <Text style={styles.featureDesc}>{item.description}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleFeature(item.key)}
                  trackColor={{ false: '#e5e5ea', true: item.color }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  ios_backgroundColor="#e5e5ea"
                />
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults} activeOpacity={0.7}>
          <RotateCcw size={16} color="#FF3B30" />
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: '#007AFF',
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#8e8e93',
    marginLeft: 4,
  },
  summaryHint: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
  },
  featuresList: {
    gap: 10,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  featureCardDisabled: {
    opacity: 0.7,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
    marginRight: 12,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
    marginBottom: 2,
  },
  featureLabelDisabled: {
    color: '#8e8e93',
  },
  featureDesc: {
    fontSize: 12,
    color: '#8e8e93',
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
});
