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
  const client = await pool.connect();

  try {
    const { nombre, descripcion, categoria, latitud, longitud } = req.body;
    const archivos = req.files || [];

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

    await client.query("BEGIN");

    const insertPuntoQuery = `
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

    const puntoValues = [
      nombre,
      descripcion || null,
      categoria,
      lat,
      lng,
    ];

    const puntoResult = await client.query(insertPuntoQuery, puntoValues);
    const punto = puntoResult.rows[0];

    const imagenesGuardadas = [];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const orden = i + 1;
      const esPrincipal = orden === 1;

      const rutaArchivo = `/uploads/puntos/${archivo.filename}`;

      const insertImagenQuery = `
        INSERT INTO puntos_interes_imagenes (
          puntos_interes_id,
          nombre_archivo,
          ruta_archivo,
          orden,
          es_principal
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          puntos_interes_imagenes_id,
          nombre_archivo,
          ruta_archivo,
          orden,
          es_principal;
      `;

      const imagenValues = [
        punto.puntos_interes_id,
        archivo.filename,
        rutaArchivo,
        orden,
        esPrincipal,
      ];

      const imagenResult = await client.query(insertImagenQuery, imagenValues);
      imagenesGuardadas.push(imagenResult.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      message: "Punto de interés creado correctamente",
      data: {
        ...punto,
        imagenes: imagenesGuardadas,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creando punto:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al crear el punto de interés",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerPuntos,
  obtenerPuntoPorId,
  crearPunto,
};