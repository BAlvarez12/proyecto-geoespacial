INSERT INTO puntos_interes (nombre, descripcion, categoria, latitud, longitud, ubicacion)
VALUES
(
    'Palacio Nacional',
    'Edificio histórico y cultural en el centro de la ciudad',
    'cultural',
    14.641667,
    -90.513333,
    ST_SetSRID(ST_MakePoint(-90.513333, 14.641667), 4326)::geography
),
(
    'Zoológico La Aurora',
    'Parque zoológico y área recreativa',
    'natural',
    14.583200,
    -90.527500,
    ST_SetSRID(ST_MakePoint(-90.527500, 14.583200), 4326)::geography
),
(
    'Estación de Servicio Centro',
    'Gasolinera de servicio 24 horas',
    'otro',
    14.634900,
    -90.506900,
    ST_SetSRID(ST_MakePoint(-90.506900, 14.634900), 4326)::geography
),
(
    'Museo Nacional de Arqueología',
    'Museo con colecciones arqueológicas e históricas',
    'cultural',
    14.608000,
    -90.526200,
    ST_SetSRID(ST_MakePoint(-90.526200, 14.608000), 4326)::geography
),
(
    'Mercado Gastronómico Central',
    'Zona de comida típica y restaurantes locales',
    'gastronomico',
    14.640100,
    -90.513900,
    ST_SetSRID(ST_MakePoint(-90.513900, 14.640100), 4326)::geography
);