# Sistema de registro y consulta de puntos de interés

Aplicación web contenedorizada para registrar y consultar puntos de interés geográficos.  
Permite visualizar sitios en un mapa, filtrarlos por categoría, buscarlos por cercanía y registrar nuevos puntos con imágenes.

## Tecnologías utilizadas

- PostgreSQL + PostGIS
- Node.js + Express
- Nginx
- Docker Compose

## Requisitos

- Docker
- Docker Compose (plugin `docker compose`)

## Configuración

Puedes partir del ejemplo versionado:

```bash
cp .env.example .env
```

En `.env.example` están las variables mínimas (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PORT`) y comentarios para uso opcional fuera de Docker. Tras copiar, edita `.env` y cambia al menos la contraseña y los nombres si lo prefieres.

Si ejecutas el backend **fuera** de Docker, descomenta y ajusta en `.env` `DB_HOST` y `POSTGRES_PORT` según tu PostgreSQL local.

Con **Docker Compose**, el servicio `backend` define por su cuenta `DB_HOST=db` y `POSTGRES_PORT=5432` para conectarse al contenedor de PostGIS; no hace falta repetirlos en `.env` para ese caso.

## Cómo ejecutar

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Abre en el navegador:

http://localhost

El frontend y las rutas `/api/` y `/uploads/` pasan por el contenedor Nginx, que hace de proxy hacia el backend.

## Funcionalidades principales

- Registrar puntos de interés
- Listar todos los puntos
- Filtrar por categoría
- Buscar puntos cercanos por coordenadas y radio
- Editar puntos existentes
- Subir imágenes asociadas a cada punto

## Datos iniciales

La base de datos carga datos de ejemplo la primera vez que se inicializa el volumen.  
El proyecto incluye **5** puntos de interés precargados en el seed SQL.

## Consideraciones

- Para reiniciar por completo la base de datos (borra el volumen con los datos):

```bash
docker compose down -v
docker compose up --build
```

## Cómo detener el sistema

```bash
docker compose down
```
