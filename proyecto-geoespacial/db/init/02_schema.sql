CREATE TABLE IF NOT EXISTS puntos_interes (
    puntos_interes_id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50) NOT NULL,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_categoria
ON puntos_interes (categoria);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_ubicacion
ON puntos_interes
USING GIST (ubicacion);