import { Match, Player, GameState } from '@/types/hockey';
import { X, Target, Trophy, Users } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';

interface PeriodSummaryModalProps {
  visible: boolean;
  match: Match | null;
  players: Player[];
  onClose: () => void;
  onNextPeriod: () => void;
  onEndAsDraw?: () => void;
  onStartOvertime?: () => void;
  onStartShootout?: () => void;
  onContinueOvertime?: () => void;
}

const { width } = Dimensions.get('window');
const NET_WIDTH = width - 64;
const NET_HEIGHT = NET_WIDTH * 0.6;

export function PeriodSummaryModal({
  visible,
  match,
  players,
  onClose,
  onNextPeriod,
  onEndAsDraw,
  onStartOvertime,
  onStartShootout,
  onContinueOvertime,
}: PeriodSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'shots' | 'players'>('overview');
  const [showFullMatch, setShowFullMatch] = useState(false);
  const [situationFilter, setSituationFilter] = useState<'all' | GameState>('all');

  const stats = useMemo(() => {
    if (!match) return null;

    const currentPeriod = match.currentPeriod || 1;
    const isMatchOver = currentPeriod >= 3;
    const filterPeriod = (showFullMatch && isMatchOver) ? null : currentPeriod;

    const goalsToCount = (filterPeriod ? match.goals.filter(g => g.period === filterPeriod) : match.goals)
      .filter(g => situationFilter === 'all' || g.gameState === situationFilter);
    const shotsToCount = (filterPeriod ? match.shots.filter(s => s.period === filterPeriod) : match.shots)
      .filter(s => situationFilter === 'all' || s.gameState === situationFilter);
    const faceoffsToCount = (filterPeriod ? match.faceoffs.filter(f => f.period === filterPeriod) : match.faceoffs)
      .filter(f => situationFilter === 'all' || f.gameState === situationFilter);
    const penaltiesToCount = (filterPeriod ? match.penalties.filter(p => p.period === filterPeriod) : match.penalties)
      .filter(p => situationFilter === 'all' || p.gameState === situationFilter);
    const possessionsToCount = (filterPeriod ? match.possessions.filter(p => p.period === filterPeriod) : match.possessions)
      .filter(p => situationFilter === 'all' || p.gameState === situationFilter);

    const ourGoals = goalsToCount.filter((g) => g.isOurTeam).length;
    const opponentGoals = goalsToCount.filter((g) => !g.isOurTeam).length;
    const ourShots = shotsToCount.filter((s) => s.isOurTeam).length;
    const opponentShots = shotsToCount.filter((s) => !s.isOurTeam).length;

    let ourFaceoffWins = 0;
    let ourFaceoffLosses = 0;
    faceoffsToCount.forEach((f) => {
      const winnerIsUs = match.roster.some((r) => r.playerId === f.winnerId);
      if (winnerIsUs) ourFaceoffWins++;
      else {
        const loserIsUs = match.roster.some((r) => r.playerId === f.loserId);
        if (loserIsUs) ourFaceoffLosses++;
      }
    });
    const totalFaceoffs = ourFaceoffWins + ourFaceoffLosses;
    const ourFaceoffWinRate = totalFaceoffs > 0 ? (ourFaceoffWins / totalFaceoffs) * 100 : 0;
    const opponentFaceoffWinRate = totalFaceoffs > 0 ? (ourFaceoffLosses / totalFaceoffs) * 100 : 0;

    let ourPIM = 0;
    penaltiesToCount.forEach((p) => {
      const isUs = match.roster.some((r) => r.playerId === p.playerId);
      if (isUs) ourPIM += p.minutes;
    });

    const playerRatings = match.roster
      .filter(r => {
        const p = players.find(pl => pl.id === r.playerId);
        return p && p.position !== 'goalie';
      })
      .map(r => {
        const pid = r.playerId;
        const pGoals = goalsToCount.filter(g => g.scorerId === pid).length;
        const pAssists = goalsToCount.filter(g => g.assists.includes(pid)).length;
        let pPlusMinus = 0;
        goalsToCount.forEach(g => {
          if (g.isOurTeam && g.plusPlayers.includes(pid)) pPlusMinus++;
          if (!g.isOurTeam && g.minusPlayers.includes(pid)) pPlusMinus--;
        });
        const pShots = shotsToCount.filter(s => s.playerId === pid && s.isOurTeam).length;

        let pPossGain = 0;
        let pPossLoss = 0;
        possessionsToCount.forEach(poss => {
          if (poss.playerId === pid) {
            if (poss.type === 'gain') pPossGain++;
            else pPossLoss++;
          }
        });

        let pPIM = 0;
        penaltiesToCount.filter(pen => pen.playerId === pid).forEach(pen => pPIM += pen.minutes);

        let pFW = 0;
        let pFL = 0;
        faceoffsToCount.forEach(f => {
          if (f.winnerId === pid) pFW++;
          if (f.loserId === pid) pFL++;
        });

        const points = pGoals + pAssists;
        const shotPct = pShots > 0 ? (pGoals / pShots) * 100 : 0;

        const offRating = (pGoals * 2 + pAssists * 1.5) / Math.max(1, points) * 2;
        const effRating = shotPct / 10;
        const pmRating = Math.max(0, Math.min(10, 5 + pPlusMinus * 0.5));
        const possTotal = pPossGain + pPossLoss;
        const possRating = possTotal > 0 ? (pPossGain / possTotal) * 10 : 5;
        const discRating = Math.max(0, 10 - pPIM * 0.5);
        const faceoffTotal = pFW + pFL;
        const faceoffRating = faceoffTotal > 0 ? (pFW / faceoffTotal) * 10 : 5;

        const rating = (offRating * 0.3 + effRating * 0.2 + pmRating * 0.2 + possRating * 0.1 + discRating * 0.1 + faceoffRating * 0.1);

        return {
          playerId: pid,
          name: players.find(pl => pl.id === pid)?.name || 'Unknown',
          jersey: players.find(pl => pl.id === pid)?.jerseyNumber || 0,
          position: players.find(pl => pl.id === pid)?.position || '?',
          rating: Math.max(0, Math.min(10, rating)),
          goals: pGoals,
          assists: pAssists,
          plusMinus: pPlusMinus,
        };
      }).sort((a, b) => b.rating - a.rating).slice(0, 3);

    return {
      ourGoals,
      opponentGoals,
      ourShots,
      opponentShots,
      ourFaceoffWinRate,
      opponentFaceoffWinRate,
      ourPIM,
      playerRatings,
    };
  }, [match, players, showFullMatch, situationFilter]);

  if (!match || !stats) return null;

  const currentPeriod = match.currentPeriod || 1;
  const isDraw = match.ourScore === match.opponentScore;
  const isRegulationEnd = currentPeriod >= 3;
  const isOvertimePeriod = match.isOvertime === true;
  const showDrawOptions = isRegulationEnd && isDraw && !isOvertimePeriod;
  const showOTDrawOptions = isOvertimePeriod && isDraw;
  const isMatchOver = isRegulationEnd && !isDraw;

  const filterPeriod = (showFullMatch && isRegulationEnd) ? null : currentPeriod;
  const shotsToDisplay = (filterPeriod ? match.shots.filter(s => s.period === filterPeriod) : match.shots)
    .filter(s => situationFilter === 'all' || s.gameState === situationFilter);

  const adjustedDisplayShots = useMemo(() => {
    const onGoalShots = shotsToDisplay.filter(s => s.isOurTeam && s.onGoal);
    const withDefaults = onGoalShots.map((shot) => ({
      ...shot,
      location: shot.location || { x: 0.5, y: 0.5 },
    }));

    const result: typeof withDefaults = [];
    const COLLISION_THRESHOLD = 0.06;

    withDefaults.forEach((shot, index) => {
      let adjustedX = shot.location.x;
      let adjustedY = shot.location.y;

      for (const prev of result) {
        const dx = adjustedX - prev.location.x;
        const dy = adjustedY - prev.location.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < COLLISION_THRESHOLD) {
          const angle = index * 1.3 + Math.atan2(dy || 0.01, dx || 0.01);
          adjustedX = prev.location.x + Math.cos(angle) * COLLISION_THRESHOLD * 1.5;
          adjustedY = prev.location.y + Math.sin(angle) * COLLISION_THRESHOLD * 1.5;
        }
      }

      adjustedX = Math.max(0.05, Math.min(0.95, adjustedX));
      adjustedY = Math.max(0.05, Math.min(0.95, adjustedY));

      result.push({ ...shot, location: { x: adjustedX, y: adjustedY } });
    });

    return result;
  }, [shotsToDisplay]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isMatchOver ? (showFullMatch ? 'Full Match Stats' : `Period ${currentPeriod} Summary`) : `End of Period ${currentPeriod}`}
            </Text>
            <Text style={styles.headerSubtitle}>
              {match.ourScore} - {match.opponentScore}
            </Text>
          </View>
          {isRegulationEnd ? (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowFullMatch(!showFullMatch)}
            >
              <Text style={styles.toggleButtonText}>
                {showFullMatch ? `P${currentPeriod}` : 'Full'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#1c1c1e" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Trophy size={20} color={activeTab === 'overview' ? '#007AFF' : '#8e8e93'} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shots' && styles.activeTab]}
            onPress={() => setActiveTab('shots')}
          >
            <Target size={20} color={activeTab === 'shots' ? '#007AFF' : '#8e8e93'} />
            <Text style={[styles.tabText, activeTab === 'shots' && styles.activeTabText]}>Shot Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'players' && styles.activeTab]}
            onPress={() => setActiveTab('players')}
          >
            <Users size={20} color={activeTab === 'players' ? '#007AFF' : '#8e8e93'} />
            <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>Top Players</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.situationFilter}>
          {(['all', 'even', 'pp', 'sh'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.situationBtn, situationFilter === s && styles.situationBtnActive]}
              onPress={() => setSituationFilter(s)}
            >
              <Text style={[styles.situationBtnText, situationFilter === s && styles.situationBtnTextActive]}>
                {s === 'all' ? 'All' : s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'overview' ? (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.ourGoals}</Text>
                  <Text style={styles.statLabel}>Goals</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.opponentGoals}</Text>
                  <Text style={styles.statLabel}>Goals</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.ourShots}</Text>
                  <Text style={styles.statLabel}>Shots</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.opponentShots}</Text>
                  <Text style={styles.statLabel}>Shots</Text>
                </View>
              </View>
              {(() => {
                const ourShotsFiltered = (filterPeriod ? match.shots.filter(s => s.period === filterPeriod) : match.shots)
                  .filter(s => s.isOurTeam && (situationFilter === 'all' || s.gameState === situationFilter));
                const oppShotsFiltered = (filterPeriod ? match.shots.filter(s => s.period === filterPeriod) : match.shots)
                  .filter(s => !s.isOurTeam && (situationFilter === 'all' || s.gameState === situationFilter));
                const ourHigh = ourShotsFiltered.filter(s => s.shotRisk === 'high').length;
                const ourMed = ourShotsFiltered.filter(s => s.shotRisk === 'medium').length;
                const ourLow = ourShotsFiltered.filter(s => s.shotRisk === 'low').length;
                const oppHigh = oppShotsFiltered.filter(s => s.shotRisk === 'high').length;
                const oppMed = oppShotsFiltered.filter(s => s.shotRisk === 'medium').length;
                const oppLow = oppShotsFiltered.filter(s => s.shotRisk === 'low').length;
                return (
                  <View style={styles.riskRow}>
                    <View style={styles.riskSide}>
                      <View style={styles.riskChipRow}>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#FF3B30' }]} />
                          <Text style={[styles.riskChipText, { color: '#FF3B30' }]}>{ourHigh}</Text>
                        </View>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#FF9500' }]} />
                          <Text style={[styles.riskChipText, { color: '#FF9500' }]}>{ourMed}</Text>
                        </View>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#34C759' }]} />
                          <Text style={[styles.riskChipText, { color: '#34C759' }]}>{ourLow}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.riskSide}>
                      <View style={styles.riskChipRow}>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#FF3B30' }]} />
                          <Text style={[styles.riskChipText, { color: '#FF3B30' }]}>{oppHigh}</Text>
                        </View>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#FF9500' }]} />
                          <Text style={[styles.riskChipText, { color: '#FF9500' }]}>{oppMed}</Text>
                        </View>
                        <View style={[styles.riskChip, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                          <View style={[styles.riskDot, { backgroundColor: '#34C759' }]} />
                          <Text style={[styles.riskChipText, { color: '#34C759' }]}>{oppLow}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })()}
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.ourFaceoffWinRate.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Faceoffs</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.opponentFaceoffWinRate.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Faceoffs</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.ourPIM}</Text>
                  <Text style={styles.statLabel}>PIM</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>PIM</Text>
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === 'shots' ? (
            <View style={styles.shotMapContainer}>
              <Text style={styles.sectionTitle}>Shots on Target</Text>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={styles.legendText}>Goal</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={styles.legendText}>High</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
                  <Text style={styles.legendText}>Med</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                  <Text style={styles.legendText}>Low</Text>
                </View>
              </View>
              <View style={styles.net}>
                {adjustedDisplayShots.map((shot) => {
                  const isGoal = shot.result === 'goal';
                  const player = shot.playerId ? players.find(p => p.id === shot.playerId) : null;

                  return (
                    <View
                      key={shot.id}
                      style={[
                        styles.shotMarker,
                        {
                          left: (shot.location.x * NET_WIDTH) - 16,
                          top: (shot.location.y * NET_HEIGHT) - 16,
                        },
                      ]}
                    >
                      <View style={[
                        styles.shotCircle,
                        {
                          backgroundColor: isGoal ? '#FFD700' : (shot.shotRisk === 'high' ? '#FF3B30' : shot.shotRisk === 'medium' ? '#FF9500' : shot.shotRisk === 'low' ? '#34C759' : '#007AFF'),
                          borderColor: isGoal ? '#FFA500' : (shot.shotRisk === 'high' ? '#cc2f26' : shot.shotRisk === 'medium' ? '#cc7700' : shot.shotRisk === 'low' ? '#2aa147' : '#0051D5'),
                          borderWidth: 2,
                        },
                      ]}>
                        {player && (
                          <Text style={[styles.shotPlayerNumber, { color: isGoal ? '#000' : '#fff' }]}>
                            {player.jerseyNumber}
                          </Text>
                        )}
                        {!player && (
                          <Target color={isGoal ? '#000' : '#fff'} size={16} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.hintText}>
                {filterPeriod ? `Period ${filterPeriod} shots on target` : 'All shots on target'}
                {situationFilter !== 'all' ? ` (${situationFilter.toUpperCase()})` : ''}
              </Text>
            </View>
          ) : null}

          {activeTab === 'players' ? (
            <View style={styles.playersContainer}>
              <Text style={styles.sectionTitle}>Top 3 Performers</Text>
              {stats.playerRatings.map((p, index) => (
                <View key={p.playerId} style={styles.playerCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>#{p.jersey} {p.name}</Text>
                    <Text style={styles.playerStats}>
                      {p.goals}G {p.assists}A ({p.plusMinus > 0 ? '+' : ''}{p.plusMinus})
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{p.rating.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
              {stats.playerRatings.length === 0 ? (
                <Text style={styles.emptyText}>Not enough data yet</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {showDrawOptions && (
            <>
              <Text style={styles.drawNotice}>Match is tied after regulation</Text>
              <TouchableOpacity style={styles.otButton} onPress={onStartOvertime}>
                <Text style={styles.otButtonText}>Start Overtime</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawButton} onPress={onEndAsDraw}>
                <Text style={styles.drawButtonText}>End as Draw</Text>
              </TouchableOpacity>
            </>
          )}

          {showOTDrawOptions && (
            <>
              <Text style={styles.drawNotice}>Overtime ended in a draw</Text>
              <TouchableOpacity style={styles.otButton} onPress={onContinueOvertime}>
                <Text style={styles.otButtonText}>Continue Overtime</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shootoutButton} onPress={onStartShootout}>
                <Text style={styles.shootoutButtonText}>Go to Shootout</Text>
              </TouchableOpacity>
            </>
          )}

          {!showDrawOptions && !showOTDrawOptions && (
            <>
              {isRegulationEnd && !showFullMatch ? (
                <TouchableOpacity
                  style={styles.viewFullButton}
                  onPress={() => setShowFullMatch(true)}
                >
                  <Text style={styles.viewFullButtonText}>View Full Match Stats</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.nextButton} onPress={onNextPeriod}>
                <Text style={styles.nextButtonText}>
                  {isMatchOver ? 'End Match' : 'Start Next Period'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  toggleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  activeTabText: {
    color: '#007AFF',
  },
  situationFilter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  situationBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f2f2f7',
  },
  situationBtnActive: {
    backgroundColor: '#007AFF',
  },
  situationBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  situationBtnTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e5ea',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
    textTransform: 'uppercase' as const,
  },
  shotMapContainer: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1c1c1e',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  net: {
    width: NET_WIDTH,
    height: NET_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF3B30',
    position: 'relative' as const,
    marginBottom: 12,
    overflow: 'hidden',
  },
  shotMarker: {
    position: 'absolute' as const,
    width: 32,
    height: 32,
  },
  shotCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  shotPlayerNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  hintText: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center' as const,
  },
  riskRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  riskSide: {
    flex: 1,
    alignItems: 'center' as const,
  },
  riskChipRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  riskChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  playersContainer: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#8e8e93',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1c1c1e',
  },
  playerStats: {
    fontSize: 13,
    color: '#8e8e93',
  },
  ratingBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: '#8e8e93',
    marginTop: 24,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    gap: 10,
  },
  drawNotice: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF9500',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  otButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  otButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  drawButton: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8e8e93',
  },
  drawButtonText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  shootoutButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shootoutButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  viewFullButton: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewFullButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
});
