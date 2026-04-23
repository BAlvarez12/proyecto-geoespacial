require("./config/env");
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Servicio activado correctamente");

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error conectando a la base de datos:", error.message);
  }
};

startServer();