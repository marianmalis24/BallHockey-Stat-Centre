const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const TABLE = 'live_scoreboards';

export interface LiveScoreboardData {
  share_code: string;
  our_score: number;
  opponent_score: number;
  our_shots: number;
  opponent_shots: number;
  current_period: number;
  is_overtime: boolean;
  opponent_name: string;
  fo_wins: number;
  fo_total: number;
  game_state: string;
  is_active: boolean;
  updated_at: string;
}

function getHeaders(): Record<string, string> {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };
}

export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function pushScoreboard(data: LiveScoreboardData): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Live scoreboard sync: Supabase not configured');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Live scoreboard push failed:', response.status, errorText);
      return false;
    }

    console.log('Live scoreboard synced:', data.share_code);
    return true;
  } catch (error) {
    console.log('Live scoreboard push error:', error);
    return false;
  }
}

export async function fetchScoreboard(shareCode: string): Promise<LiveScoreboardData | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Live scoreboard fetch: Supabase not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?share_code=eq.${shareCode}&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.log('Live scoreboard fetch failed:', response.status);
      return null;
    }

    const rows = await response.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0] as LiveScoreboardData;
    }

    return null;
  } catch (error) {
    console.log('Live scoreboard fetch error:', error);
    return null;
  }
}

export async function deactivateScoreboard(shareCode: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?share_code=eq.${shareCode}`,
      {
        method: 'PATCH',
        headers: {
          ...getHeaders(),
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
      }
    );
    console.log('Live scoreboard deactivated:', shareCode);
  } catch (error) {
    console.log('Live scoreboard deactivate error:', error);
  }
}
