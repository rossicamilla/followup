const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const token = auth.split(' ')[1];

  try {
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Token non valido' });

    const { data: profile, error: pe } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (pe || !profile) return res.status(401).json({ error: 'Profilo non trovato' });

    req.user = user;
    req.profile = profile;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Autenticazione fallita' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.profile?.role)) {
      return res.status(403).json({ error: `Ruolo richiesto: ${roles.join(' o ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, sb };
