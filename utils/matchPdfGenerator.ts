import { Match, Player, Shot } from '@/types/hockey';
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

      match.goals.forEach((goal) => {
        if (goal.scorerId === r.playerId) goals++;
        if (goal.assists.includes(r.playerId)) assists++;
        if (goal.isOurTeam && goal.plusPlayers.includes(r.playerId)) plusMinus++;
        if (!goal.isOurTeam && goal.minusPlayers.includes(r.playerId)) plusMinus--;
      });

      match.shots.forEach((shot) => {
        if (shot.playerId === r.playerId && shot.isOurTeam) shots++;
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
      };
    })
    .filter((item): item is PlayerMatchStat => item !== null)
    .sort((a, b) => b.points - a.points);
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

  const playerStats = getPlayerStats(match, players);
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
  const foPct = ourFoTotal > 0 ? ((ourFoWins / ourFoTotal) * 100).toFixed(0) : '0';

  const ourPIM = match.penalties.reduce((sum, pen) => sum + pen.minutes, 0);

  const NET_W = 400;
  const NET_H = 240;

  let shotDiagramsHTML = '';

  for (let p = 1; p <= totalPeriods; p++) {
    const periodLabel = p > 3 ? `OT${p - 3}` : `Period ${p}`;
    const ourDiagram = renderShotDiagramSVG(match.shots, players, true, p, NET_W, NET_H);
    const oppDiagram = renderShotDiagramSVG(match.shots, players, false, p, NET_W, NET_H);

    const ourPeriodShots = match.shots.filter((s) => s.isOurTeam && s.period === p).length;
    const oppPeriodShots = match.shots.filter((s) => !s.isOurTeam && s.period === p).length;
    const ourPeriodGoals = match.goals.filter((g) => g.isOurTeam && g.period === p).length;
    const oppPeriodGoals = match.goals.filter((g) => !g.isOurTeam && g.period === p).length;

    shotDiagramsHTML += `
      <div class="period-section">
        <div class="period-header">${periodLabel}</div>
        <div class="period-mini-stats">
          <span>Shots: ${ourPeriodShots} - ${oppPeriodShots}</span>
          <span>Goals: ${ourPeriodGoals} - ${oppPeriodGoals}</span>
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

  const playerRows = playerStats.map((stat) => {
    const foTotal = stat.faceoffWins + stat.faceoffLosses;
    const foDisplay = foTotal > 0 ? `${stat.faceoffWins}/${foTotal}` : '-';
    const pmSign = stat.plusMinus > 0 ? '+' : '';
    const pmColor = stat.plusMinus > 0 ? '#34C759' : stat.plusMinus < 0 ? '#FF3B30' : '#1c1c1e';
    const rColor = getRatingColor(stat.rating);

    return `
      <tr>
        <td class="player-cell">
          <span class="jersey">#${stat.player.jerseyNumber}</span>
          <span class="name">${stat.player.name}</span>
          <span class="pos">${stat.player.position[0].toUpperCase()}</span>
        </td>
        <td>${stat.goals}</td>
        <td>${stat.assists}</td>
        <td>${stat.points}</td>
        <td style="color:${pmColor};font-weight:700">${pmSign}${stat.plusMinus}</td>
        <td>${stat.shots}</td>
        <td>${stat.penaltyMinutes}</td>
        <td>${foDisplay}</td>
        <td><span class="rating-badge" style="background:${rColor}">${stat.rating.toFixed(1)}</span></td>
      </tr>
    `;
  }).join('');

  const goalieStats = match.roster
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

      return { player, sa, saves, goalsAgainst, svPct };
    })
    .filter(Boolean);

  let goalieRowsHTML = '';
  if (goalieStats.length > 0) {
    const goalieRows = goalieStats.map((gs) => {
      if (!gs) return '';
      return `
        <tr>
          <td class="player-cell">
            <span class="jersey">#${gs.player.jerseyNumber}</span>
            <span class="name">${gs.player.name}</span>
          </td>
          <td>${gs.sa}</td>
          <td>${gs.saves}</td>
          <td>${gs.goalsAgainst}</td>
          <td>${gs.svPct}%</td>
        </tr>
      `;
    }).join('');

    goalieRowsHTML = `
      <div class="section">
        <div class="section-title">Goalies</div>
        <table>
          <thead>
            <tr>
              <th class="player-th">Player</th>
              <th>SA</th>
              <th>SV</th>
              <th>GA</th>
              <th>SV%</th>
            </tr>
          </thead>
          <tbody>${goalieRows}</tbody>
        </table>
      </div>
    `;
  }

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
      background: #f8f9fa;
      color: #1c1c1e;
      padding: 24px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding: 24px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .date { color: #8e8e93; font-size: 13px; margin-bottom: 16px; }
    .score-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }
    .team-block { text-align: center; }
    .team-label { color: #8e8e93; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .score-num { font-size: 48px; font-weight: 800; color: #1c1c1e; }
    .result-pill {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 24px;
      color: #fff;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 1px;
    }
    .team-stats {
      display: flex;
      justify-content: space-around;
      padding: 16px;
      background: #fff;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .stat-box { text-align: center; }
    .stat-val { font-size: 22px; font-weight: 700; color: #1c1c1e; }
    .stat-lbl { font-size: 11px; color: #8e8e93; margin-top: 2px; }

    .section {
      margin-bottom: 20px;
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1c1c1e;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: center; padding: 8px 4px; color: #8e8e93; font-weight: 700; font-size: 11px; border-bottom: 2px solid #e5e5ea; }
    td { text-align: center; padding: 10px 4px; border-bottom: 1px solid #f2f2f7; font-weight: 600; }
    .player-th { text-align: left; }
    .player-cell { text-align: left; }
    .jersey {
      display: inline-block;
      background: #007AFF;
      color: #fff;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      line-height: 26px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      margin-right: 6px;
      vertical-align: middle;
    }
    .name { font-weight: 600; vertical-align: middle; }
    .pos { color: #8e8e93; font-size: 10px; background: #f2f2f7; padding: 2px 5px; border-radius: 4px; margin-left: 4px; vertical-align: middle; }
    .rating-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
    }

    .period-section {
      margin-bottom: 24px;
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }
    .period-header {
      font-size: 17px;
      font-weight: 700;
      color: #1c1c1e;
      margin-bottom: 8px;
      text-align: center;
    }
    .period-mini-stats {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 12px;
      color: #8e8e93;
      font-size: 12px;
      font-weight: 600;
    }
    .diagrams-row {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .diagram-col { text-align: center; flex: 1; }
    .diagram-label {
      font-size: 12px;
      font-weight: 600;
      color: #8e8e93;
      margin-bottom: 8px;
    }
    .diagram-col svg { width: 100%; height: auto; }

    .legend-row {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin: 16px 0;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #1c1c1e;
    }
    .legend-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid;
    }

    .footer {
      text-align: center;
      color: #c7c7cc;
      font-size: 11px;
      margin-top: 24px;
      padding-top: 16px;
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
</div>

<div class="team-stats">
  <div class="stat-box"><div class="stat-val">${match.ourShots}</div><div class="stat-lbl">Shots</div></div>
  <div class="stat-box"><div class="stat-val">${match.opponentShots}</div><div class="stat-lbl">Opp Shots</div></div>
  <div class="stat-box"><div class="stat-val">${ourPIM}</div><div class="stat-lbl">PIM</div></div>
  <div class="stat-box"><div class="stat-val">${foPct}%</div><div class="stat-lbl">FO%</div></div>
</div>

<div class="section">
  <div class="section-title">Player Stats</div>
  <table>
    <thead>
      <tr>
        <th class="player-th">Player</th>
        <th>G</th>
        <th>A</th>
        <th>P</th>
        <th>+/-</th>
        <th>SOG</th>
        <th>PIM</th>
        <th>FO</th>
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
