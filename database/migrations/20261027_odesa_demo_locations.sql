BEGIN;

UPDATE containers SET address='вул. Дерибасівська · демо-точка', latitude=46.4844, longitude=30.7344 WHERE id='CNT-001';
UPDATE containers SET address='Приморський бульвар · демо-точка', latitude=46.4886, longitude=30.7419 WHERE id='CNT-002';
UPDATE containers SET address='вул. Преображенська · демо-точка', latitude=46.4782, longitude=30.7320 WHERE id='CNT-003';
UPDATE containers SET address='вул. Михайла Грушевського · демо-точка', latitude=46.4742, longitude=30.7144 WHERE id='CNT-004';
UPDATE containers SET address='Аркадійська алея · демо-точка', latitude=46.4304, longitude=30.7620 WHERE id='CNT-005';
UPDATE containers SET address='Французький бульвар · демо-точка', latitude=46.4440, longitude=30.7580 WHERE id='CNT-006';
UPDATE containers SET address='Миколаївська дорога · демо-точка', latitude=46.5160, longitude=30.7280 WHERE id='CNT-007';
UPDATE containers SET address='Залізничний вокзал · демо-точка', latitude=46.4686, longitude=30.7408 WHERE id='CNT-008';

INSERT INTO containers (id,name,address,latitude,longitude,capacity_kg,fill_percent,status,waste_type)
VALUES
  ('CNT-009','Контейнер 09','вул. Космонавтів · демо-точка',46.4355,30.7110,120,58,'normal','paper'),
  ('CNT-010','Контейнер 10','вул. Академіка Корольова · демо-точка',46.4055,30.7215,120,76,'warning','glass')
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  address=EXCLUDED.address,
  latitude=EXCLUDED.latitude,
  longitude=EXCLUDED.longitude,
  capacity_kg=EXCLUDED.capacity_kg,
  waste_type=EXCLUDED.waste_type,
  last_update=NOW();

COMMIT;
