const API_BASE_URL = "http://localhost:3000/api";
const BACKEND_BASE_URL = "http://localhost:3000";

const guatemalaCenter = [15.7835, -90.2308];
const defaultZoom = 7;

const map = L.map("map").setView(guatemalaCenter, defaultZoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

const categoriaSelect = document.getElementById("categoria");
const latitudInput = document.getElementById("latitud");
const longitudInput = document.getElementById("longitud");
const radioInput = document.getElementById("radio");

const btnFiltrarCategoria = document.getElementById("btnFiltrarCategoria");
const btnCargarTodos = document.getElementById("btnCargarTodos");
const btnBuscarCercanos = document.getElementById("btnBuscarCercanos");

map.on("click", (event) => {
  const { lat, lng } = event.latlng;
  latitudInput.value = lat.toFixed(6);
  longitudInput.value = lng.toFixed(6);
});

const limpiarMarcadores = () => {
  markersLayer.clearLayers();
};

const obtenerImagenPrincipal = (imagenes = []) => {
  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    return null;
  }

  const principal = imagenes.find((img) => img.es_principal);
  return principal || imagenes[0];
};

const construirPopup = (punto) => {
  const imagenPrincipal = obtenerImagenPrincipal(punto.imagenes);
  const imagenHtml = imagenPrincipal
    ? `<img src="${BACKEND_BASE_URL}${imagenPrincipal.ruta_archivo}" alt="${punto.nombre}" />`
    : "";

  const distanciaHtml =
    punto.distancia_metros !== undefined
      ? `<p><strong>Distancia:</strong> ${punto.distancia_metros} m</p>`
      : "";

  return `
    <div class="popup-card">
      ${imagenHtml}
      <h3>${punto.nombre}</h3>
      <p>${punto.descripcion || "Sin descripción"}</p>
      <p><strong>Lat:</strong> ${punto.latitud}</p>
      <p><strong>Lng:</strong> ${punto.longitud}</p>
      ${distanciaHtml}
      <span class="tag">${punto.categoria}</span>
    </div>
  `;
};

const renderizarPuntos = (puntos) => {
  limpiarMarcadores();

  if (!Array.isArray(puntos) || puntos.length === 0) {
    alert("No se encontraron puntos para mostrar.");
    return;
  }

  const bounds = [];

  puntos.forEach((punto) => {
    const marker = L.marker([punto.latitud, punto.longitud]);
    marker.bindPopup(construirPopup(punto));
    marker.addTo(markersLayer);

    bounds.push([punto.latitud, punto.longitud]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
};

const obtenerTodosLosPuntos = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/puntos`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudieron cargar los puntos");
    }

    renderizarPuntos(result.data);
  } catch (error) {
    console.error("Error cargando puntos:", error);
    alert("Error al cargar los puntos.");
  }
};

const obtenerPuntosPorCategoria = async (categoria) => {
  try {
    const response = await fetch(`${API_BASE_URL}/puntos/categoria/${encodeURIComponent(categoria)}`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudieron cargar los puntos por categoría");
    }

    renderizarPuntos(result.data);
  } catch (error) {
    console.error("Error filtrando por categoría:", error);
    alert("Error al filtrar por categoría.");
  }
};

const obtenerPuntosCercanos = async (lat, lng, radio) => {
  try {
    const url = `${API_BASE_URL}/puntos/cercanos?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radio=${encodeURIComponent(radio)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudieron cargar los puntos cercanos");
    }

    renderizarPuntos(result.data);
  } catch (error) {
    console.error("Error buscando cercanos:", error);
    alert("Error al buscar puntos cercanos.");
  }
};

btnFiltrarCategoria.addEventListener("click", () => {
  const categoria = categoriaSelect.value;

  if (!categoria) {
    alert("Selecciona una categoría.");
    return;
  }

  obtenerPuntosPorCategoria(categoria);
});

btnCargarTodos.addEventListener("click", () => {
  categoriaSelect.value = "";
  map.setView(guatemalaCenter, defaultZoom);
  obtenerTodosLosPuntos();
});

btnBuscarCercanos.addEventListener("click", () => {
  const lat = latitudInput.value.trim();
  const lng = longitudInput.value.trim();
  const radio = radioInput.value.trim();

  if (!lat || !lng || !radio) {
    alert("Debes completar latitud, longitud y radio.");
    return;
  }

  obtenerPuntosCercanos(lat, lng, radio);
});

obtenerTodosLosPuntos();