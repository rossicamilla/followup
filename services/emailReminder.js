const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { ciphers: 'SSLv3' }
  });
}

async function buildEmailDraft(task) {
  if (!task.contact) return null;
  try {
    const msg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Scrivi una breve bozza email (3-4 righe, tono professionale, italiano) per questo task CRM:
Task: ${task.title}
Tipo: ${task.type}
Contatto: ${task.contact.name}${task.contact.company ? ' di ' + task.contact.company : ''}
Rispondi SOLO con il corpo dell'email, senza oggetto e senza firma.`
      }]
    });
    return msg.content[0]?.text || null;
  } catch {
    return null;
  }
}

async function buildReminderHtml(userName, tasks, frontendUrl) {
  const today = new Date().toISOString().split('T')[0];
  const urgent = tasks.filter(t => t.urgent || t.priority === 'alta');
  const overdue = tasks.filter(t => t.due_date && t.due_date < today);

  // Genera bozze solo per task di tipo email (max 3 per non rallentare)
  const emailTasks = tasks.filter(t => t.type === 'email').slice(0, 3);
  const drafts = await Promise.all(
    emailTasks.map(async t => ({ task: t, draft: await buildEmailDraft(t) }))
  );
  const validDrafts = drafts.filter(d => d.draft);

  const taskRows = tasks.slice(0, 20).map(t => {
    const isOverdue = t.due_date && t.due_date < today;
    const dateStr = t.due_date
      ? new Date(t.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      : '—';
    const typeColors = {
      chiamata: '#E6F1FB',
      email: '#E1F5EE',
      meeting: '#EEEDFE',
      task: '#F1EFE8'
    };
    const typeTextColors = {
      chiamata: '#042C53',
      email: '#0F6E56',
      meeting: '#26215C',
      task: '#5F5E5A'
    };
    const bg = typeColors[t.type] || '#F1EFE8';
    const tc = typeTextColors[t.type] || '#5F5E5A';
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f5f5f3;font-size:13px;color:${isOverdue ? '#D85A30' : '#1a1a18'}">
        ${t.urgent ? '⚡ ' : ''}${t.title}${isOverdue ? ' <span style="color:#D85A30;font-size:11px">scaduto</span>' : ''}
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #f5f5f3">
        <span style="background:${bg};color:${tc};font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">${t.type || 'task'}</span>
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #f5f5f3;font-size:12px;color:#888;white-space:nowrap">${dateStr}</td>
    </tr>`;
  }).join('');

  const draftsHtml = validDrafts.map(d => `
    <div style="background:#f8faf9;border-left:3px solid #1D9E75;border-radius:0 8px 8px 0;padding:13px 16px;margin-bottom:12px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">
        Bozza email — ${d.task.title}
      </div>
      <div style="font-size:13px;color:#333;line-height:1.65;white-space:pre-line">${d.draft}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f5f5f3;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto">

  <!-- Header -->
  <div style="background:#1D9E75;border-radius:12px 12px 0 0;padding:20px 24px;display:flex;align-items:center;gap:10px">
    <div style="width:28px;height:28px;background:rgba(255,255,255,.25);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <span style="color:#fff;font-size:13px;font-weight:700">✓</span>
    </div>
    <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-.02em">FollowUp AI</span>
  </div>

  <!-- Body -->
  <div style="background:#fff;border-radius:0 0 12px 12px;border:1px solid #e8e8e4;border-top:none;padding:24px">

    <div style="font-size:15px;font-weight:700;color:#1a1a18;margin-bottom:4px">Ciao ${userName} 👋</div>
    <div style="font-size:13px;color:#888;margin-bottom:20px">
      Ecco il riepilogo dei tuoi <strong>${tasks.length} task aperti</strong> per oggi,
      ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}.
    </div>

    ${urgent.length > 0 ? `
    <div style="background:#FAECE7;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#4A1B0C">
      <strong>⚡ ${urgent.length} task urgent${urgent.length > 1 ? 'i' : 'e'}:</strong>
      ${urgent.map(t => t.title).join(' · ')}
    </div>` : ''}

    ${overdue.length > 0 ? `
    <div style="background:#FCEBEB;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#501313">
      <strong>⚠️ ${overdue.length} task scadut${overdue.length > 1 ? 'i' : 'o'}:</strong>
      ${overdue.map(t => t.title).join(' · ')}
    </div>` : ''}

    <!-- Task table -->
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">
      Task aperti (${tasks.length})
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8f8f6">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0f0">Task</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0f0">Tipo</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0f0">Scadenza</th>
        </tr>
      </thead>
      <tbody>${taskRows}</tbody>
    </table>

    ${validDrafts.length > 0 ? `
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">
      Bozze email pronte per te
    </div>
    ${draftsHtml}` : ''}

    <div style="text-align:center;margin-top:20px">
      <a href="${frontendUrl}" style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:10px 24px;border-radius:7px;font-size:13px;font-weight:600">
        Apri FollowUp AI →
      </a>
    </div>

  </div>

  <div style="padding:14px 0;font-size:11px;color:#aaa;text-align:center">
    FollowUp AI · Confluencia ·
    <a href="${frontendUrl}" style="color:#1D9E75;text-decoration:none">Apri CRM</a>
  </div>
</div>
</body>
</html>`;
}

async function runReminderJob() {
  console.log('[Reminder] Avvio invio email riepilogo...');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const transporter = createTransporter();

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .not('email', 'is', null);

    if (error) throw error;

    for (const profile of profiles) {
      if (!profile.email) continue;
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            id, title, type, due_date, urgent, priority,
            contact:contacts(name, company)
          `)
          .eq('assigned_to', profile.id)
          .eq('completed', false)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (!tasks || tasks.length === 0) {
          console.log(`[Reminder] Nessun task per ${profile.email}, skip`);
          continue;
        }

        const today = new Date().toISOString().split('T')[0];
        const overdue = tasks.filter(t => t.due_date && t.due_date < today);
        const urgent = tasks.filter(t => t.urgent || t.priority === 'alta');

        const subject = [
          `📋 ${tasks.length} task aperti`,
          overdue.length > 0 ? `${overdue.length} scaduti` : null,
          urgent.length > 0 ? `${urgent.length} urgenti` : null,
          '— FollowUp AI'
        ].filter(Boolean).join(' · ');

        const html = await buildReminderHtml(profile.full_name, tasks, frontendUrl);

        await transporter.sendMail({
          from: `"FollowUp AI" <${process.env.SMTP_USER}>`,
          to: profile.email,
          subject,
          html
        });

        console.log(`[Reminder] ✓ Email inviata a ${profile.email} (${tasks.length} task)`);
      } catch (e) {
        console.error(`[Reminder] ✗ Errore per ${profile.email}:`, e.message);
      }
    }

    console.log('[Reminder] Job completato.');
  } catch (e) {
    console.error('[Reminder] Errore generale:', e.message);
  }
}

function startReminderCron() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Reminder] SMTP_USER/SMTP_PASS non configurati — email reminder disabilitati');
    return;
  }

  const schedule = process.env.REMINDER_CRON || '0 8 * * *'; // default: ogni giorno alle 8:00
  cron.schedule(schedule, runReminderJob, { timezone: 'Europe/Rome' });
  console.log(`[Reminder] Cron attivo: "${schedule}" (Europe/Rome)`);
}

module.exports = { startReminderCron, runReminderJob };
