BEGIN;

UPDATE containers SET address='вул. Дерибасівська · демо-точка', latitude=46.4844, longitude=30.7344 WHERE id='CNT-001';
UPDATE containers SET address='Приморський бульвар · демо-точка', latitude=46.4886, longitude=30.7419 WHERE id='CNT-002';
UPDATE containers SET address='вул. Преображенська · демо-точка', latitude=46.4782, longitude=30.7320 WHERE id='CNT-003';
UPDATE containers SET address='Молдаванка · демо-точка', latitude=46.4742, longitude=30.7144 WHERE id='CNT-004';
UPDATE containers SET address='Аркадія · демо-точка', latitude=46.4304, longitude=30.7620 WHERE id='CNT-005';
UPDATE containers SET address='Французький бульвар · демо-точка', latitude=46.4440, longitude=30.7580 WHERE id='CNT-006';
UPDATE containers SET address='Пересип · демо-точка', latitude=46.5160, longitude=30.7280 WHERE id='CNT-007';
UPDATE containers SET address='Залізничний вокзал · демо-точка', latitude=46.4686, longitude=30.7408 WHERE id='CNT-008';

COMMIT;
