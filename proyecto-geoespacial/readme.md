# Sistema de Registro y Consulta de Puntos de Interés

Aplicación web contenerizada para registrar y consultar puntos de interés geográficos.  
Permite visualizar sitios en un mapa, filtrarlos por categoría, buscarlos por cercanía y registrar nuevos puntos con imágenes. 

## Tecnologías utilizadas

- PostgreSQL + PostGIS
- Node.js + Express
- Nginx
- Docker Compose 

## Requisitos

- Docker
- Docker Compose

## Configuración

Crear un archivo `.env` en la raíz del proyecto con este contenido:

```env
POSTGRES_DB=nombre_base_de_datos
POSTGRES_USER=usuario_base_de_datos
POSTGRES_PASSWORD=contraseña_base_de_datos
POSTGRES_PORT=5432
PORT=3000
DB_HOST=localhost

-------------------------------
Cómo ejecutar:

Desde la raíz del proyecto, ejecutar:

docker compose up --build

Luego abrir en el navegador:

http://localhost

El acceso se realiza a través del proxy web Nginx.

------------------------------------------------------

Funcionalidades principales:

Registrar puntos de interés
Listar todos los puntos
Filtrar por categoría
Buscar puntos cercanos por coordenadas y radio
Editar puntos existentes
Subir imágenes asociadas a cada punto
Datos iniciales

La base de datos carga automáticamente datos de ejemplo la primera vez que se inicializa el sistema.
Se incluyen al menos 5 puntos de interés precargados.

Consideraciones
DB_HOST debe ser db porque el backend se conecta al contenedor de base de datos por el nombre del servicio.
Si deseas reiniciar completamente la base de datos, puedes ejecutar:

docker compose down -v
docker compose up --build

Cómo detener el sistema
docker compose down