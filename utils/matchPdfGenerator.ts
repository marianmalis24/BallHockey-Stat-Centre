import { Match, Player, Shot, Goal } from '@/types/hockey';
import { getRatingColor } from '@/constants/ratingColors';

interface PlayerMatchStat {
  player: Player;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  shots: number;
  penaltyMinutes: number;
  rating: number;
  faceoffWins: number;
  faceoffLosses: number;
  possessionGains: number;
  possessionLosses: number;
  shotRiskBreakdown: { low: number; medium: number; high: number };
}

interface GoalieStat {
  player: Player;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePercentage: string;
  rating: number;
}

function calculateRating(
  goals: number,
  assists: number,
  plusMinus: number,
  shotPercentage: number,
  possessionGains: number,
  possessionLosses: number,
  penaltyMinutes: number,
  faceoffWins: number,
  faceoffLosses: number,
  shots: number,
  position: string
): number {
  if (position === 'goalie') return 6.0;

  let rating = 6.0;
  const points = goals + assists;
  if (points >= 4) rating += 2.5;
  else if (points >= 3) rating += 2.0;
  else if (points >= 2) rating += 1.5;
  else if (points >= 1) rating += 0.8;
  else if (points === 0) rating -= 0.3;

  if (plusMinus >= 3) rating += 1.5;
  else if (plusMinus >= 2) rating += 1.0;
  else if (plusMinus >= 1) rating += 0.5;
  else if (plusMinus === 0) rating += 0;
  else if (plusMinus === -1) rating -= 0.5;
  else if (plusMinus === -2) rating -= 1.2;
  else if (plusMinus <= -3) rating -= 2.0;

  if (shots > 0) {
    if (shotPercentage >= 30) rating += 0.8;
    else if (shotPercentage >= 20) rating += 0.5;
    else if (shotPercentage >= 10) rating += 0.2;
    else if (shotPercentage < 10 && shots >= 5) rating -= 0.3;
  }

  if (possessionGains + possessionLosses > 0) {
    const possessionRatio = possessionGains / (possessionGains + possessionLosses);
    if (possessionRatio >= 0.7) rating += 0.5;
    else if (possessionRatio >= 0.6) rating += 0.3;
    else if (possessionRatio < 0.4) rating -= 0.3;
  }

  if (penaltyMinutes >= 10) rating -= 2.5;
  else if (penaltyMinutes >= 6) rating -= 1.8;
  else if (penaltyMinutes >= 4) rating -= 1.2;
  else if (penaltyMinutes >= 2) rating -= 0.7;

  const faceoffTotal = faceoffWins + faceoffLosses;
  if (faceoffTotal >= 5) {
    const faceoffPct = (faceoffWins / faceoffTotal) * 100;
    if (faceoffPct >= 60) rating += 0.6;
    else if (faceoffPct >= 55) rating += 0.3;
    else if (faceoffPct < 40) rating -= 0.4;
  }

  return Math.min(10, Math.max(0, rating));
}

function getPlayerStats(match: Match, players: Player[]): PlayerMatchStat[] {
  return match.roster
    .map((r) => {
      const player = players.find((p) => p.id === r.playerId);
      if (!player || player.position === 'goalie') return null;

      let goals = 0;
      let assists = 0;
      let plusMinus = 0;
      let shots = 0;
      let penaltyMinutes = 0;
      let faceoffWins = 0;
      let faceoffLosses = 0;
      let possessionGains = 0;
      let possessionLosses = 0;
      const shotRiskBreakdown = { low: 0, medium: 0, high: 0 };

      match.goals.forEach((goal) => {
        if (goal.scorerId === r.playerId) goals++;
        if (goal.assists.includes(r.playerId)) assists++;
        if (goal.isOurTeam && goal.plusPlayers.includes(r.playerId)) plusMinus++;
        if (!goal.isOurTeam && goal.minusPlayers.includes(r.playerId)) plusMinus--;
      });

      match.shots.forEach((shot) => {
        if (shot.playerId === r.playerId && shot.isOurTeam) {
          shots++;
          if (shot.shotRisk) {
            shotRiskBreakdown[shot.shotRisk]++;
          }
        }
      });

      match.penalties.forEach((pen) => {
        if (pen.playerId === r.playerId) penaltyMinutes += pen.minutes;
      });

      match.possessions.forEach((poss) => {
        if (poss.playerId === r.playerId) {
          if (poss.type === 'gain') possessionGains++;
          else possessionLosses++;
        }
      });

      if (match.faceoffs) {
        match.faceoffs.forEach((faceoff) => {
          if (faceoff.winnerId === r.playerId) faceoffWins++;
          if (faceoff.loserId === r.playerId) faceoffLosses++;
        });
      }

      const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;
      const rating = calculateRating(
        goals, assists, plusMinus, shotPercentage,
        possessionGains, possessionLosses, penaltyMinutes,
        faceoffWins, faceoffLosses, shots, player.position
      );

      return {
        player,
        goals,
        assists,
        points: goals + assists,
        plusMinus,
        shots,
        penaltyMinutes,
        rating,
        faceoffWins,
        faceoffLosses,
        possessionGains,
        possessionLosses,
        shotRiskBreakdown,
      };
    })
    .filter((item): item is PlayerMatchStat => item !== null)
    .sort((a, b) => b.points - a.points || b.rating - a.rating);
}

function getGoalieStats(match: Match, players: Player[]): GoalieStat[] {
  return match.roster
    .map((r) => {
      const player = players.find((p) => p.id === r.playerId);
      if (!player || player.position !== 'goalie') return null;

      const goalsAgainst = match.goals.filter(
        (g) => !g.isOurTeam && g.goalieId === player.id
      ).length;
      const saves = match.shots.filter(
        (s) => !s.isOurTeam && s.goalieId === player.id && s.result === 'save'
      ).length;
      const sa = goalsAgainst + saves;
      const svPct = sa > 0 ? ((saves / sa) * 100).toFixed(1) : '0.0';

      let rating = 6.0;
      if (sa > 0) {
        const svPctNum = (saves / sa) * 100;
        if (svPctNum >= 95) rating = 9.0;
        else if (svPctNum >= 92) rating = 8.0;
        else if (svPctNum >= 88) rating = 7.0;
        else if (svPctNum >= 85) rating = 6.5;
        else if (svPctNum >= 80) rating = 5.5;
        else rating = 4.0;
      }

      return { player, shotsAgainst: sa, saves, goalsAgainst, savePercentage: svPct, rating };
    })
    .filter((item): item is GoalieStat => item !== null);
}

function getShotColor(shot: Shot): string {
  if (shot.result === 'goal') return '#FFD700';
  if (shot.shotRisk === 'high') return '#FF3B30';
  if (shot.shotRisk === 'medium') return '#FF9500';
  if (shot.shotRisk === 'low') return '#34C759';
  return '#007AFF';
}

function getShotBorder(shot: Shot): string {
  if (shot.result === 'goal') return '#FFA500';
  if (shot.shotRisk === 'high') return '#cc2f26';
  if (shot.shotRisk === 'medium') return '#cc7700';
  if (shot.shotRisk === 'low') return '#2aa147';
  return '#0051D5';
}

function getShotTextColor(shot: Shot): string {
  if (shot.result === 'goal') return '#000';
  return '#fff';
}

function adjustShots(shots: Shot[]): (Shot & { adjX: number; adjY: number })[] {
  const COLLISION_THRESHOLD = 0.06;
  const result: (Shot & { adjX: number; adjY: number })[] = [];

  shots.forEach((shot, index) => {
    const loc = shot.location || { x: 0.5, y: 0.5 };
    let adjustedX = loc.x;
    let adjustedY = loc.y;

    for (const prev of result) {
      const dx = adjustedX - prev.adjX;
      const dy = adjustedY - prev.adjY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < COLLISION_THRESHOLD) {
        const angle = index * 1.3 + Math.atan2(dy || 0.01, dx || 0.01);
        adjustedX = prev.adjX + Math.cos(angle) * COLLISION_THRESHOLD * 1.5;
        adjustedY = prev.adjY + Math.sin(angle) * COLLISION_THRESHOLD * 1.5;
      }
    }

    adjustedX = Math.max(0.05, Math.min(0.95, adjustedX));
    adjustedY = Math.max(0.05, Math.min(0.95, adjustedY));

    result.push({ ...shot, adjX: adjustedX, adjY: adjustedY });
  });

  return result;
}

function renderShotDiagramSVG(
  shots: Shot[],
  players: Player[],
  isOurTeam: boolean,
  period: number | 'all',
  netWidth: number,
  netHeight: number
): string {
  const filtered = shots.filter((s) => {
    if (s.isOurTeam !== isOurTeam) return false;
    if (period !== 'all' && s.period !== period) return false;
    return true;
  });

  const adjusted = adjustShots(filtered);
  const markerR = 12;

  let circles = '';
  adjusted.forEach((shot) => {
    const cx = shot.adjX * netWidth;
    const cy = shot.adjY * netHeight;
    const bg = getShotColor(shot);
    const border = getShotBorder(shot);
    const textColor = getShotTextColor(shot);
    const player = shot.playerId ? players.find((p) => p.id === shot.playerId) : null;
    const label = player ? `${player.jerseyNumber}` : '';

    circles += `
      <circle cx="${cx}" cy="${cy}" r="${markerR}" fill="${bg}" stroke="${border}" stroke-width="2"/>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${textColor}">${label}</text>
    `;
  });

  return `
    <svg width="${netWidth}" height="${netHeight}" viewBox="0 0 ${netWidth} ${netHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${netWidth}" height="${netHeight}" rx="8" fill="#fff" stroke="#FF3B30" stroke-width="3"/>
      ${circles}
    </svg>
  `;
}

function formatGoalEvent(goal: Goal, players: Player[]): string {
  const scorer = players.find((p) => p.id === goal.scorerId);
  const scorerName = scorer ? `#${scorer.jerseyNumber} ${scorer.name}` : 'Unknown';

  const assistNames = goal.assists
    .map((aid) => {
      const p = players.find((pl) => pl.id === aid);
      return p ? `#${p.jerseyNumber} ${p.name}` : '';
    })
    .filter(Boolean);

  const assistStr = assistNames.length > 0 ? ` (${assistNames.join(', ')})` : ' (unassisted)';
  const riskLabel = goal.shotRisk ? ` • ${goal.shotRisk.toUpperCase()} risk` : '';
  const stateLabel = goal.gameState && goal.gameState !== 'even' ? ` • ${goal.gameState.toUpperCase()}` : '';

  return `${scorerName}${assistStr}${riskLabel}${stateLabel}`;
}

function getShotRiskCounts(shots: Shot[], isOurTeam: boolean, period?: number): { low: number; medium: number; high: number; none: number } {
  const filtered = shots.filter((s) => {
    if (s.isOurTeam !== isOurTeam) return false;
    if (period !== undefined && s.period !== period) return false;
    return true;
  });

  let low = 0, medium = 0, high = 0, none = 0;
  filtered.forEach((s) => {
    if (s.shotRisk === 'low') low++;
    else if (s.shotRisk === 'medium') medium++;
    else if (s.shotRisk === 'high') high++;
    else none++;
  });

  return { low, medium, high, none };
}

export function generateMatchStatsHTML(match: Match, players: Player[]): string {
  const isWin = match.ourScore > match.opponentScore;
  const isDraw = match.ourScore === match.opponentScore;

  const date = new Date(match.date);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resultLabel = isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS';
  const resultColor = isWin ? '#34C759' : isDraw ? '#8e8e93' : '#FF3B30';
  const endedLabel = match.endedAs === 'overtime' ? ' (OT)' : match.endedAs === 'shootout' ? ' (SO)' : match.endedAs === 'draw' ? ' (Draw)' : '';

  const playerStats = getPlayerStats(match, players);
  const goalieStats = getGoalieStats(match, players);
  const totalPeriods = match.currentPeriod || 3;

  let ourFoWins = 0;
  let ourFoTotal = 0;
  if (match.faceoffs) {
    match.faceoffs.forEach((f) => {
      const winnerIsUs = match.roster.some((r) => r.playerId === f.winnerId);
      if (winnerIsUs) ourFoWins++;
      ourFoTotal++;
    });
  }
  const oppFoWins = ourFoTotal - ourFoWins;
  const foPct = ourFoTotal > 0 ? ((ourFoWins / ourFoTotal) * 100).toFixed(0) : '0';
  const oppFoPct = ourFoTotal > 0 ? ((oppFoWins / ourFoTotal) * 100).toFixed(0) : '0';

  const ourPIM = match.penalties.reduce((sum, pen) => sum + pen.minutes, 0);

  const ourRiskCounts = getShotRiskCounts(match.shots, true);
  const oppRiskCounts = getShotRiskCounts(match.shots, false);

  const NET_W = 380;
  const NET_H = 228;

  let periodHeaderCells = '<th class="period-score-team">Team</th>';
  let ourPeriodCells = '<td class="period-score-team"><strong>Us</strong></td>';
  let oppPeriodCells = `<td class="period-score-team"><strong>${match.opponentName}</strong></td>`;

  for (let p = 1; p <= totalPeriods; p++) {
    const pLabel = p > 3 ? `OT${p - 3}` : `P${p}`;
    const ourPG = match.goals.filter((g) => g.isOurTeam && g.period === p).length;
    const oppPG = match.goals.filter((g) => !g.isOurTeam && g.period === p).length;
    periodHeaderCells += `<th>${pLabel}</th>`;
    ourPeriodCells += `<td>${ourPG}</td>`;
    oppPeriodCells += `<td>${oppPG}</td>`;
  }
  periodHeaderCells += '<th>T</th>';
  ourPeriodCells += `<td><strong>${match.ourScore}</strong></td>`;
  oppPeriodCells += `<td><strong>${match.opponentScore}</strong></td>`;

  let scoringSummaryHTML = '';
  for (let p = 1; p <= totalPeriods; p++) {
    const pLabel = p > 3 ? `OT${p - 3}` : `Period ${p}`;
    const periodGoals = match.goals
      .filter((g) => g.period === p)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (periodGoals.length === 0) continue;

    let goalsListHTML = '';
    periodGoals.forEach((goal) => {
      const team = goal.isOurTeam ? 'Us' : match.opponentName;
      const teamClass = goal.isOurTeam ? 'our-goal' : 'opp-goal';
      const detail = goal.isOurTeam ? formatGoalEvent(goal, players) : (match.opponentName + ' goal');

      goalsListHTML += `
        <div class="goal-event ${teamClass}">
          <span class="goal-team">${team}</span>
          <span class="goal-detail">${detail}</span>
        </div>
      `;
    });

    scoringSummaryHTML += `
      <div class="scoring-period">
        <div class="scoring-period-label">${pLabel}</div>
        ${goalsListHTML}
      </div>
    `;
  }

  if (match.shootout && match.shootout.attempts.length > 0) {
    let shootoutHTML = '';
    const maxRound = Math.max(...match.shootout.attempts.map((a) => a.round));
    for (let rd = 1; rd <= maxRound; rd++) {
      const rdAttempts = match.shootout.attempts.filter((a) => a.round === rd);
      rdAttempts.forEach((att) => {
        const team = att.isOurTeam ? 'Us' : match.opponentName;
        const player = att.playerId ? players.find((p) => p.id === att.playerId) : null;
        const playerStr = player ? `#${player.jerseyNumber} ${player.name}` : '';
        const resultStr = att.result === 'goal' ? '✓ Goal' : '✗ No Goal';
        const resultClass = att.result === 'goal' ? 'so-goal' : 'so-miss';

        shootoutHTML += `
          <div class="goal-event">
            <span class="goal-team">${team}</span>
            <span class="goal-detail">${playerStr}</span>
            <span class="${resultClass}">${resultStr}</span>
          </div>
        `;
      });
    }

    scoringSummaryHTML += `
      <div class="scoring-period">
        <div class="scoring-period-label">Shootout (${match.shootout.ourScore} - ${match.shootout.opponentScore})</div>
        ${shootoutHTML}
      </div>
    `;
  }

  const playerRows = playerStats.map((stat) => {
    const foTotal = stat.faceoffWins + stat.faceoffLosses;
    const foDisplay = foTotal > 0 ? `${stat.faceoffWins}/${foTotal}` : '-';
    const foPctDisplay = foTotal > 0 ? `${((stat.faceoffWins / foTotal) * 100).toFixed(0)}%` : '-';
    const pmSign = stat.plusMinus > 0 ? '+' : '';
    const pmColor = stat.plusMinus > 0 ? '#34C759' : stat.plusMinus < 0 ? '#FF3B30' : '#1c1c1e';
    const rColor = getRatingColor(stat.rating);
    const possDisplay = `${stat.possessionGains}/${stat.possessionLosses}`;
    const shotPct = stat.shots > 0 ? ((stat.goals / stat.shots) * 100).toFixed(0) + '%' : '-';

    return `
      <tr>
        <td class="player-cell">
          <span class="jersey">#${stat.player.jerseyNumber}</span>
          <span class="name">${stat.player.name}</span>
          <span class="pos">${stat.player.position[0].toUpperCase()}</span>
        </td>
        <td>${stat.goals}</td>
        <td>${stat.assists}</td>
        <td><strong>${stat.points}</strong></td>
        <td style="color:${pmColor};font-weight:700">${pmSign}${stat.plusMinus}</td>
        <td>${stat.shots}</td>
        <td>${shotPct}</td>
        <td>${stat.penaltyMinutes}</td>
        <td>${possDisplay}</td>
        <td>${foDisplay}</td>
        <td>${foPctDisplay}</td>
        <td><span class="rating-badge" style="background:${rColor}">${stat.rating.toFixed(1)}</span></td>
      </tr>
    `;
  }).join('');

  let goalieRowsHTML = '';
  if (goalieStats.length > 0) {
    const goalieRows = goalieStats.map((gs) => {
      const rColor = getRatingColor(gs.rating);
      return `
        <tr>
          <td class="player-cell">
            <span class="jersey">#${gs.player.jerseyNumber}</span>
            <span class="name">${gs.player.name}</span>
          </td>
          <td>${gs.shotsAgainst}</td>
          <td>${gs.saves}</td>
          <td>${gs.goalsAgainst}</td>
          <td><strong>${gs.savePercentage}%</strong></td>
          <td><span class="rating-badge" style="background:${rColor}">${gs.rating.toFixed(1)}</span></td>
        </tr>
      `;
    }).join('');

    goalieRowsHTML = `
      <div class="section">
        <div class="section-title">🥅 Goalie Stats</div>
        <table>
          <thead>
            <tr>
              <th class="player-th">Player</th>
              <th>SA</th>
              <th>SV</th>
              <th>GA</th>
              <th>SV%</th>
              <th>RAT</th>
            </tr>
          </thead>
          <tbody>${goalieRows}</tbody>
        </table>
      </div>
    `;
  }

  let shotDiagramsHTML = '';

  for (let p = 1; p <= totalPeriods; p++) {
    const periodLabel = p > 3 ? `OT${p - 3}` : `Period ${p}`;
    const ourDiagram = renderShotDiagramSVG(match.shots, players, true, p, NET_W, NET_H);
    const oppDiagram = renderShotDiagramSVG(match.shots, players, false, p, NET_W, NET_H);

    const ourPeriodShots = match.shots.filter((s) => s.isOurTeam && s.period === p).length;
    const oppPeriodShots = match.shots.filter((s) => !s.isOurTeam && s.period === p).length;
    const ourPeriodGoals = match.goals.filter((g) => g.isOurTeam && g.period === p).length;
    const oppPeriodGoals = match.goals.filter((g) => !g.isOurTeam && g.period === p).length;

    const ourPRisk = getShotRiskCounts(match.shots, true, p);
    const oppPRisk = getShotRiskCounts(match.shots, false, p);

    const ourFoP = match.faceoffs ? match.faceoffs.filter((f) => f.period === p) : [];
    const ourFoPWins = ourFoP.filter((f) => match.roster.some((r) => r.playerId === f.winnerId)).length;
    const ourFoPTotal = ourFoP.length;
    const ourFoPPct = ourFoPTotal > 0 ? ((ourFoPWins / ourFoPTotal) * 100).toFixed(0) : '-';

    shotDiagramsHTML += `
      <div class="period-section">
        <div class="period-header">${periodLabel}</div>
        <div class="period-mini-stats">
          <span>Goals: <strong>${ourPeriodGoals}</strong> - <strong>${oppPeriodGoals}</strong></span>
          <span>Shots: <strong>${ourPeriodShots}</strong> - <strong>${oppPeriodShots}</strong></span>
          <span>FO: <strong>${ourFoPPct}%</strong> (${ourFoPWins}/${ourFoPTotal})</span>
        </div>
        <div class="risk-row">
          <div class="risk-col">
            <span class="risk-label">Our shots:</span>
            <span class="risk-high">${ourPRisk.high}H</span>
            <span class="risk-med">${ourPRisk.medium}M</span>
            <span class="risk-low">${ourPRisk.low}L</span>
          </div>
          <div class="risk-col">
            <span class="risk-label">Opp shots:</span>
            <span class="risk-high">${oppPRisk.high}H</span>
            <span class="risk-med">${oppPRisk.medium}M</span>
            <span class="risk-low">${oppPRisk.low}L</span>
          </div>
        </div>
        <div class="diagrams-row">
          <div class="diagram-col">
            <div class="diagram-label">Our Shots (${ourPeriodShots})</div>
            ${ourDiagram}
          </div>
          <div class="diagram-col">
            <div class="diagram-label">Opponent Shots (${oppPeriodShots})</div>
            ${oppDiagram}
          </div>
        </div>
      </div>
    `;
  }

  const allOurDiagram = renderShotDiagramSVG(match.shots, players, true, 'all', NET_W, NET_H);
  const allOppDiagram = renderShotDiagramSVG(match.shots, players, false, 'all', NET_W, NET_H);

  shotDiagramsHTML += `
    <div class="period-section">
      <div class="period-header">Full Game</div>
      <div class="diagrams-row">
        <div class="diagram-col">
          <div class="diagram-label">Our Shots (${match.ourShots})</div>
          ${allOurDiagram}
        </div>
        <div class="diagram-col">
          <div class="diagram-label">Opponent Shots (${match.opponentShots})</div>
          ${allOppDiagram}
        </div>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f2f2f7;
      color: #1c1c1e;
      padding: 20px;
      font-size: 12px;
    }
    h2 { font-size: 15px; margin-bottom: 10px; }

    .header {
      text-align: center;
      margin-bottom: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
      border-radius: 16px;
      color: #fff;
    }
    .header .date { color: #aeaeb2; font-size: 12px; margin-bottom: 14px; }
    .score-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
    .team-block { text-align: center; }
    .team-label { color: #aeaeb2; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .score-num { font-size: 44px; font-weight: 800; color: #fff; }
    .result-pill {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      letter-spacing: 1px;
    }
    .ended-label { color: #aeaeb2; font-size: 11px; margin-top: 8px; }

    .period-score-table {
      width: 100%;
      margin-bottom: 16px;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .period-score-table table { width: 100%; border-collapse: collapse; }
    .period-score-table th {
      background: #f2f2f7;
      padding: 8px 6px;
      font-size: 11px;
      font-weight: 700;
      color: #8e8e93;
      text-align: center;
      border-bottom: 2px solid #e5e5ea;
    }
    .period-score-table td {
      padding: 8px 6px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      border-bottom: 1px solid #f2f2f7;
    }
    .period-score-team { text-align: left !important; padding-left: 12px !important; }

    .team-comparison {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .team-compare-col {
      flex: 1;
      background: #fff;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .team-compare-col h3 {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #1c1c1e;
    }
    .compare-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f8f8fa;
      font-size: 12px;
    }
    .compare-row:last-child { border-bottom: none; }
    .compare-label { color: #8e8e93; font-weight: 500; }
    .compare-val { font-weight: 700; color: #1c1c1e; }

    .scoring-summary {
      margin-bottom: 16px;
      background: #fff;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .scoring-period { margin-bottom: 10px; }
    .scoring-period:last-child { margin-bottom: 0; }
    .scoring-period-label {
      font-size: 12px;
      font-weight: 700;
      color: #8e8e93;
      text-transform: uppercase;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f2f2f7;
    }
    .goal-event {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      font-size: 11px;
    }
    .goal-team {
      font-weight: 700;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f2f2f7;
      color: #1c1c1e;
      white-space: nowrap;
    }
    .our-goal .goal-team { background: #34C75920; color: #34C759; }
    .opp-goal .goal-team { background: #FF3B3020; color: #FF3B30; }
    .goal-detail { flex: 1; color: #1c1c1e; font-weight: 500; }
    .so-goal { color: #34C759; font-weight: 700; font-size: 11px; }
    .so-miss { color: #FF3B30; font-weight: 700; font-size: 11px; }

    .section {
      margin-bottom: 16px;
      background: #fff;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #1c1c1e;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th {
      text-align: center;
      padding: 7px 3px;
      color: #8e8e93;
      font-weight: 700;
      font-size: 10px;
      border-bottom: 2px solid #e5e5ea;
      text-transform: uppercase;
    }
    td {
      text-align: center;
      padding: 8px 3px;
      border-bottom: 1px solid #f2f2f7;
      font-weight: 600;
      font-size: 11px;
    }
    .player-th { text-align: left; }
    .player-cell { text-align: left; white-space: nowrap; }
    .jersey {
      display: inline-block;
      background: #007AFF;
      color: #fff;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      line-height: 22px;
      text-align: center;
      font-size: 9px;
      font-weight: 700;
      margin-right: 4px;
      vertical-align: middle;
    }
    .name { font-weight: 600; vertical-align: middle; font-size: 11px; }
    .pos {
      color: #8e8e93;
      font-size: 9px;
      background: #f2f2f7;
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 3px;
      vertical-align: middle;
    }
    .rating-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 5px;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
    }

    .period-section {
      margin-bottom: 16px;
      background: #fff;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }
    .period-header {
      font-size: 15px;
      font-weight: 700;
      color: #1c1c1e;
      margin-bottom: 6px;
      text-align: center;
    }
    .period-mini-stats {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 8px;
      color: #8e8e93;
      font-size: 11px;
      font-weight: 500;
    }
    .period-mini-stats strong { color: #1c1c1e; }
    .risk-row {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 10px;
      font-size: 10px;
    }
    .risk-col {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .risk-label { color: #8e8e93; font-weight: 600; }
    .risk-high { color: #FF3B30; font-weight: 700; }
    .risk-med { color: #FF9500; font-weight: 700; }
    .risk-low { color: #34C759; font-weight: 700; }
    .diagrams-row {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .diagram-col { text-align: center; flex: 1; }
    .diagram-label {
      font-size: 11px;
      font-weight: 600;
      color: #8e8e93;
      margin-bottom: 6px;
    }
    .diagram-col svg { width: 100%; height: auto; }

    .legend-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 12px 0;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      color: #1c1c1e;
    }
    .legend-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid;
    }

    .footer {
      text-align: center;
      color: #c7c7cc;
      font-size: 10px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e5e5ea;
    }
  </style>
</head>
<body>

<div class="header">
  <div class="date">${dateStr}</div>
  <div class="score-row">
    <div class="team-block">
      <div class="team-label">Us</div>
      <div class="score-num">${match.ourScore}</div>
    </div>
    <div class="result-pill" style="background:${resultColor}">${resultLabel}</div>
    <div class="team-block">
      <div class="team-label">${match.opponentName}</div>
      <div class="score-num">${match.opponentScore}</div>
    </div>
  </div>
  ${endedLabel ? `<div class="ended-label">${endedLabel}</div>` : ''}
</div>

<div class="period-score-table">
  <table>
    <thead><tr>${periodHeaderCells}</tr></thead>
    <tbody>
      <tr>${ourPeriodCells}</tr>
      <tr>${oppPeriodCells}</tr>
    </tbody>
  </table>
</div>

<div class="team-comparison">
  <div class="team-compare-col">
    <h3>Us</h3>
    <div class="compare-row"><span class="compare-label">Shots</span><span class="compare-val">${match.ourShots}</span></div>
    <div class="compare-row"><span class="compare-label">Goals</span><span class="compare-val">${match.ourScore}</span></div>
    <div class="compare-row"><span class="compare-label">SH%</span><span class="compare-val">${match.ourShots > 0 ? ((match.ourScore / match.ourShots) * 100).toFixed(1) : '0'}%</span></div>
    <div class="compare-row"><span class="compare-label">Faceoffs</span><span class="compare-val">${ourFoWins}/${ourFoTotal} (${foPct}%)</span></div>
    <div class="compare-row"><span class="compare-label">PIM</span><span class="compare-val">${ourPIM}</span></div>
    <div class="compare-row"><span class="compare-label">High Risk</span><span class="compare-val" style="color:#FF3B30">${ourRiskCounts.high}</span></div>
    <div class="compare-row"><span class="compare-label">Med Risk</span><span class="compare-val" style="color:#FF9500">${ourRiskCounts.medium}</span></div>
    <div class="compare-row"><span class="compare-label">Low Risk</span><span class="compare-val" style="color:#34C759">${ourRiskCounts.low}</span></div>
  </div>
  <div class="team-compare-col">
    <h3>${match.opponentName}</h3>
    <div class="compare-row"><span class="compare-label">Shots</span><span class="compare-val">${match.opponentShots}</span></div>
    <div class="compare-row"><span class="compare-label">Goals</span><span class="compare-val">${match.opponentScore}</span></div>
    <div class="compare-row"><span class="compare-label">SH%</span><span class="compare-val">${match.opponentShots > 0 ? ((match.opponentScore / match.opponentShots) * 100).toFixed(1) : '0'}%</span></div>
    <div class="compare-row"><span class="compare-label">Faceoffs</span><span class="compare-val">${oppFoWins}/${ourFoTotal} (${oppFoPct}%)</span></div>
    <div class="compare-row"><span class="compare-label">High Risk</span><span class="compare-val" style="color:#FF3B30">${oppRiskCounts.high}</span></div>
    <div class="compare-row"><span class="compare-label">Med Risk</span><span class="compare-val" style="color:#FF9500">${oppRiskCounts.medium}</span></div>
    <div class="compare-row"><span class="compare-label">Low Risk</span><span class="compare-val" style="color:#34C759">${oppRiskCounts.low}</span></div>
  </div>
</div>

${scoringSummaryHTML ? `
<div class="scoring-summary">
  <div class="section-title">🏒 Scoring Summary</div>
  ${scoringSummaryHTML}
</div>
` : ''}

<div class="section">
  <div class="section-title">📊 Player Stats</div>
  <table>
    <thead>
      <tr>
        <th class="player-th">Player</th>
        <th>G</th>
        <th>A</th>
        <th>P</th>
        <th>+/-</th>
        <th>SOG</th>
        <th>SH%</th>
        <th>PIM</th>
        <th>POSS</th>
        <th>FO</th>
        <th>FO%</th>
        <th>RAT</th>
      </tr>
    </thead>
    <tbody>${playerRows}</tbody>
  </table>
</div>

${goalieRowsHTML}

<div class="legend-row">
  <div class="legend-item"><div class="legend-dot" style="background:#FFD700;border-color:#FFA500"></div>Goal</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FF3B30;border-color:#cc2f26"></div>High Risk</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FF9500;border-color:#cc7700"></div>Medium</div>
  <div class="legend-item"><div class="legend-dot" style="background:#34C759;border-color:#2aa147"></div>Low Risk</div>
  <div class="legend-item"><div class="legend-dot" style="background:#007AFF;border-color:#0051D5"></div>Shot</div>
</div>

${shotDiagramsHTML}

<div class="footer">Generated by Hockey Tracker</div>

</body>
</html>
  `;
}
