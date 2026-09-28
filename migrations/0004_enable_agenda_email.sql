INSERT INTO settings(key,value,updated_at) VALUES('agenda_email_enabled','1',datetime('now'))
ON CONFLICT(key) DO UPDATE SET value='1',updated_at=datetime('now');