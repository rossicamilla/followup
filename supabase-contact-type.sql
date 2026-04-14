-- Migrazione: aggiungi campo tipo (cliente/fornitore) ai contatti
alter table public.contacts
  add column if not exists contact_type text check (contact_type in ('cliente', 'fornitore')) default null;
