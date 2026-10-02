PRAGMA foreign_keys = ON;

-- Keep historical bookings intact while replacing the current online service menu.
UPDATE services SET active=0, booking_enabled=0, updated_at=datetime('now');

INSERT INTO services(
  id,slug,name_es,name_en,category,duration_minutes,buffer_before_minutes,buffer_after_minutes,
  price_text,booking_enabled,staff_approval_required,min_notice_minutes,instructions,active,created_at,updated_at
) VALUES
('svc-facial-harmonization','armonizacion-facial','Armonización facial','Facial harmonization','face',60,0,10,NULL,0,1,120,'Duración pendiente de confirmación por la doctora; no habilitar reserva en línea hasta definirla.',1,datetime('now'),datetime('now')),
('svc-botox','toxina-botulinica','Toxina botulínica','Botulinum toxin','face',30,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-ha-fillers','rellenos-acido-hialuronico','Rellenos con ácido hialurónico (labios, ojeras, mentón, pómulos, línea mandibular, surcos/líneas, nariz)','Hyaluronic acid fillers (lips, under-eye area, chin, cheekbones, jawline, folds/lines, nose)','face',45,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-collagen-biostimulator','bioestimulador-colageno','Bioestimulador de colágeno','Collagen biostimulator','face',45,0,10,NULL,0,1,120,'Duración pendiente de confirmación por la doctora; no habilitar reserva en línea hasta definirla.',1,datetime('now'),datetime('now')),
('svc-threads','hilos-lisos-tensores','Hilos (lisos y tensores)','Threads (smooth and lifting)','face',60,0,15,NULL,1,1,180,NULL,1,datetime('now'),datetime('now')),
('svc-skin-treatment','tratamiento-piel','Tratamiento de piel (limpieza, revitalización, PRP)','Skin treatment (cleansing, revitalization, PRP)','face',60,0,15,NULL,1,1,180,NULL,1,datetime('now'),datetime('now')),
('svc-facial-fat','reduccion-grasa-facial','Reducción localizada de grasa facial','Facial localized fat reduction','face',30,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),

('svc-hydroaspiration','hidroaspiracion','Hidroaspiración','Hydro-aspiration','body',180,0,30,NULL,1,1,1440,NULL,1,datetime('now'),datetime('now')),
('svc-body-mesotherapy','mesoterapia-corporal','Mesoterapia corporal','Body mesotherapy','body',30,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-ultracavitation','ultracavitacion','Ultracavitación','Ultracavitation','body',30,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-radiofrequency','radiofrecuencia','Radiofrecuencia','Radiofrequency','body',45,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),

('svc-hair-underarms','depilacion-axilas','Depilación: axilas','Hair removal: underarms','hair_removal',20,0,5,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-hair-pubic','depilacion-zona-pubica','Depilación: zona púbica','Hair removal: pubic area','hair_removal',20,0,5,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-hair-legs','depilacion-piernas','Depilación: piernas','Hair removal: legs','hair_removal',60,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),

('svc-weight-nutrition','consulta-nutricional-control-peso','Consulta nutricional y control de peso','Nutritional and weight management consultation','weight_metabolic',90,0,15,NULL,1,1,180,NULL,1,datetime('now'),datetime('now')),
('svc-followup','consulta-seguimiento','Cita de seguimiento','Follow-up appointment','weight_metabolic',30,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),

('svc-aesthetic-consult','consulta-estetica','Consulta estética','Aesthetic consultation','consultation',45,0,10,NULL,1,1,120,NULL,1,datetime('now'),datetime('now')),
('svc-comprehensive-consult','consulta-integral','Consulta integral','Comprehensive consultation','consultation',90,0,15,NULL,1,1,180,NULL,1,datetime('now'),datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  slug=excluded.slug,
  name_es=excluded.name_es,
  name_en=excluded.name_en,
  category=excluded.category,
  duration_minutes=excluded.duration_minutes,
  buffer_before_minutes=excluded.buffer_before_minutes,
  buffer_after_minutes=excluded.buffer_after_minutes,
  booking_enabled=excluded.booking_enabled,
  staff_approval_required=excluded.staff_approval_required,
  min_notice_minutes=excluded.min_notice_minutes,
  instructions=excluded.instructions,
  active=excluded.active,
  updated_at=datetime('now');
