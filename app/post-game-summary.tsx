import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useHockey } from '@/contexts/hockey-context';
import { useTheme } from '@/contexts/theme-context';
import { calculateMilestones } from '@/utils/milestones';
import { getRatingColor } from '@/constants/ratingColors';
import { Trophy, Star, Target, Shield, Share2, Home, ChevronRight, Award } from 'lucide-react-native';

export default function PostGameSummaryScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { matches, players } = useHockey();
  const { colors } = useTheme();

  const match = useMemo(() => matches.find(m => m.id === matchId), [matches, matchId]);

  const milestones = useMemo(() => {
    const all = calculateMilestones(matches, players);
    if (!match) return [];
    return all.filter(m => m.achieved && m.date && Math.abs(m.date - match.date) < 60000);
  }, [matches, players, match]);

  const playerPerformances = useMemo(() => {
    if (!match) return [];
    return match.roster
      .map(r => {
        const player = players.find(p => p.id === r.playerId);
        if (!player || player.position === 'goalie') return null;

        let goals = 0;
        let assists = 0;
        let plusMinus = 0;
        let shots = 0;
        let shotBlocks = 0;

        match.goals.forEach(g => {
          if (g.scorerId === r.playerId) goals++;
          if (g.assists.includes(r.playerId)) assists++;
          if (g.isOurTeam && g.plusPlayers.includes(r.playerId)) plusMinus++;
          if (!g.isOurTeam && g.minusPlayers.includes(r.playerId)) plusMinus--;
        });

        match.shots.forEach(s => {
          if (s.playerId === r.playerId && s.isOurTeam && s.result !== 'miss') shots++;
          if (s.blockedById === r.playerId) shotBlocks++;
        });

        const points = goals + assists;
        let rating = 6.0;
        if (points >= 4) rating += 2.5;
        else if (points >= 3) rating += 2.0;
        else if (points >= 2) rating += 1.5;
        else if (points >= 1) rating += 0.8;
        else rating -= 0.3;

        if (plusMinus >= 3) rating += 1.5;
        else if (plusMinus >= 2) rating += 1.0;
        else if (plusMinus >= 1) rating += 0.5;
        else if (plusMinus === 0) rating += 0;
        else if (plusMinus === -1) rating -= 0.5;
        else if (plusMinus <= -2) rating -= 1.2;

        if (shotBlocks >= 2) rating += 0.3;

        rating = Math.min(10, Math.max(0, rating));

        return {
          player,
          goals,
          assists,
          points,
          plusMinus,
          shots,
          shotBlocks,
          rating,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.rating - a.rating);
  }, [match, players]);

  const goaliePerf = useMemo(() => {
    if (!match) return null;
    const goalie = players.find(p => p.id === match.activeGoalieId);
    if (!goalie) return null;

    const shotsAgainst = match.opponentShots;
    const goalsAgainst = match.opponentScore;
    const emptyNetGoals = match.goals.filter(g => !g.isOurTeam && g.isEmptyNet).length;
    const adjustedGA = goalsAgainst - emptyNetGoals;
    const adjustedSA = shotsAgainst - emptyNetGoals;
    const saves = adjustedSA - adjustedGA;
    const svPct = adjustedSA > 0 ? (saves / adjustedSA) * 100 : 0;

    return {
      goalie,
      shotsAgainst: adjustedSA,
      saves,
      goalsAgainst: adjustedGA,
      svPct,
    };
  }, [match, players]);

  const topPerformers = useMemo(() => playerPerformances.slice(0, 3), [playerPerformances]);

  const handleShare = useCallback(async () => {
    if (!match) return;
    const isWin = match.ourScore > match.opponentScore;
    const result = isWin ? 'W' : match.ourScore < match.opponentScore ? 'L' : 'D';
    let text = `🏒 ${result} ${match.ourScore}-${match.opponentScore} vs ${match.opponentName}\n\n`;

    if (topPerformers.length > 0) {
      text += '⭐ Top Performers:\n';
      topPerformers.forEach((p, i) => {
        text += `${i + 1}. #${p.player.jerseyNumber} ${p.player.name} - ${p.goals}G ${p.assists}A (${p.rating.toFixed(1)})\n`;
      });
    }

    if (goaliePerf) {
      text += `\n🧤 ${goaliePerf.goalie.name}: ${goaliePerf.saves} saves (${goaliePerf.svPct.toFixed(1)}%)\n`;
    }

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        await Share.share({ message: text });
      }
    } catch (e) {
      console.log('Share error:', e);
    }
  }, [match, topPerformers, goaliePerf]);

  if (!match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={{ color: colors.textSec, fontSize: 16 }}>Match not found</Text>
        </View>
      </View>
    );
  }

  const isWin = match.ourScore > match.opponentScore;
  const isDraw = match.ourScore === match.opponentScore;
  const resultText = isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT';
  const resultColor = isWin ? '#4cd964' : isDraw ? '#ffcc00' : '#ff375f';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.resultSection}>
          <View style={[styles.resultBadge, { backgroundColor: `${resultColor}18` }]}>
            <Text style={[styles.resultText, { color: resultColor }]}>{resultText}</Text>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <Text style={[styles.scoreLabel, { color: colors.textSec }]}>US</Text>
              <Text style={[styles.scoreBig, { color: isWin ? resultColor : colors.text }]}>{match.ourScore}</Text>
            </View>
            <Text style={[styles.scoreDash, { color: colors.textTer }]}>—</Text>
            <View style={styles.scoreTeam}>
              <Text style={[styles.scoreLabel, { color: colors.textSec }]}>{match.opponentName.toUpperCase()}</Text>
              <Text style={[styles.scoreBig, { color: !isWin && !isDraw ? resultColor : colors.text }]}>{match.opponentScore}</Text>
            </View>
          </View>
          <Text style={[styles.dateText, { color: colors.textTer }]}>
            {new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {match.endedAs && match.endedAs !== 'regulation' ? ` · ${match.endedAs.toUpperCase()}` : ''}
          </Text>
        </View>

        <View style={[styles.quickStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: colors.text }]}>{match.ourShots}</Text>
            <Text style={[styles.qStatLbl, { color: colors.textSec }]}>Shots</Text>
          </View>
          <View style={[styles.qDivider, { backgroundColor: colors.border }]} />
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: colors.text }]}>{match.opponentShots}</Text>
            <Text style={[styles.qStatLbl, { color: colors.textSec }]}>Shots Against</Text>
          </View>
          <View style={[styles.qDivider, { backgroundColor: colors.border }]} />
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: colors.text }]}>
              {match.faceoffs ? Math.round(match.faceoffs.filter(f => match.roster.some(r => r.playerId === f.winnerId)).length / Math.max(match.faceoffs.length, 1) * 100) : 0}%
            </Text>
            <Text style={[styles.qStatLbl, { color: colors.textSec }]}>FO%</Text>
          </View>
        </View>

        {milestones.length > 0 && (
          <View style={[styles.milestoneSection, { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.2)' }]}>
            <View style={styles.milestoneSectionHeader}>
              <Trophy color="#FFD700" size={18} />
              <Text style={styles.milestoneSectionTitle}>Milestones Unlocked!</Text>
            </View>
            {milestones.map(m => (
              <View key={m.id} style={styles.milestoneRow}>
                <Award color={m.color} size={16} />
                <Text style={styles.milestoneText}>{m.title}</Text>
                {m.playerName && <Text style={[styles.milestonePlayer, { color: m.color }]}>{m.playerName}</Text>}
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Top Performers</Text>
        {topPerformers.map((p, idx) => (
          <View key={p.player.id} style={[styles.performerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.performerRank}>
              {idx === 0 ? <Star color="#FFD700" size={18} /> : <Text style={[styles.rankText, { color: colors.textTer }]}>{idx + 1}</Text>}
            </View>
            <View style={styles.performerJersey}>
              <Text style={styles.jerseyNum}>{p.player.jerseyNumber}</Text>
            </View>
            <View style={styles.performerInfo}>
              <Text style={[styles.performerName, { color: colors.text }]}>{p.player.name}</Text>
              <View style={styles.performerStats}>
                <Text style={[styles.perfStat, { color: colors.textSec }]}>{p.goals}G</Text>
                <Text style={[styles.perfStat, { color: colors.textSec }]}>{p.assists}A</Text>
                <Text style={[styles.perfStat, { color: p.plusMinus > 0 ? '#34C759' : p.plusMinus < 0 ? '#FF3B30' : colors.textSec }]}>
                  {p.plusMinus > 0 ? '+' : ''}{p.plusMinus}
                </Text>
                <Text style={[styles.perfStat, { color: colors.textSec }]}>{p.shots}S</Text>
              </View>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(p.rating) }]}>
              <Text style={styles.ratingText}>{p.rating.toFixed(1)}</Text>
            </View>
          </View>
        ))}

        {goaliePerf && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Goaltending</Text>
            <View style={[styles.goalieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.goalieHeader}>
                <Shield color="#5ac8fa" size={18} />
                <Text style={[styles.goalieName, { color: colors.text }]}>
                  #{goaliePerf.goalie.jerseyNumber} {goaliePerf.goalie.name}
                </Text>
              </View>
              <View style={styles.goalieStatsRow}>
                <View style={styles.goalieStat}>
                  <Text style={[styles.goalieStatVal, { color: colors.text }]}>{goaliePerf.saves}</Text>
                  <Text style={[styles.goalieStatLbl, { color: colors.textSec }]}>Saves</Text>
                </View>
                <View style={styles.goalieStat}>
                  <Text style={[styles.goalieStatVal, { color: colors.text }]}>{goaliePerf.goalsAgainst}</Text>
                  <Text style={[styles.goalieStatLbl, { color: colors.textSec }]}>GA</Text>
                </View>
                <View style={styles.goalieStat}>
                  <Text style={[styles.goalieStatVal, { color: goaliePerf.svPct >= 90 ? '#34C759' : goaliePerf.svPct >= 85 ? '#FF9500' : '#FF3B30' }]}>
                    {goaliePerf.svPct.toFixed(1)}%
                  </Text>
                  <Text style={[styles.goalieStatLbl, { color: colors.textSec }]}>SV%</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleShare}>
            <Share2 color={colors.accent} size={18} />
            <Text style={[styles.actionBtnText, { color: colors.accent }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/match-detail', params: { matchId: match.id } } as never)}
          >
            <Target color={colors.accent} size={18} />
            <Text style={[styles.actionBtnText, { color: colors.accent }]}>Full Detail</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.homeBtn, { backgroundColor: '#248a3d' }]}
          onPress={() => router.replace('/')}
          activeOpacity={0.8}
        >
          <Home color="#fff" size={20} />
          <Text style={styles.homeBtnText}>Back to Home</Text>
          <ChevronRight color="rgba(255,255,255,0.5)" size={18} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingTop: 60,
  },
  resultSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  scoreTeam: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    marginBottom: 4,
    maxWidth: 100,
  },
  scoreBig: {
    fontSize: 52,
    fontWeight: '800' as const,
    lineHeight: 56,
  },
  scoreDash: {
    fontSize: 28,
    fontWeight: '300' as const,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  quickStats: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  qStat: {
    flex: 1,
    alignItems: 'center',
  },
  qStatVal: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  qStatLbl: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  qDivider: {
    width: 1,
    height: 32,
    alignSelf: 'center' as const,
  },
  milestoneSection: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  milestoneSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  milestoneSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  milestoneText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFD700',
    flex: 1,
  },
  milestonePlayer: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  performerRank: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  performerJersey: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyNum: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  performerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  perfStat: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  goalieCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  goalieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  goalieName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  goalieStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalieStat: {
    alignItems: 'center',
  },
  goalieStatVal: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  goalieStatLbl: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    flex: 1,
    textAlign: 'center' as const,
  },
});
