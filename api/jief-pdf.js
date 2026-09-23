const SUPABASE_URL = 'https://cmpmbbeeonnylomllkna.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_a3H97mJaw_R8OxV3bIwoUg_sHahj8nP';
const PANEL_ORIGIN = 'https://painel.somosggdigital.com.br';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', PANEL_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  const id = String(req.query?.id || '');
  const bearer = String(req.headers.authorization || '');
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id) || !/^Bearer\s+\S+$/i.test(bearer)) {
    return res.status(400).json({ error: 'Inscrição ou sessão inválida.' });
  }

  try {
    // The caller's own JWT is forwarded to Supabase. RLS returns a row only
    // when this signed-in user is a GG CRM administrator.
    const url = new URL('/rest/v1/gg_event_submissions', SUPABASE_URL);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('event_key', 'eq.jief-2026');
    url.searchParams.set('select', 'team,team_name,leader_name,leader_phone,rosters,submission_code');
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: bearer, Accept: 'application/json' }
    });
    if (!response.ok) return res.status(response.status === 401 ? 401 : 403).json({ error: 'Acesso negado à inscrição.' });
    const rows = await response.json();
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Inscrição não encontrada ou sem acesso.' });

    const { createJiefPdf } = await import('../src/jief-pdf.mjs');
    const bytes = await createJiefPdf({
      team: item.team, teamName: item.team_name, leader: item.leader_name,
      phone: item.leader_phone, rosters: item.rosters || []
    });
    const safeCode = String(item.submission_code || 'JIEF-2026').replace(/[^A-Za-z0-9_-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeCode}.pdf"`);
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error('Falha ao gerar PDF administrativo do JIEF.', error);
    return res.status(500).json({ error: 'Não foi possível gerar a ficha agora.' });
  }
};
