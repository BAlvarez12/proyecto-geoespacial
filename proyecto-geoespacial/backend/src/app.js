const express = require("express");
const cors = require("cors");
const path = require("path");

const puntosRoutes = require("./controllers/puntos.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API geoespacial funcionando correctamente",
  });
});

app.use("/api/puntos", puntosRoutes);

module.exports = app;