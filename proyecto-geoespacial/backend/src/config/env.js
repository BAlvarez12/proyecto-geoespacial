const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

/**
 * .env en la raíz del repo (junto a /backend, /frontend), no dentro de /backend.
 * Desde este archivo: backend/src/config -> subir 3 niveles = raíz del proyecto.
 */
const envPath = path.resolve(__dirname, "../../../.env");

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn("[env] No se pudo leer el archivo .env:", result.error.message);
  }
} else if (!process.env.DB_HOST && !process.env.POSTGRES_USER) {
  console.warn(
    "[env] No se encontró .env en",
    envPath,
    "- se usarán solo variables de entorno del sistema (p. ej. Docker)."
  );
}

module.exports = { envPath };
