import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { useHockey } from '@/contexts/hockey-context';
import { useTheme } from '@/contexts/theme-context';
import { Users, TrendingUp, TrendingDown } from 'lucide-react-native';

interface ChemistryPair {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Num: number;
  player2Num: number;
  goalsFor: number;
  goalsAgainst: number;
  plusMinus: number;
  gamesPlayed: number;
}

export default function TeamChemistryScreen() {
  const { matches, players } = useHockey();
  const { colors } = useTheme();

  const chemistryPairs = useMemo((): ChemistryPair[] => {
    const completed = matches.filter(m => !m.isActive);
    const pairMap = new Map<string, ChemistryPair>();
    const pairGames = new Map<string, Set<string>>();

    completed.forEach(m => {
      m.goals.forEach(g => {
        const onIcePlayers = g.isOurTeam ? g.plusPlayers : g.minusPlayers;
        if (onIcePlayers.length < 2) return;

        for (let i = 0; i < onIcePlayers.length; i++) {
          for (let j = i + 1; j < onIcePlayers.length; j++) {
            const [id1, id2] = [onIcePlayers[i], onIcePlayers[j]].sort();
            const key = `${id1}_${id2}`;

            if (!pairMap.has(key)) {
              const p1 = players.find(p => p.id === id1);
              const p2 = players.find(p => p.id === id2);
              if (!p1 || !p2 || p1.position === 'goalie' || p2.position === 'goalie') continue;
              pairMap.set(key, {
                player1Id: id1,
                player2Id: id2,
                player1Name: p1.name,
                player2Name: p2.name,
                player1Num: p1.jerseyNumber,
                player2Num: p2.jerseyNumber,
                goalsFor: 0,
                goalsAgainst: 0,
                plusMinus: 0,
                gamesPlayed: 0,
              });
              pairGames.set(key, new Set());
            }

            const pair = pairMap.get(key)!;
            const games = pairGames.get(key)!;
            games.add(m.id);

            if (g.isOurTeam) {
              pair.goalsFor++;
              pair.plusMinus++;
            } else {
              pair.goalsAgainst++;
              pair.plusMinus--;
            }
          }
        }
      });
    });

    for (const [key, pair] of pairMap) {
      pair.gamesPlayed = pairGames.get(key)?.size ?? 0;
    }

    return Array.from(pairMap.values())
      .filter(p => p.goalsFor + p.goalsAgainst >= 2)
      .sort((a, b) => b.plusMinus - a.plusMinus);
  }, [matches, players]);

  const bestPairs = useMemo(() => chemistryPairs.filter(p => p.plusMinus > 0).slice(0, 10), [chemistryPairs]);
  const worstPairs = useMemo(() => {
    return [...chemistryPairs].filter(p => p.plusMinus < 0).sort((a, b) => a.plusMinus - b.plusMinus).slice(0, 10);
  }, [chemistryPairs]);

  const renderPairCard = (pair: ChemistryPair, index: number) => {
    const pmColor = pair.plusMinus > 0 ? '#34C759' : pair.plusMinus < 0 ? '#FF3B30' : colors.textSec;
    return (
      <View key={`${pair.player1Id}_${pair.player2Id}`} style={[styles.pairCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pairRank}>
          <Text style={[styles.rankNum, { color: colors.textTer }]}>{index + 1}</Text>
        </View>
        <View style={styles.pairPlayers}>
          <View style={styles.pairRow}>
            <View style={styles.jerseyBadge}>
              <Text style={styles.jerseyText}>{pair.player1Num}</Text>
            </View>
            <Text style={[styles.pairName, { color: colors.text }]} numberOfLines={1}>{pair.player1Name}</Text>
          </View>
          <View style={styles.pairRow}>
            <View style={styles.jerseyBadge}>
              <Text style={styles.jerseyText}>{pair.player2Num}</Text>
            </View>
            <Text style={[styles.pairName, { color: colors.text }]} numberOfLines={1}>{pair.player2Name}</Text>
          </View>
        </View>
        <View style={styles.pairStats}>
          <Text style={[styles.pairPM, { color: pmColor }]}>
            {pair.plusMinus > 0 ? '+' : ''}{pair.plusMinus}
          </Text>
          <Text style={[styles.pairGF, { color: colors.textSec }]}>{pair.goalsFor}GF {pair.goalsAgainst}GA</Text>
          <Text style={[styles.pairGP, { color: colors.textTer }]}>{pair.gamesPlayed}GP</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: 'Team Chemistry' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {chemistryPairs.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={colors.textTer} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Chemistry Data</Text>
            <Text style={[styles.emptyText, { color: colors.textSec }]}>
              Play more matches to see which player combinations work best together
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Users color={colors.accent} size={20} />
              <Text style={[styles.infoText, { color: colors.textSec }]}>
                Chemistry is based on combined +/- when both players are on ice during goals.
                Pairs with at least 2 on-ice events are shown.
              </Text>
            </View>

            {bestPairs.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <TrendingUp color="#34C759" size={18} />
                  <Text style={[styles.sectionTitle, { color: '#34C759' }]}>Best Combinations</Text>
                </View>
                {bestPairs.map((pair, i) => renderPairCard(pair, i))}
              </>
            )}

            {worstPairs.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <TrendingDown color="#FF3B30" size={18} />
                  <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Needs Work</Text>
                </View>
                {worstPairs.map((pair, i) => renderPairCard(pair, i))}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  pairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 10,
  },
  pairRank: {
    width: 22,
    alignItems: 'center',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  pairPlayers: {
    flex: 1,
    gap: 4,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jerseyBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  pairName: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  pairStats: {
    alignItems: 'flex-end',
  },
  pairPM: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  pairGF: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  pairGP: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
});
