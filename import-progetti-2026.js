/**
 * Import one-shot: legge elenco_progetti_2026.xlsx e inserisce i progetti in Supabase.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node import-progetti-2026.js
 *
 * Oppure crea un file .env.import con le due variabili e usa:
 *   node -e "require('dotenv').config({path:'.env.import'})" import-progetti-2026.js
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EXCEL_PATH = process.env.EXCEL_PATH || path.join(require('os').homedir(), 'Downloads', 'elenco_progetti_2026.xlsx');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Variabili mancanti: SUPABASE_URL e SUPABASE_SERVICE_KEY sono obbligatorie.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mappa priorità Excel → DB
function mapPriority(p) {
  if (!p) return 'medium';
  const v = String(p).toUpperCase();
  if (v === 'ALTA' || v === 'HIGH' || v === 'URGENT') return 'high';
  if (v === 'BASSA' || v === 'LOW') return 'low';
  return 'medium';
}

// Mappa stato avanzamento → status DB
function mapStatus(s) {
  if (!s) return 'active';
  const v = String(s).toLowerCase();
  if (v === 'completato' || v === 'done' || v === 'pronto') return 'completed';
  if (v === 'sospeso' || v === 'on hold' || v === 'stand by') return 'on_hold';
  return 'active'; // Idea, In sviluppo, ecc.
}

async function run() {
  // Leggi admin user (il primo admin nel DB)
  const { data: admin, error: adminErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .single();

  if (adminErr || !admin) {
    console.error('❌  Admin non trovato nel DB:', adminErr?.message);
    process.exit(1);
  }
  const ownerId = admin.id;
  console.log(`✅  Admin trovato: ${ownerId}`);

  // Leggi Excel
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets['Progetti'];
  if (!ws) {
    console.error('❌  Sheet "Progetti" non trovato nel file Excel.');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`📋  Righe trovate nell'Excel: ${rows.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row['Nome Progetto']?.toString().trim();
    if (!name || name === ' ') { skipped++; continue; }

    const description = [
      row['Mercato'] ? `Mercato: ${row['Mercato']}` : null,
      row['Peso'] ? `Peso: ${row['Peso']}` : null,
      row['Cliente'] ? `Cliente: ${row['Cliente']}` : null,
      row['Target price'] ? `Target price: ${row['Target price']}` : null,
    ].filter(Boolean).join(' | ');

    const project = {
      name,
      description: description || null,
      notes: row['Note'] || null,
      owner_id: ownerId,
      created_by: ownerId,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select('id')
      .single();

    if (error) {
      console.error(`❌  Errore inserimento "${name}":`, error.message);
      skipped++;
      continue;
    }

    // Aggiungi owner come project member
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: ownerId,
      role: 'owner'
    });

    console.log(`✅  Inserito: "${name}" (id: ${data.id})`);
    inserted++;
  }

  console.log(`\n📊  Riepilogo: ${inserted} inseriti, ${skipped} saltati.`);
}

run().catch(e => {
  console.error('Errore fatale:', e.message);
  process.exit(1);
});
