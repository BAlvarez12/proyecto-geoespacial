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

CREATE TABLE IF NOT EXISTS puntos_interes_imagenes (
    puntos_interes_imagenes_id SERIAL PRIMARY KEY,
    puntos_interes_id INT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    orden SMALLINT NOT NULL DEFAULT 1,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_puntos_interes_imagenes_punto
        FOREIGN KEY (puntos_interes_id)
        REFERENCES puntos_interes (puntos_interes_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_orden_imagen
        CHECK (orden BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_punto_imagen_orden
ON puntos_interes_imagenes (puntos_interes_id, orden);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_imagenes_punto
ON puntos_interes_imagenes (puntos_interes_id);