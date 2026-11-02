CREATE TABLE IF NOT EXISTS auth_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_verification_expiry_idx ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS containers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity_kg INTEGER NOT NULL DEFAULT 100,
  fill_percent INTEGER NOT NULL DEFAULT 0 CHECK (fill_percent BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal','warning','full')),
  waste_type TEXT NOT NULL DEFAULT 'mixed',
  last_collection TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_sent BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS measurements (
  id BIGSERIAL PRIMARY KEY,
  container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  weight_kg NUMERIC(7,2) NOT NULL,
  fill_percent INTEGER NOT NULL CHECK (fill_percent BETWEEN 0 AND 100),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS measurements_container_date_idx ON measurements(container_id, measured_at DESC);
CREATE TABLE IF NOT EXISTS routes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  distance_km NUMERIC(7,2) NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO containers (id,name,address,latitude,longitude,capacity_kg,fill_percent,status,waste_type)
VALUES
('CNT-001','Контейнер 01','вул. Дерибасівська · демо-точка',46.4844,30.7344,120,92,'full','mixed'),
('CNT-002','Контейнер 02','Приморський бульвар · демо-точка',46.4886,30.7419,100,78,'warning','plastic'),
('CNT-003','Контейнер 03','вул. Преображенська · демо-точка',46.4782,30.7320,120,64,'normal','mixed'),
('CNT-004','Контейнер 04','вул. Михайла Грушевського · демо-точка',46.4742,30.7144,100,38,'normal','paper'),
('CNT-005','Контейнер 05','Аркадійська алея · демо-точка',46.4304,30.7620,150,87,'full','mixed'),
('CNT-006','Контейнер 06','Французький бульвар · демо-точка',46.4440,30.7580,100,52,'normal','glass'),
('CNT-007','Контейнер 07','Миколаївська дорога · демо-точка',46.5160,30.7280,120,71,'warning','mixed'),
('CNT-008','Контейнер 08','Залізничний вокзал · демо-точка',46.4686,30.7408,100,24,'normal','plastic'),
('CNT-009','Контейнер 09','вул. Космонавтів · демо-точка',46.4355,30.7110,120,58,'normal','paper'),
('CNT-010','Контейнер 10','вул. Академіка Корольова · демо-точка',46.4055,30.7215,120,76,'warning','glass')
ON CONFLICT (id) DO NOTHING;
INSERT INTO measurements (container_id,weight_kg,fill_percent,measured_at)
SELECT id, capacity_kg * fill_percent / 100.0, fill_percent, NOW() - INTERVAL '15 minutes' FROM containers
ON CONFLICT DO NOTHING;
INSERT INTO routes (name,status,distance_km,estimated_minutes) VALUES ('Центральный маршрут','planned',12.4,48) ON CONFLICT DO NOTHING;
