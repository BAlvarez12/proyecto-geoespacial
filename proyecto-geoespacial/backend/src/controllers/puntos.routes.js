const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");

const {
  obtenerPuntos,
  obtenerPuntoPorId,
  crearPunto,
} = require("../controllers/puntos.controller");

router.get("/", obtenerPuntos);
router.get("/:id", obtenerPuntoPorId);
router.post("/", upload.array("imagenes", 5), crearPunto);

module.exports = router;