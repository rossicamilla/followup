# CLAUDE.md — FollowUp AI

Questo file descrive il progetto FollowUp AI in modo completo: contesto, architettura, funzionalità implementate, funzionalità mancanti da sviluppare, ruoli utente, stack tecnico e note di design. Usalo come riferimento principale per qualsiasi sessione di lavoro.

---

## Contesto del progetto

**FollowUp AI** è una web app CRM interna sviluppata per **Confluencia**, un'azienda B2B di importazione e distribuzione alimentare a conduzione familiare con sede in Italia.

### Problema che risolve

Prima di FollowUp AI, la gestione operativa si basava su:
- **Calendario Apple + Excel** per il titolare (task, follow-up, scadenze)
- **OneDrive** come archivio file — non strutturato, non scalabile, non condiviso in modo ordinato
- Nessuna visibilità condivisa sullo stato dei progetti tra i membri del team
- Informazioni disperse, nessun sistema di delega e tracciamento strutturato

### Obiettivo principale

Far ricordare le task al titolare e rendere visibile lo stato di avanzamento dei progetti a tutto il team, in tempo reale.

---

## Utenti e ruoli

| Ruolo | Chi è | Accesso |
|---|---|---|
| `admin` | Titolare (padre) | Accesso completo a tutto |
| `manager` | Gestione intermedia | Accesso a progetti, task, pipeline |
| `agent` | Agente commerciale esterno | Vista limitata alla propria pipeline |
| `employee` | Dipendenti interni (3 persone) | Task assegnate, progetti di competenza |

### Comportamento specifico per ruolo
- Il **titolare** usa prevalentemente **input vocale** (in macchina, quando non ha tempo di fermarsi)
- Gli **altri utenti** interagiscono manualmente con l'interfaccia
- L'integrazione con **Outlook Calendar** è pensata per tutto il team
- L'integrazione con **Apple Calendar** è stata **esclusa** perché troppo laboriosa per un utilizzo limitato a un solo utente

---

## Funzionalità implementate (parzialmente)

### 1. Gestione task
- Creazione, assegnazione e tracciamento task
- Stato task (da fare / in corso / completata)
- Assegnazione a specifici utenti per ruolo

### 2. Tracciamento progetti
- Pipeline visiva per lo stato di avanzamento dei progetti attivi
- Modulo progetti che replica il workflow Excel del titolare

### 3. Pipeline di vendita
- Gestione delle opportunità commerciali per fasi

### 4. Autenticazione multi-ruolo
- Login con ruoli differenziati (admin / manager / agent / employee)
- RLS (Row Level Security) su Supabase per isolare i dati per ruolo

---

## Funzionalità mancanti — DA SVILUPPARE

Queste funzionalità sono state definite ma non ancora implementate. Sono prioritarie per rendere il prodotto realmente utilizzabile.

### 🎙️ 1. Input vocale + elaborazione Claude
**Descrizione:** Il titolare registra note vocali (in macchina o ovunque). Il sistema trascrive l'audio con **Whisper** e lo elabora con **Claude API** per estrarre automaticamente:
- Task (con assegnatario, scadenza, priorità se rilevabili)
- Aggiornamenti di stato su progetti esistenti
- Bozze di email da inviare

**Flusso:**
```
Audio input → Whisper (trascrizione) → Claude API (classificazione + estrazione) → Task / Progetto / Email draft nel CRM
```

**Note:** L'input vocale non è obbligatorio per tutti gli utenti. È pensato principalmente per il titolare. Gli altri utenti inseriscono manualmente.

---

### ✉️ 2. Bozze email suggerite da Claude
**Descrizione:** Direttamente nel CRM, Claude suggerisce una bozza di email contestuale basata su:
- La task o il progetto corrente
- Lo storico delle interazioni con quel cliente/contatto
- Il tipo di azione da compiere (follow-up, sollecito, aggiornamento stato, ecc.)

**Comportamento atteso:**
- L'utente apre una task o un progetto
- Il CRM mostra una bozza email già compilata, pronta per essere revisionata e inviata
- L'utente può modificarla prima dell'invio

---

### 📧 3. Email automatiche di reminder (giornaliere o a giorni alterni)
**Descrizione:** Il sistema invia automaticamente una email riepilogativa a ogni utente con:
- Le task in scadenza o non ancora completate
- Eventualmente, bozze di email da girare ai clienti per ogni task in lista

**Frequenza:** Ogni giorno o ogni due giorni (configurabile).

**Contenuto email:**
- Elenco task dell'utente con stato
- Per ogni task rilevante: bozza email pre-compilata da Claude da inviare al cliente/partner

---

### 📅 4. Integrazione Outlook Calendar (Microsoft Graph API)
**Descrizione:** Le task con scadenza vengono sincronizzate automaticamente con il calendario Outlook degli utenti come eventi/reminder.

**Stato attuale:** Non ancora implementata.

**Note tecniche:**
- Usare **Microsoft Graph API**
- Autenticazione OAuth2 con account Microsoft aziendale
- Creare eventi nel calendario dell'utente assegnato alla task
- Aggiornare o eliminare l'evento se la task viene modificata o completata

**Perché Outlook e non Apple Calendar:**
Apple Calendar è stato escluso perché l'implementazione sarebbe complessa e il suo utilizzo sarebbe limitato al solo titolare. Outlook è già usato da tutto il team.

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + RLS) |
| AI — trascrizione | OpenAI Whisper |
| AI — elaborazione | Anthropic Claude API |
| Calendario | Microsoft Graph API (Outlook) |
| Auth | Supabase Auth (multi-ruolo) |
| Hosting target | Render |
| Repository | `github.com/kamykaramellaaa/followup-ai` |

---

## Note di design

### Ispirazione visiva
Il riferimento principale è **Attio CRM** — non per le funzionalità, ma per l'estetica:
- Font forti e leggibili, gerarchia tipografica netta
- Layout pulito, spazio bianco generoso
- Niente decorazioni inutili, ogni elemento ha il suo posto
- Semplicità visiva che non sacrifica la densità informativa

### Principi da rispettare
- L'interfaccia deve essere usabile anche da utenti non tecnici (dipendenti, titolare)
- Le informazioni più importanti (task urgenti, progetti attivi) devono essere visibili a colpo d'occhio
- Il flusso vocale → CRM deve sembrare naturale, non tecnico

---

## Stato attuale del progetto

- ✅ Architettura definita
- ✅ Auth multi-ruolo funzionante
- ✅ Gestione task e progetti (parziale)
- ✅ Pipeline di vendita (parziale)
- ❌ Input vocale + Whisper non implementato
- ❌ Bozze email Claude non implementate
- ❌ Email automatiche di reminder non implementate
- ❌ Integrazione Outlook Calendar non implementata
- ⚠️ Deploy su Render attivo (in configurazione)

---

## Priorità di sviluppo suggerite

1. **Stabilizzare il deploy** su Render
2. **Integrazione Outlook Calendar** — sblocca l'utilità immediata per il titolare
3. **Input vocale + Whisper + Claude** — funzionalità core differenziante
4. **Bozze email suggerite** — aumenta il valore per tutti gli utenti
5. **Email automatiche di reminder** — automazione finale

---

## Note operative

- Ogni sessione di lavoro deve partire da questo file per riallineare il contesto
- Non assumere mai che le funzionalità "mancanti" siano in sviluppo — verificare sempre lo stato nel repository
- Le decisioni di prodotto (es. esclusione Apple Calendar) sono deliberate e documentate sopra — non riaprirle senza motivo valido
