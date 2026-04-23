const pool = require("../config/db");

const construirImagenesJson = `
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
`;

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
        ${construirImagenesJson}
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
        ${construirImagenesJson}
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

const obtenerPuntosPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;

    const query = `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        ${construirImagenesJson}
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
      categoria,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puntos por categoría:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al filtrar puntos por categoría",
    });
  }
};

const obtenerPuntosCercanos = async (req, res) => {
  try {
    const { lat, lng, radio } = req.query;

    if (lat === undefined || lng === undefined || radio === undefined) {
      return res.status(400).json({
        ok: false,
        message: "Los parámetros lat, lng y radio son obligatorios",
      });
    }

    const latitud = Number(lat);
    const longitud = Number(lng);
    const radioMetros = Number(radio);

    if (
      Number.isNaN(latitud) ||
      Number.isNaN(longitud) ||
      Number.isNaN(radioMetros)
    ) {
      return res.status(400).json({
        ok: false,
        message: "lat, lng y radio deben ser valores numéricos válidos",
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
        ${construirImagenesJson}
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

    const values = [latitud, longitud, radioMetros];
    const result = await pool.query(query, values);

    res.status(200).json({
      ok: true,
      origen: {
        latitud,
        longitud,
      },
      radio_metros: radioMetros,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puntos cercanos:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al buscar puntos cercanos",
    });
  }
};

const crearPunto = async (req, res) => {
  const client = await pool.connect();

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

    const nuevasImagenes = req.files ? req.files.length : 0;
    if (nuevasImagenes > 5) {
      return res.status(400).json({
        ok: false,
        message: "Solo puedes subir un máximo de 5 imágenes por sitio.",
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
      RETURNING puntos_interes_id;
    `;

    const puntoResult = await client.query(insertPuntoQuery, [
      nombre,
      descripcion || null,
      categoria,
      lat,
      lng,
    ]);

    const puntoId = puntoResult.rows[0].puntos_interes_id;

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        await client.query(
          `
          INSERT INTO puntos_interes_imagenes (
            puntos_interes_id,
            nombre_archivo,
            ruta_archivo,
            orden,
            es_principal
          )
          VALUES ($1, $2, $3, $4, $5);
          `,
          [
            puntoId,
            file.filename,
            `/uploads/puntos/${file.filename}`,
            i + 1,
            i === 0,
          ]
        );
      }
    }

    await client.query("COMMIT");

    const puntoCompleto = await pool.query(
      `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        ${construirImagenesJson}
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      WHERE p.puntos_interes_id = $1
      GROUP BY p.puntos_interes_id;
      `,
      [puntoId]
    );

    res.status(201).json({
      ok: true,
      message: "Punto de interés creado correctamente",
      data: puntoCompleto.rows[0],
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

const actualizarPunto = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
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

    const existe = await client.query(
      `SELECT puntos_interes_id FROM puntos_interes WHERE puntos_interes_id = $1`,
      [id]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Punto de interés no encontrado",
      });
    }

    // Multer/busboy normaliza "imagenes_eliminar[]" a la clave "imagenes_eliminar" (array o string).
    let imagenesEliminar =
      req.body.imagenes_eliminar ?? req.body["imagenes_eliminar[]"] ?? [];

    if (!Array.isArray(imagenesEliminar)) {
      imagenesEliminar = [imagenesEliminar];
    }

    imagenesEliminar = imagenesEliminar
      .map((imagenId) => Number(imagenId))
      .filter((imagenId) => !Number.isNaN(imagenId));

    await client.query("BEGIN");

    await client.query(
      `
      UPDATE puntos_interes
      SET
        nombre = $1,
        descripcion = $2,
        categoria = $3,
        latitud = $4,
        longitud = $5,
        ubicacion = ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography
      WHERE puntos_interes_id = $6;
      `,
      [nombre, descripcion || null, categoria, lat, lng, id]
    );

    if (imagenesEliminar.length > 0) {
      await client.query(
        `
        DELETE FROM puntos_interes_imagenes
        WHERE puntos_interes_id = $1
          AND puntos_interes_imagenes_id = ANY($2::int[]);
        `,
        [id, imagenesEliminar]
      );
    }

    const imagenesRestantes = await client.query(
      `
      SELECT puntos_interes_imagenes_id
      FROM puntos_interes_imagenes
      WHERE puntos_interes_id = $1
      ORDER BY orden, puntos_interes_imagenes_id;
      `,
      [id]
    );

    for (let i = 0; i < imagenesRestantes.rows.length; i++) {
      const imagen = imagenesRestantes.rows[i];

      await client.query(
        `
        UPDATE puntos_interes_imagenes
        SET orden = $1,
            es_principal = $2
        WHERE puntos_interes_imagenes_id = $3;
        `,
        [i + 1, i === 0, imagen.puntos_interes_imagenes_id]
      );
    }

    const conteoActual = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM puntos_interes_imagenes
      WHERE puntos_interes_id = $1;
      `,
      [id]
    );

    const totalActual = conteoActual.rows[0].total;
    const nuevasImagenes = req.files ? req.files.length : 0;
    const totalFinal = totalActual + nuevasImagenes;

    if (totalFinal > 5) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        message: `Después de las eliminaciones este sitio quedaría con ${totalActual} imagen(es). Solo puedes guardar un máximo de 5 imágenes por sitio.`,
      });
    }

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        await client.query(
          `
          INSERT INTO puntos_interes_imagenes (
            puntos_interes_id,
            nombre_archivo,
            ruta_archivo,
            orden,
            es_principal
          )
          VALUES ($1, $2, $3, $4, $5);
          `,
          [
            id,
            file.filename,
            `/uploads/puntos/${file.filename}`,
            totalActual + i + 1,
            false,
          ]
        );
      }
    }

    const imagenesFinales = await client.query(
      `
      SELECT puntos_interes_imagenes_id
      FROM puntos_interes_imagenes
      WHERE puntos_interes_id = $1
      ORDER BY orden, puntos_interes_imagenes_id;
      `,
      [id]
    );

    for (let i = 0; i < imagenesFinales.rows.length; i++) {
      const imagen = imagenesFinales.rows[i];

      await client.query(
        `
        UPDATE puntos_interes_imagenes
        SET orden = $1,
            es_principal = $2
        WHERE puntos_interes_imagenes_id = $3;
        `,
        [i + 1, i === 0, imagen.puntos_interes_imagenes_id]
      );
    }

    await client.query("COMMIT");

    const puntoActualizado = await pool.query(
      `
      SELECT 
        p.puntos_interes_id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.latitud,
        p.longitud,
        p.created_at,
        ${construirImagenesJson}
      FROM puntos_interes p
      LEFT JOIN puntos_interes_imagenes pi
        ON pi.puntos_interes_id = p.puntos_interes_id
      WHERE p.puntos_interes_id = $1
      GROUP BY p.puntos_interes_id;
      `,
      [id]
    );

    res.status(200).json({
      ok: true,
      message: "Punto de interés actualizado correctamente",
      data: puntoActualizado.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error actualizando punto:", error.message);
    res.status(500).json({
      ok: false,
      message: "Error al actualizar el punto de interés",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerPuntos,
  obtenerPuntoPorId,
  obtenerPuntosPorCategoria,
  obtenerPuntosCercanos,
  crearPunto,
  actualizarPunto,
};