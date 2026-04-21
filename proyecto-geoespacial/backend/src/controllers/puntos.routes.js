const express = require("express");
const router = express.Router();

const {
  obtenerPuntos,
  obtenerPuntoPorId,
  crearPunto,
  obtenerPuntosPorCategoria,
  obtenerPuntosCercanos,
} = require("./puntos.controller");

router.get("/", obtenerPuntos);
router.get("/categoria/:categoria", obtenerPuntosPorCategoria);
router.get("/cercanos", obtenerPuntosCercanos);
router.get("/:id", obtenerPuntoPorId);
router.post("/", crearPunto);

module.exports = router;