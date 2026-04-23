const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");

const {
  obtenerPuntos,
  obtenerPuntoPorId,
  obtenerPuntosPorCategoria,
  obtenerPuntosCercanos,
  crearPunto,
  actualizarPunto,
} = require("./puntos.controller");

router.get("/", obtenerPuntos);
router.get("/categoria/:categoria", obtenerPuntosPorCategoria);
router.get("/cercanos/buscar", obtenerPuntosCercanos);
router.get("/:id", obtenerPuntoPorId);

router.post("/", upload.array("imagenes", 5), crearPunto);
router.put("/:id", upload.array("imagenes", 5), actualizarPunto);

module.exports = router;