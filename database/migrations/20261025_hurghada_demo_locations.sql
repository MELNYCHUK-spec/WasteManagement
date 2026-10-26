BEGIN;

UPDATE containers SET address='El-Dahar (demo point)', latitude=27.2577, longitude=33.8118 WHERE id='CNT-001';
UPDATE containers SET address='Sakkala (demo point)', latitude=27.2226, longitude=33.8374 WHERE id='CNT-002';
UPDATE containers SET address='New Marina (demo point)', latitude=27.2230, longitude=33.8382 WHERE id='CNT-003';
UPDATE containers SET address='El Kawther (demo point)', latitude=27.1787, longitude=33.8239 WHERE id='CNT-004';
UPDATE containers SET address='El Mamsha (demo point)', latitude=27.1755, longitude=33.8277 WHERE id='CNT-005';
UPDATE containers SET address='Airport Road (demo point)', latitude=27.1828, longitude=33.7992 WHERE id='CNT-006';
UPDATE containers SET address='Hadaba (demo point)', latitude=27.2342, longitude=33.8401 WHERE id='CNT-007';
UPDATE containers SET address='Corniche (demo point)', latitude=27.2465, longitude=33.8190 WHERE id='CNT-008';

COMMIT;
