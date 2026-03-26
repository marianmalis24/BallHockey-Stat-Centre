import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useHockey } from '@/contexts/hockey-context';
import { useTheme } from '@/contexts/theme-context';
import { getRatingColor } from '@/constants/ratingColors';
import { ChevronLeft, Star, Shield, Crosshair, Swords, Target, Award, TrendingUp } from 'lucide-react-native';
import { Match } from '@/types/hockey';


interface StarPlayer {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  isGoalie: boolean;
  rating: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  shots: number;
  shotBlocks: number;
  penaltyMinutes: number;
  faceoffWins: number;
  faceoffLosses: number;
  saves?: number;
  goalsAgainst?: number;
  svPct?: number;
  shotsAgainst?: number;
  reasons: string[];
}

const STAR_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

const STAR_BG = ['rgba(255,215,0,0.10)', 'rgba(192,192,192,0.08)', 'rgba(205,127,50,0.08)'] as const;
const STAR_BORDER = ['rgba(255,215,0,0.25)', 'rgba(192,192,192,0.20)', 'rgba(205,127,50,0.20)'] as const;

function generateReasons(p: StarPlayer, match: Match, allPlayers: StarPlayer[]): string[] {
  const reasons: string[] = [];

  if (p.isGoalie) {
    if ((p.svPct ?? 0) >= 95) reasons.push(`Outstanding ${p.svPct?.toFixed(1)}% save percentage`);
    else if ((p.svPct ?? 0) >= 90) reasons.push(`Strong ${p.svPct?.toFixed(1)}% save percentage`);
    else if ((p.svPct ?? 0) > 0) reasons.push(`${p.svPct?.toFixed(1)}% SV%`);

    if ((p.saves ?? 0) >= 30) reasons.push(`${p.saves} saves — heavy workload`);
    else if ((p.saves ?? 0) >= 20) reasons.push(`${p.saves} saves`);
    else if ((p.saves ?? 0) > 0) reasons.push(`${p.saves} saves`);

    if ((p.goalsAgainst ?? 0) === 0) reasons.push('Shutout performance');
    else if ((p.goalsAgainst ?? 0) <= 1) reasons.push('Allowed only 1 goal');

    return reasons.length > 0 ? reasons : ['Solid goaltending'];
  }

  if (p.goals >= 3) reasons.push('Hat trick!');
  else if (p.goals === 2) reasons.push('2 goals scored');
  else if (p.goals === 1) reasons.push('1 goal scored');

  if (p.assists >= 3) reasons.push(`${p.assists} assists — playmaker`);
  else if (p.assists === 2) reasons.push('2 assists');
  else if (p.assists === 1) reasons.push('1 assist');

  if (p.points >= 4) reasons.push(`${p.points}-point game`);

  const skaters = allPlayers.filter(s => !s.isGoalie);
  const bestPM = Math.max(...skaters.map(s => s.plusMinus));
  if (p.plusMinus > 0 && p.plusMinus === bestPM) {
    reasons.push(`Best +/- on team (+${p.plusMinus})`);
  } else if (p.plusMinus > 0) {
    reasons.push(`+${p.plusMinus} plus/minus`);
  }

  if (p.shotBlocks >= 4) reasons.push(`${p.shotBlocks} shot blocks — wall`);
  else if (p.shotBlocks >= 2) reasons.push(`${p.shotBlocks} shot blocks`);

  const foTotal = p.faceoffWins + p.faceoffLosses;
  if (foTotal >= 5) {
    const foPct = (p.faceoffWins / foTotal) * 100;
    if (foPct >= 60) reasons.push(`${foPct.toFixed(0)}% face-off win rate`);
  }

  if (p.shots >= 5) reasons.push(`${p.shots} shots on goal — active shooter`);
  else if (p.shots >= 3) reasons.push(`${p.shots} shots on goal`);

  const bestRating = Math.max(...skaters.map(s => s.rating));
  if (p.rating === bestRating && skaters.filter(s => s.rating === bestRating).length === 1) {
    reasons.push('Highest rated player');
  }

  return reasons.length > 0 ? reasons : ['Solid overall performance'];
}

function getOnIceShots(match: Match, playerId: string): { shotsFor: number; shotsAgainst: number } {
  let shotsFor = 0;
  let shotsAgainst = 0;
  if (!match.lines || !match.shifts || match.shifts.length === 0) return { shotsFor, shotsAgainst };
  const playerLineIds = match.lines.filter(l => l.playerIds.includes(playerId)).map(l => l.id);
  if (playerLineIds.length === 0) return { shotsFor, shotsAgainst };
  const playerShifts = match.shifts.filter(s => playerLineIds.includes(s.lineId));
  if (playerShifts.length === 0) return { shotsFor, shotsAgainst };
  match.shots.forEach(shot => {
    const duringShift = playerShifts.some(s => {
      const end = s.endTime ?? Date.now();
      return shot.timestamp >= s.startTime && shot.timestamp <= end;
    });
    if (duringShift) {
      if (shot.isOurTeam) shotsFor++;
      else shotsAgainst++;
    }
  });
  return { shotsFor, shotsAgainst };
}

function calculateSkaterRating(
  goals: number, assists: number, plusMinus: number, shotPct: number,
  possGains: number, possLosses: number, pim: number,
  foWins: number, foLosses: number, shots: number, position: string,
  shotBlocks: number, onIceSF: number, onIceSA: number
): number {
  let rating = 6.0;
  const points = goals + assists;
  if (points >= 4) rating += 2.5;
  else if (points >= 3) rating += 2.0;
  else if (points >= 2) rating += 1.5;
  else if (points >= 1) rating += 0.8;
  else rating -= 0.3;

  if (plusMinus >= 3) rating += 1.5;
  else if (plusMinus >= 2) rating += 1.0;
  else if (plusMinus >= 1) rating += 0.5;
  else if (plusMinus === -1) rating -= 0.5;
  else if (plusMinus === -2) rating -= 1.2;
  else if (plusMinus <= -3) rating -= 2.0;

  if (shots > 0) {
    if (shotPct >= 30) rating += 0.8;
    else if (shotPct >= 20) rating += 0.5;
    else if (shotPct >= 10) rating += 0.2;
    else if (shotPct < 10 && shots >= 5) rating -= 0.3;
  }

  if (possGains + possLosses > 0) {
    const ratio = possGains / (possGains + possLosses);
    if (ratio >= 0.7) rating += 0.5;
    else if (ratio >= 0.6) rating += 0.3;
    else if (ratio < 0.4) rating -= 0.3;
  }

  if (pim >= 10) rating -= 2.5;
  else if (pim >= 6) rating -= 1.8;
  else if (pim >= 4) rating -= 1.2;
  else if (pim >= 2) rating -= 0.7;

  const foTotal = foWins + foLosses;
  if (foTotal >= 5) {
    const foPct = (foWins / foTotal) * 100;
    if (foPct >= 60) rating += 0.6;
    else if (foPct >= 55) rating += 0.3;
    else if (foPct < 40) rating -= 0.4;
  }

  if (shotBlocks >= 4) rating += 0.6;
  else if (shotBlocks >= 2) rating += 0.3;
  else if (shotBlocks > 0) rating += 0.15;

  const totalOnIce = onIceSF + onIceSA;
  if (totalOnIce >= 4) {
    const corsi = onIceSF / totalOnIce;
    if (corsi >= 0.65) rating += 0.6;
    else if (corsi >= 0.55) rating += 0.3;
    else if (corsi >= 0.45) rating += 0.0;
    else if (corsi >= 0.35) rating -= 0.3;
    else rating -= 0.5;
  }

  return Math.min(10, Math.max(0, rating));
}

function calculateGoalieRating(svPct: number, saves: number, goalsAgainst: number): number {
  let rating = 6.0;
  if (svPct >= 95) rating += 2.5;
  else if (svPct >= 93) rating += 2.0;
  else if (svPct >= 90) rating += 1.5;
  else if (svPct >= 88) rating += 1.0;
  else if (svPct >= 85) rating += 0.3;
  else if (svPct >= 80) rating -= 0.5;
  else rating -= 1.5;

  if (saves >= 35) rating += 0.8;
  else if (saves >= 25) rating += 0.4;

  if (goalsAgainst === 0) rating += 1.0;
  else if (goalsAgainst === 1) rating += 0.3;
  else if (goalsAgainst >= 5) rating -= 0.5;

  return Math.min(10, Math.max(0, rating));
}

export default function ThreeStarsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { matches, players } = useHockey();
  const { colors } = useTheme();

  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(40), new Animated.Value(40), new Animated.Value(40)]).current;

  const match = useMemo(() => matches.find(m => m.id === matchId), [matches, matchId]);

  const threeStars = useMemo((): StarPlayer[] => {
    if (!match) return [];

    const candidates: StarPlayer[] = [];

    match.roster.forEach(r => {
      const player = players.find(p => p.id === r.playerId);
      if (!player) return;

      if (player.position === 'goalie') {
        const shotsAgainst = match.opponentShots;
        const goalsAgainst = match.opponentScore;
        const emptyNetGoals = match.goals.filter(g => !g.isOurTeam && g.isEmptyNet).length;
        const adjGA = goalsAgainst - emptyNetGoals;
        const adjSA = shotsAgainst - emptyNetGoals;
        const saves = adjSA - adjGA;
        const svPct = adjSA > 0 ? (saves / adjSA) * 100 : 0;

        if (player.id === match.activeGoalieId) {
          candidates.push({
            id: player.id,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            position: 'Goalie',
            isGoalie: true,
            rating: calculateGoalieRating(svPct, saves, adjGA),
            goals: 0, assists: 0, points: 0, plusMinus: 0,
            shots: 0, shotBlocks: 0, penaltyMinutes: 0,
            faceoffWins: 0, faceoffLosses: 0,
            saves, goalsAgainst: adjGA, svPct, shotsAgainst: adjSA,
            reasons: [],
          });
        }
        return;
      }

      let goals = 0, assists = 0, plusMinus = 0, shots = 0, shotBlocks = 0, pim = 0;
      let possGains = 0, possLosses = 0, foWins = 0, foLosses = 0;

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

      match.penalties.forEach(pen => {
        if (pen.playerId === r.playerId) pim += pen.minutes;
      });

      match.possessions.forEach(poss => {
        if (poss.playerId === r.playerId) {
          if (poss.type === 'gain') possGains++;
          else possLosses++;
        }
      });

      if (match.faceoffs) {
        match.faceoffs.forEach(f => {
          if (f.winnerId === r.playerId) foWins++;
          if (f.loserId === r.playerId) foLosses++;
        });
      }

      const shotPct = shots > 0 ? (goals / shots) * 100 : 0;
      const { shotsFor: onIceSF, shotsAgainst: onIceSA } = getOnIceShots(match, r.playerId);

      const rating = calculateSkaterRating(
        goals, assists, plusMinus, shotPct, possGains, possLosses,
        pim, foWins, foLosses, shots, player.position, shotBlocks, onIceSF, onIceSA
      );

      candidates.push({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position === 'forward' ? 'Forward' : 'Defense',
        isGoalie: false,
        rating, goals, assists, points: goals + assists,
        plusMinus, shots, shotBlocks, penaltyMinutes: pim,
        faceoffWins: foWins, faceoffLosses: foLosses,
        reasons: [],
      });
    });

    candidates.sort((a, b) => b.rating - a.rating);
    const top3 = candidates.slice(0, 3);
    top3.forEach(p => {
      p.reasons = generateReasons(p, match, candidates);
    });
    return top3;
  }, [match, players]);

  useEffect(() => {
    const animations = threeStars.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 500,
          delay: i * 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[i], {
          toValue: 0,
          duration: 500,
          delay: i * 200,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(100, animations).start();
  }, [threeStars, fadeAnims, slideAnims]);

  if (!match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Stack.Screen
          options={{
            title: '3 Stars',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft color={colors.accent} size={28} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.center}>
          <Text style={{ color: colors.textSec, fontSize: 16 }}>Match not found</Text>
        </View>
      </View>
    );
  }

  const isWin = match.ourScore > match.opponentScore;
  const isDraw = match.ourScore === match.opponentScore;
  const resultColor = isWin ? colors.positive : isDraw ? colors.warning : colors.negative;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButtonCircle}>
              <ChevronLeft color="#fff" size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.starsRow}>
            <Star color="#FFD700" size={16} fill="#FFD700" />
            <Star color="#FFD700" size={20} fill="#FFD700" />
            <Star color="#FFD700" size={16} fill="#FFD700" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Three Stars</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textTer }]}>
            vs {match.opponentName}
          </Text>
          <View style={styles.heroScoreRow}>
            <Text style={[styles.heroScore, { color: resultColor }]}>{match.ourScore}</Text>
            <Text style={[styles.heroDash, { color: colors.textTer }]}>–</Text>
            <Text style={[styles.heroScore, { color: colors.textSec }]}>{match.opponentScore}</Text>
          </View>
        </View>

        {threeStars.map((star, idx) => (
          <Animated.View
            key={star.id}
            style={[
              styles.starCard,
              {
                backgroundColor: STAR_BG[idx],
                borderColor: STAR_BORDER[idx],
                opacity: fadeAnims[idx],
                transform: [{ translateY: slideAnims[idx] }],
              },
            ]}
          >
            <View style={styles.starCardHeader}>
              <View style={[styles.starBadge, { backgroundColor: STAR_COLORS[idx] }]}>
                <Star color="#fff" size={14} fill="#fff" />
                <Text style={styles.starBadgeText}>{idx + 1}</Text>
              </View>

              <View style={styles.starPlayerInfo}>
                <View style={styles.starNameRow}>
                  <View style={[styles.jerseyCircle, { borderColor: STAR_COLORS[idx] }]}>
                    <Text style={[styles.jerseyText, { color: STAR_COLORS[idx] }]}>
                      {star.jerseyNumber}
                    </Text>
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={[styles.starName, { color: colors.text }]}>{star.name}</Text>
                    <Text style={[styles.starPosition, { color: colors.textTer }]}>{star.position}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.ratingPill, { backgroundColor: getRatingColor(star.rating) }]}>
                <Text style={styles.ratingValue}>{star.rating.toFixed(1)}</Text>
              </View>
            </View>

            {star.isGoalie ? (
              <View style={styles.statsRow}>
                <View style={styles.miniStat}>
                  <Shield color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.saves}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>SVS</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <Target color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.goalsAgainst}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>GA</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <TrendingUp color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.svPct?.toFixed(1)}%</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>SV%</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <Crosshair color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.shotsAgainst}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>SA</Text>
                </View>
              </View>
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.miniStat}>
                  <Target color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.goals}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>G</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <Swords color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.assists}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>A</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <TrendingUp color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: star.plusMinus > 0 ? colors.positive : star.plusMinus < 0 ? colors.negative : colors.text }]}>
                    {star.plusMinus > 0 ? '+' : ''}{star.plusMinus}
                  </Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>+/-</Text>
                </View>
                <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                <View style={styles.miniStat}>
                  <Crosshair color={STAR_COLORS[idx]} size={14} />
                  <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.shots}</Text>
                  <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>SOG</Text>
                </View>
                {star.shotBlocks > 0 && (
                  <>
                    <View style={[styles.miniDivider, { backgroundColor: STAR_BORDER[idx] }]} />
                    <View style={styles.miniStat}>
                      <Shield color={STAR_COLORS[idx]} size={14} />
                      <Text style={[styles.miniStatValue, { color: colors.text }]}>{star.shotBlocks}</Text>
                      <Text style={[styles.miniStatLabel, { color: colors.textTer }]}>BLK</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={styles.reasonsSection}>
              {star.reasons.map((reason, rIdx) => (
                <View key={rIdx} style={[styles.reasonPill, { backgroundColor: `${STAR_COLORS[idx]}12`, borderColor: `${STAR_COLORS[idx]}30` }]}>
                  <Award color={STAR_COLORS[idx]} size={12} />
                  <Text style={[styles.reasonText, { color: STAR_COLORS[idx] }]}>{reason}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        {threeStars.length === 0 && (
          <View style={styles.emptyState}>
            <Star color={colors.textTer} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stars Available</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSec }]}>
              Not enough player data to determine the 3 stars.
            </Text>
          </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingTop: 100,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroScore: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  heroDash: {
    fontSize: 20,
    fontWeight: '300' as const,
  },
  starCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  starCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 12,
    gap: 2,
  },
  starBadgeText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#fff',
  },
  starPlayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  starNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jerseyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyText: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  nameBlock: {
    flex: 1,
  },
  starName: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  starPosition: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  ratingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  miniDivider: {
    width: 1,
    height: 28,
  },
  reasonsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
