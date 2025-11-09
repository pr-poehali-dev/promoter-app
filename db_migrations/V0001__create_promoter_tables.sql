-- Таблица промоутеров
CREATE TABLE IF NOT EXISTS promoters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица маршрутов
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    promoter_id INTEGER REFERENCES promoters(id),
    route_date DATE NOT NULL,
    total_points INTEGER DEFAULT 0,
    completed_points INTEGER DEFAULT 0,
    total_leaflets INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица точек маршрута
CREATE TABLE IF NOT EXISTS route_points (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    address VARCHAR(500) NOT NULL,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    point_order INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    leaflets_distributed INTEGER DEFAULT 0,
    photo_url TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица ежедневных отчётов
CREATE TABLE IF NOT EXISTS daily_reports (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    report_date DATE NOT NULL,
    total_points INTEGER,
    completed_points INTEGER,
    total_leaflets INTEGER,
    report_data JSONB,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_routes_promoter_date ON routes(promoter_id, route_date);
CREATE INDEX IF NOT EXISTS idx_route_points_route ON route_points(route_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_route ON daily_reports(route_id);

-- Вставляем тестового промоутера
INSERT INTO promoters (name, phone) VALUES ('Иван Петров', '+79991234567');
