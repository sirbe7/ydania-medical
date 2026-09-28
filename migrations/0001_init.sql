PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  description_es TEXT,
  description_en TEXT,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK(buffer_before_minutes >= 0),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK(buffer_after_minutes >= 0),
  price_text TEXT,
  booking_enabled INTEGER NOT NULL DEFAULT 1 CHECK(booking_enabled IN (0,1)),
  staff_approval_required INTEGER NOT NULL DEFAULT 1 CHECK(staff_approval_required IN (0,1)),
  max_per_day INTEGER,
  min_notice_minutes INTEGER NOT NULL DEFAULT 120 CHECK(min_notice_minutes >= 0),
  instructions TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id TEXT PRIMARY KEY,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_availability_weekday ON availability_rules(weekday, enabled);

CREATE TABLE IF NOT EXISTS blocked_periods (
  id TEXT PRIMARY KEY,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocks_time ON blocked_periods(start_at, end_at, deleted_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  public_token TEXT NOT NULL UNIQUE,
  service_id TEXT NOT NULL REFERENCES services(id),
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'es',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  reserve_start_at TEXT NOT NULL,
  reserve_end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','declined','cancelled','completed','no_show')),
  patient_note TEXT,
  staff_note TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  approval_requested_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  cancelled_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_time_status ON bookings(reserve_start_at, reserve_end_at, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(patient_phone, created_at);


CREATE TABLE IF NOT EXISTS booking_locks (
  slot_key TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_locks_booking ON booking_locks(booking_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_entries(active, language, category);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS error_log (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL DEFAULT 'error',
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_error_unresolved ON error_log(resolved_at, created_at DESC);

CREATE TABLE IF NOT EXISTS message_log (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  external_id TEXT,
  recipient TEXT,
  message_type TEXT,
  status TEXT,
  booking_id TEXT REFERENCES bookings(id),
  payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_external ON message_log(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_message_booking ON message_log(booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reminder_jobs (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  kind TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminder_jobs(status, due_at);

INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES
('timezone','America/Caracas',datetime('now')),
('utc_offset_minutes','-240',datetime('now')),
('slot_step_minutes','15',datetime('now')),
('agenda_email_enabled','1',datetime('now')),
('agenda_email_hour_local','19',datetime('now')),
('agenda_email_recipients','Info@DraYdania.com',datetime('now')),
('chat_disclaimer_es','Este asistente ofrece información educativa general generada con IA. No proporciona diagnósticos ni recomendaciones médicas personalizadas. Las decisiones de tratamiento requieren valoración de la Dra. Ydania u otro médico calificado.',datetime('now')),
('chat_disclaimer_en','This assistant provides general educational information generated with AI. It does not provide diagnosis or personalized medical advice. Treatment decisions require evaluation by Dra. Ydania or another qualified physician.',datetime('now'));

INSERT OR IGNORE INTO services(id,slug,name_es,name_en,category,duration_minutes,buffer_before_minutes,buffer_after_minutes,price_text,booking_enabled,staff_approval_required,min_notice_minutes,active,created_at,updated_at) VALUES
('svc-aesthetic-eval','evaluacion-estetica','Evaluación estética inicial','Initial aesthetic evaluation','aesthetic',45,0,10,NULL,1,1,120,1,datetime('now'),datetime('now')),
('svc-botox','toxina-botulinica','Toxina botulínica','Botulinum toxin','aesthetic',30,0,10,NULL,1,1,120,1,datetime('now'),datetime('now')),
('svc-weight','consulta-control-peso','Consulta de control de peso y metabolismo','Weight and metabolism consultation','weight',60,0,10,NULL,1,1,180,1,datetime('now'),datetime('now')),
('svc-prp','prp','PRP','PRP','aesthetic',60,0,15,NULL,1,1,180,1,datetime('now'),datetime('now')),
('svc-radiofrequency','radiofrecuencia','Radiofrecuencia','Radiofrequency','aesthetic',45,0,10,NULL,1,1,120,1,datetime('now'),datetime('now')),
('svc-body-composition','composicion-corporal','Evaluación de composición corporal','Body composition evaluation','weight',30,0,5,NULL,1,1,120,1,datetime('now'),datetime('now'));