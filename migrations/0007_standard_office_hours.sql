-- Standard weekly office hours, America/Caracas.
-- Monday-Friday 09:00-17:00, Saturday 09:00-13:00, Sunday closed.
-- Existing enabled rules are disabled first so the live schedule is deterministic.

UPDATE availability_rules
SET enabled=0, updated_at=datetime('now')
WHERE enabled=1;

INSERT INTO availability_rules(id,weekday,start_time,end_time,enabled,created_at,updated_at) VALUES
('std-mon-0900-1700',1,'09:00','17:00',1,datetime('now'),datetime('now')),
('std-tue-0900-1700',2,'09:00','17:00',1,datetime('now'),datetime('now')),
('std-wed-0900-1700',3,'09:00','17:00',1,datetime('now'),datetime('now')),
('std-thu-0900-1700',4,'09:00','17:00',1,datetime('now'),datetime('now')),
('std-fri-0900-1700',5,'09:00','17:00',1,datetime('now'),datetime('now')),
('std-sat-0900-1300',6,'09:00','13:00',1,datetime('now'),datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  weekday=excluded.weekday,
  start_time=excluded.start_time,
  end_time=excluded.end_time,
  enabled=1,
  updated_at=datetime('now');
