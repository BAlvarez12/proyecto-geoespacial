const pool = require("../config/db");

const obtenerPuntos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'puntos_interes_imagenes_id', pi.puntos_interes_imagenes_id,
              'nombre_archivo', pi.nombre_archivo,
              'ruta_archivo', pi.ruta_archivo,
              'orden', pi.orden,
              'es_principal', pi.es_principal
            )
            ORDER BY pi.orden
          ) FILTER (WHERE pi.puntos_interes_imagenes_id IS NOT NULL),
          '[]'::json
        ) AS imagenes
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      GROUP BY p.puntos_interes_id
      ORDER BY p.puntos_interes_id;
    `;

    const result = await pool.query(query);

    res.status(200).json({
      ok: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puntos:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al obtener los puntos de interés",
    });
  }
};

const obtenerPuntoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'puntos_interes_imagenes_id', pi.puntos_interes_imagenes_id,
              'nombre_archivo', pi.nombre_archivo,
              'ruta_archivo', pi.ruta_archivo,
              'orden', pi.orden,
              'es_principal', pi.es_principal
            )
            ORDER BY pi.orden
          ) FILTER (WHERE pi.puntos_interes_imagenes_id IS NOT NULL),
          '[]'::json
        ) AS imagenes
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      WHERE p.puntos_interes_id = $1
      GROUP BY p.puntos_interes_id;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Punto de interés no encontrado",
      });
    }

    res.status(200).json({
      ok: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error obteniendo punto:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al obtener el punto de interés",
    });
  }
};

const crearPunto = async (req, res) => {
  try {
    const { nombre, descripcion, categoria, latitud, longitud } = req.body;

    if (!nombre || !categoria || latitud === undefined || longitud === undefined) {
      return res.status(400).json({
        ok: false,
        message: "Nombre, categoría, latitud y longitud son obligatorios",
      });
    }

    const lat = Number(latitud);
    const lng = Number(longitud);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        ok: false,
        message: "Latitud y longitud deben ser números válidos",
      });
    }

    const query = `
      INSERT INTO puntos_interes (
        nombre,
        descripcion,
        categoria,
        latitud,
        longitud,
        ubicacion
      )
      VALUES (
        $1, $2, $3, $4, $5,
        ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography
      )
      RETURNING 
        puntos_interes_id,
        nombre,
        descripcion,
        categoria,
        latitud,
        longitud,
        created_at;
    `;

    const values = [
      nombre,
      descripcion || null,
      categoria,
      lat,
      lng,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      ok: true,
      message: "Punto de interés creado correctamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creando punto:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al crear el punto de interés",
    });
  }
};

const obtenerPuntosPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;

    if (!categoria) {
      return res.status(400).json({
        ok: false,
        message: "La categoría es obligatoria",
      });
    }

    const query = `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'puntos_interes_imagenes_id', pi.puntos_interes_imagenes_id,
              'nombre_archivo', pi.nombre_archivo,
              'ruta_archivo', pi.ruta_archivo,
              'orden', pi.orden,
              'es_principal', pi.es_principal
            )
            ORDER BY pi.orden
          ) FILTER (WHERE pi.puntos_interes_imagenes_id IS NOT NULL),
          '[]'::json
        ) AS imagenes
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      WHERE LOWER(p.categoria) = LOWER($1)
      GROUP BY p.puntos_interes_id
      ORDER BY p.puntos_interes_id;
    `;

    const result = await pool.query(query, [categoria]);

    res.status(200).json({
      ok: true,
      total: result.rows.length,
      categoria,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puntos por categoría:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al obtener los puntos por categoría",
    });
  }
};

const obtenerPuntosCercanos = async (req, res) => {
  try {
    const { lat, lng, radio } = req.query;

    if (lat === undefined || lng === undefined || radio === undefined) {
      return res.status(400).json({
        ok: false,
        message: "lat, lng y radio son obligatorios",
      });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radioNum = Number(radio);

    if (
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      Number.isNaN(radioNum)
    ) {
      return res.status(400).json({
        ok: false,
        message: "lat, lng y radio deben ser números válidos",
      });
    }

    if (radioNum <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El radio debe ser mayor a 0",
      });
    }

    const query = `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        ROUND(
          ST_Distance(
            p.ubicacion,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          )::numeric,
          2
        ) AS distancia_metros,
        COALESCE(
          json_agg(
            json_build_object(
              'puntos_interes_imagenes_id', pi.puntos_interes_imagenes_id,
              'nombre_archivo', pi.nombre_archivo,
              'ruta_archivo', pi.ruta_archivo,
              'orden', pi.orden,
              'es_principal', pi.es_principal
            )
            ORDER BY pi.orden
          ) FILTER (WHERE pi.puntos_interes_imagenes_id IS NOT NULL),
          '[]'::json
        ) AS imagenes
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      WHERE ST_DWithin(
        p.ubicacion,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      GROUP BY p.puntos_interes_id
      ORDER BY distancia_metros ASC;
    `;

    const result = await pool.query(query, [latNum, lngNum, radioNum]);

    res.status(200).json({
      ok: true,
      origen: {
        lat: latNum,
        lng: lngNum,
        radio_metros: radioNum,
      },
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puntos cercanos:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al obtener los puntos cercanos",
    });
  }
};

module.exports = {
  obtenerPuntos,
  obtenerPuntoPorId,
  crearPunto,
  obtenerPuntosPorCategoria,
  obtenerPuntosCercanos,
};