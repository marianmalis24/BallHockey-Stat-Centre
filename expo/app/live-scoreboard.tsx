import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wifi, WifiOff, Target, RefreshCw } from 'lucide-react-native';
import { fetchScoreboard, LiveScoreboardData } from '@/utils/live-scoreboard-sync';

const POLL_INTERVAL = 5000;

export default function LiveScoreboardScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const insets = useSafeAreaInsets();

  const [shareCode, setShareCode] = useState(code || '');
  const [inputCode, setInputCode] = useState('');
  const [data, setData] = useState<LiveScoreboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const loadData = useCallback(async (codeToFetch: string) => {
    if (!codeToFetch) return;

    const result = await fetchScoreboard(codeToFetch.toUpperCase());
    if (result) {
      setData((prev) => {
        if (prev && (prev.our_score !== result.our_score || prev.opponent_score !== result.opponent_score ||
            prev.our_shots !== result.our_shots || prev.opponent_shots !== result.opponent_shots)) {
          startPulse();
        }
        return result;
      });
      setConnected(true);
      setError(null);
      setLastUpdate(new Date());
    } else {
      setConnected(false);
      setError('Could not find scoreboard. Check the code and try again.');
    }
  }, [startPulse]);

  const handleConnect = useCallback(async () => {
    const codeToUse = inputCode.trim().toUpperCase();
    if (codeToUse.length < 4) return;

    setShareCode(codeToUse);
    setLoading(true);
    setError(null);

    await loadData(codeToUse);
    setLoading(false);
  }, [inputCode, loadData]);

  useEffect(() => {
    if (code) {
      setShareCode(code);
      setLoading(true);
      void loadData(code).finally(() => setLoading(false));
    }
  }, [code, loadData]);

  useEffect(() => {
    if (shareCode && connected) {
      intervalRef.current = setInterval(() => {
        void loadData(shareCode);
      }, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shareCode, connected, loadData]);

  const periodLabel = data
    ? data.is_overtime
      ? `OT${data.current_period - 3 > 0 ? data.current_period - 3 : ''}`
      : `P${data.current_period}`
    : '';

  const foPct = data && data.fo_total > 0 ? Math.round((data.fo_wins / data.fo_total) * 100) : 0;

  if (!shareCode || (!data && !loading)) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.joinContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.joinIcon}>
            <Target color="#0af" size={36} />
          </View>
          <Text style={styles.joinTitle}>Live Scoreboard</Text>
          <Text style={styles.joinSubtitle}>
            Enter the share code to watch a game live
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              value={inputCode}
              onChangeText={(t) => setInputCode(t.toUpperCase())}
              placeholder="ENTER CODE"
              placeholderTextColor="#3a3a3c"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="share-code-input"
            />
            <TouchableOpacity
              style={[styles.connectBtn, inputCode.trim().length < 4 && styles.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={inputCode.trim().length < 4 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.connectBtnText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0af" size="large" />
          <Text style={styles.loadingText}>Connecting to scoreboard...</Text>
        </View>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.liveHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.liveIndicatorRow}>
          <View style={[styles.liveDot, connected ? styles.liveDotOn : styles.liveDotOff]} />
          <Text style={[styles.liveText, connected ? styles.liveTextOn : styles.liveTextOff]}>
            {connected ? 'LIVE' : 'DISCONNECTED'}
          </Text>
          {connected ? (
            <Wifi color="#4cd964" size={14} />
          ) : (
            <WifiOff color="#ff375f" size={14} />
          )}
          <View style={{ flex: 1 }} />
          {!data.is_active && (
            <View style={styles.endedBadge}>
              <Text style={styles.endedText}>FINAL</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.scoreboardWrap}>
        <Text style={styles.vsLabel}>vs {data.opponent_name}</Text>

        <Animated.View style={[styles.scoreRow, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.teamBlock}>
            <Text style={styles.teamLabel}>US</Text>
            <Text style={styles.bigScore}>{data.our_score}</Text>
          </View>

          <View style={styles.midBlock}>
            <View style={styles.periodPill}>
              <Text style={styles.periodText}>{periodLabel}</Text>
            </View>
            {data.game_state !== 'even' && (
              <View style={[
                styles.statePill,
                data.game_state === 'pp' ? styles.statePillPP : styles.statePillSH,
              ]}>
                <Text style={styles.stateText}>
                  {data.game_state === 'pp' ? 'PP' : 'SH'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.teamBlock}>
            <Text style={styles.teamLabel}>OPP</Text>
            <Text style={styles.bigScore}>{data.opponent_score}</Text>
          </View>
        </Animated.View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data.our_shots}</Text>
            <Text style={styles.statLabel}>Our Shots</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data.opponent_shots}</Text>
            <Text style={styles.statLabel}>Opp Shots</Text>
          </View>
          {data.fo_total > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: foPct >= 50 ? '#4cd964' : '#ff375f' }]}>
                  {foPct}%
                </Text>
                <Text style={styles.statLabel}>FO%</Text>
              </View>
            </>
          )}
        </View>

        {data.our_shots + data.opponent_shots > 0 && (
          <View style={styles.shotBarWrap}>
            <View style={styles.shotBarBg}>
              <View
                style={[
                  styles.shotBarFill,
                  {
                    width: `${Math.round((data.our_shots / (data.our_shots + data.opponent_shots)) * 100)}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.shotBarLabels}>
              <Text style={styles.shotBarLabel}>Shots</Text>
              <Text style={styles.shotBarLabel}>
                {data.our_shots} - {data.opponent_shots}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {lastUpdate && (
          <View style={styles.updateRow}>
            <RefreshCw color="#3a3a3c" size={12} />
            <Text style={styles.updateText}>
              Updated {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        )}
        <Text style={styles.codeFooter}>Code: {shareCode}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  joinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  joinIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(0,170,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  joinTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#e8eaed',
    marginBottom: 8,
  },
  joinSubtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#636366',
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#12162a',
    borderRadius: 14,
    padding: 16,
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#e8eaed',
    textAlign: 'center' as const,
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: '#1a1e32',
  },
  connectBtn: {
    backgroundColor: '#0a84ff',
    borderRadius: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnDisabled: {
    opacity: 0.4,
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  errorText: {
    fontSize: 13,
    color: '#ff375f',
    marginTop: 16,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#636366',
  },

  liveHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  liveDotOn: {
    backgroundColor: '#4cd964',
  },
  liveDotOff: {
    backgroundColor: '#ff375f',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  liveTextOn: {
    color: '#4cd964',
  },
  liveTextOff: {
    color: '#ff375f',
  },
  endedBadge: {
    backgroundColor: 'rgba(255,55,95,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,55,95,0.3)',
  },
  endedText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#ff375f',
    letterSpacing: 1,
  },

  scoreboardWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  vsLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#4a4a4e',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#4a4a4e',
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  bigScore: {
    fontSize: 72,
    fontWeight: '900' as const,
    color: '#e8eaed',
    lineHeight: 80,
  },
  midBlock: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  periodPill: {
    backgroundColor: 'rgba(0,170,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,170,255,0.25)',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#0af',
  },
  statePill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statePillPP: {
    backgroundColor: '#FF9500',
  },
  statePillSH: {
    backgroundColor: '#FF3B30',
  },
  stateText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#fff',
  },

  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12162a',
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#1a1e32',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#e8eaed',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#636366',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(142,142,147,0.2)',
  },

  shotBarWrap: {
    marginTop: 4,
  },
  shotBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff375f',
    overflow: 'hidden',
  },
  shotBarFill: {
    height: '100%',
    backgroundColor: '#0a84ff',
    borderRadius: 3,
  },
  shotBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  shotBarLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#636366',
  },

  footer: {
    alignItems: 'center',
    paddingBottom: 32,
    gap: 8,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateText: {
    fontSize: 11,
    color: '#3a3a3c',
    fontWeight: '500' as const,
  },
  codeFooter: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#2c2c2e',
    letterSpacing: 1,
  },
});
