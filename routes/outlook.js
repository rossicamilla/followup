const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const { syncTaskToOutlook, updateOutlookEvent } = require('../services/outlookSync');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/outlook/callback';
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common';

// Genera il link per autorizzazione (prima volta)
router.get('/authorize', requireAuth, (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?
    client_id=${MICROSOFT_CLIENT_ID}
    &response_type=code
    &scope=https://graph.microsoft.com/Calendars.ReadWrite offline_access
    &redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}
    &state=${req.profile.id}
    &prompt=consent`.replace(/\n/g, '').replace(/\s+/g, '');
  
  res.json({ success: true, authUrl });
});

// Callback dopo che l'utente autorizza
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  try {
    // Scambia il code con access token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
      })
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Salva i token in Supabase
    const { error } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    // Redirect al frontend con successo
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}?outlook=success`);
  } catch (e) {
    console.error('Errore OAuth Outlook:', e.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}?outlook=error`);
  }
});

// POST sincronizza task esistente con Outlook
router.post('/sync-task', requireAuth, async (req, res) => {
  const { task_id } = req.body;

  try {
    // Prendi il task dal DB
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError) throw taskError;

    const result = await syncTaskToOutlook(req.profile.id, task);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Errore sync task:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH aggiorna task E sincronizza completamento con Outlook
router.patch('/sync-task/:id', requireAuth, async (req, res) => {
  const { completed } = req.body;

  try {
    const result = await updateOutlookEvent(req.profile.id, req.params.id, completed);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Errore update sync:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET status connessione Outlook
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outlook_tokens')
      .select('user_id')
      .eq('user_id', req.profile.id)
      .single();

    res.json({ 
      connected: !error && !!data,
      message: error ? 'Non connesso' : 'Connesso a Outlook'
    });
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

module.exports = router;
