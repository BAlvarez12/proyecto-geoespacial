const API_BASE_URL = "/api";
const BACKEND_BASE_URL = "";

const guatemalaCenter = [15.7835, -90.2308];
const defaultZoom = 7;

const map = L.map("map").setView(guatemalaCenter, defaultZoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);
let userMarker = null;
let mapClickMarker = null;
let capaRuta = null;
let ultimaPosicionConocida = null;
let selectedMapPoint = null;
let puntosActuales = [];
let puntoSeleccionadoDetalle = null;
let modoEdicion = false;
let puntoEditandoId = null;
let imagenesMarcadasParaEliminar = [];

// Inputs
const categoriaSelect = document.getElementById("categoria");
const latitudInput = document.getElementById("latitud");
const longitudInput = document.getElementById("longitud");
const radioInput = document.getElementById("radio");
const buscarNombreInput = document.getElementById("buscarNombre");

// Botones
const btnFiltrarCategoria = document.getElementById("btnFiltrarCategoria");
const btnCargarTodos = document.getElementById("btnCargarTodos");
const btnBuscarCercanos = document.getElementById("btnBuscarCercanos");
const btnBuscarNombre = document.getElementById("btnBuscarNombre");
const btnMiUbicacion = document.getElementById("btnMiUbicacion");
const btnUsarMiUbicacionFiltro = document.getElementById("btnUsarMiUbicacionFiltro");
const btnAbrirRegistroDesdeMapa = document.getElementById("btnAbrirRegistroDesdeMapa");
const btnIrAlSitio = document.getElementById("btnIrAlSitio");
const btnEditarSitio = document.getElementById("btnEditarSitio");

// Resultados
const listaResultados = document.getElementById("listaResultados");
const resultadoCantidad = document.getElementById("resultadoCantidad");

// Modales
const modalDetalle = document.getElementById("modalDetalle");
const modalRegistro = document.getElementById("modalRegistro");
const modalConfirmacion = document.getElementById("modalConfirmacion");
const quickMapAction = document.getElementById("quickMapAction");
const toastContainer = document.getElementById("toastContainer");
const confirmacionMensaje = document.getElementById("confirmacionMensaje");
const btnConfirmacionAceptar = document.getElementById("btnConfirmacionAceptar");
const btnConfirmacionCancelar = document.getElementById("btnConfirmacionCancelar");

// Detalle
const detalleNombre = document.getElementById("detalleNombre");
const detalleCategoria = document.getElementById("detalleCategoria");
const detalleDescripcion = document.getElementById("detalleDescripcion");
const detalleLatitud = document.getElementById("detalleLatitud");
const detalleLongitud = document.getElementById("detalleLongitud");
const detalleGaleria = document.getElementById("detalleGaleria");

// Formulario
const tituloModalRegistro = document.getElementById("tituloModalRegistro");
const formRegistroPunto = document.getElementById("formRegistroPunto");
const registroNombre = document.getElementById("registroNombre");
const registroDescripcion = document.getElementById("registroDescripcion");
const registroCategoria = document.getElementById("registroCategoria");
const registroImagenes = document.getElementById("registroImagenes");
const registroLatitud = document.getElementById("registroLatitud");
const registroLongitud = document.getElementById("registroLongitud");
const registroImagenesAyuda = document.getElementById("registroImagenesAyuda");
const bloqueImagenesExistentes = document.getElementById("bloqueImagenesExistentes");
const registroImagenesExistentes = document.getElementById("registroImagenesExistentes");

// Helpers
const abrirModal = (modal) => modal.classList.remove("hidden");
const cerrarModal = (modal) => modal.classList.add("hidden");
const mostrarQuickAction = () => quickMapAction.classList.remove("hidden");
const ocultarQuickAction = () => quickMapAction.classList.add("hidden");
const limpiarMarcadores = () => markersLayer.clearLayers();

const limpiarRutaEnMapa = () => {
  if (capaRuta) {
    map.removeLayer(capaRuta);
    capaRuta = null;
  }
};
const formatearCoordenada = (valor) => Number(valor).toFixed(6);

let resolverConfirmacion = null;

const iconosToast = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "x",
};

const mostrarMensaje = (mensaje, tipo = "info", duracionMs) => {
  if (!toastContainer) return;

  const tiempo =
    duracionMs ??
    (tipo === "error" ? 5200 : tipo === "warning" ? 4500 : 3800);

  const toast = document.createElement("div");
  toast.className = `toast toast--${tipo}`;

  const icono = document.createElement("span");
  icono.className = "toast__icon";
  icono.textContent = iconosToast[tipo] || iconosToast.info;

  const texto = document.createElement("span");
  texto.className = "toast__message";
  texto.textContent = mensaje;

  toast.appendChild(icono);
  toast.appendChild(texto);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, tiempo);
};

const confirmarAccion = (mensaje) => {
  if (!modalConfirmacion || !confirmacionMensaje) {
    return Promise.resolve(window.confirm(mensaje));
  }

  confirmacionMensaje.textContent = mensaje;
  abrirModal(modalConfirmacion);

  return new Promise((resolve) => {
    resolverConfirmacion = resolve;
  });
};

btnConfirmacionAceptar?.addEventListener("click", () => {
  cerrarModal(modalConfirmacion);
  if (resolverConfirmacion) resolverConfirmacion(true);
  resolverConfirmacion = null;
});

btnConfirmacionCancelar?.addEventListener("click", () => {
  cerrarModal(modalConfirmacion);
  if (resolverConfirmacion) resolverConfirmacion(false);
  resolverConfirmacion = null;
});

const obtenerImagenPrincipal = (imagenes = []) => {
  if (!Array.isArray(imagenes) || imagenes.length === 0) return null;
  return imagenes.find((img) => img.es_principal) || imagenes[0];
};

const actualizarCantidadResultados = (cantidad) => {
  resultadoCantidad.textContent = String(cantidad ?? 0);
};

const construirPopup = (punto) => {
  const imagenPrincipal = obtenerImagenPrincipal(punto.imagenes);
  const imagenHtml = imagenPrincipal
    ? `<div class="popup-card__media"><img src="${BACKEND_BASE_URL}${imagenPrincipal.ruta_archivo}" alt="" onerror="this.parentElement.remove()" /></div>`
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

const crearIconoBonito = (punto) => {
  const imagenPrincipal = obtenerImagenPrincipal(punto.imagenes);
  const thumbHtml = imagenPrincipal
    ? `<img src="${BACKEND_BASE_URL}${imagenPrincipal.ruta_archivo}" alt="" class="marker-bubble-thumb" onerror="this.onerror=null;this.outerHTML='<div class=\\'marker-bubble-thumb marker-bubble-thumb--empty\\' aria-hidden=\\'true\\'></div>'" />`
    : `<div class="marker-bubble-thumb marker-bubble-thumb--empty" aria-hidden="true"></div>`;

  const nombre = punto.nombre.length > 22
    ? `${punto.nombre.slice(0, 22)}...`
    : punto.nombre;

  return L.divIcon({
    className: "custom-point-marker",
    html: `
      <div class="marker-anchor-wrap">
        <div class="marker-bubble">
          ${thumbHtml}
          <span>${nombre}</span>
        </div>
        <div class="marker-pointer"></div>
        <div class="marker-pin-dot"></div>
      </div>
    `,
    iconSize: [180, 72],
    iconAnchor: [90, 72],
    popupAnchor: [0, -70],
  });
};

const renderizarImagenesExistentesEnFormulario = (imagenes = []) => {
  registroImagenesExistentes.innerHTML = "";
  imagenesMarcadasParaEliminar = [];

  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    registroImagenesExistentes.innerHTML = `
      <div class="empty-state empty-state--small">
        Este sitio no tiene imágenes registradas.
      </div>
    `;
    return;
  }

  imagenes.forEach((imagen) => {
    const card = document.createElement("div");
    card.className = "edit-image-card";

    card.innerHTML = `
      <img class="edit-image-card-thumb" src="${BACKEND_BASE_URL}${imagen.ruta_archivo}" alt="${imagen.nombre_archivo || "Imagen"}" />
      <div class="edit-image-card__footer">
        <div class="edit-image-card__meta">
          <strong>${imagen.es_principal ? "Principal" : "Secundaria"}</strong>
          <span>Orden: ${imagen.orden}</span>
        </div>
        <label class="edit-image-card__delete">
          <input type="checkbox" value="${imagen.puntos_interes_imagenes_id}" />
          Eliminar
        </label>
      </div>
    `;

    const imgThumb = card.querySelector(".edit-image-card-thumb");
    imgThumb?.addEventListener("error", () => {
      const vacio = document.createElement("div");
      vacio.className = "edit-image-card-thumb edit-image-card-thumb--empty";
      vacio.setAttribute("aria-hidden", "true");
      imgThumb.replaceWith(vacio);
    });

    const checkbox = card.querySelector('input[type="checkbox"]');

    checkbox.addEventListener("change", (event) => {
      const imagenId = Number(event.target.value);

      if (event.target.checked) {
        if (!imagenesMarcadasParaEliminar.includes(imagenId)) {
          imagenesMarcadasParaEliminar.push(imagenId);
        }
      } else {
        imagenesMarcadasParaEliminar = imagenesMarcadasParaEliminar.filter(
          (id) => id !== imagenId
        );
      }

      actualizarAyudaImagenes();
    });

    registroImagenesExistentes.appendChild(card);
  });
};

const limpiarFormularioRegistro = () => {
  registroNombre.value = "";
  registroDescripcion.value = "";
  registroCategoria.value = "";
  registroImagenes.value = "";
  registroLatitud.value = "";
  registroLongitud.value = "";
  imagenesMarcadasParaEliminar = [];

  registroImagenesExistentes.innerHTML = `
    <div class="empty-state empty-state--small">
      Este sitio no tiene imágenes registradas.
    </div>
  `;
};

const prepararFormularioCrear = () => {
  modoEdicion = false;
  puntoEditandoId = null;
  tituloModalRegistro.textContent = "Registrar nuevo sitio";
  bloqueImagenesExistentes.style.display = "none";
  imagenesMarcadasParaEliminar = [];
  actualizarAyudaImagenes();
};

const prepararFormularioEditar = () => {
  tituloModalRegistro.textContent = "Editar sitio";
  bloqueImagenesExistentes.style.display = "block";
  actualizarAyudaImagenes();
};

const actualizarAyudaImagenes = () => {
  if (!modoEdicion || !puntoSeleccionadoDetalle) {
    registroImagenesAyuda.textContent = "Puedes seleccionar varias imágenes. Máximo 5 por sitio.";
    return;
  }

  const totalActual = Array.isArray(puntoSeleccionadoDetalle.imagenes)
    ? puntoSeleccionadoDetalle.imagenes.length
    : 0;

  const totalEliminar = imagenesMarcadasParaEliminar.length;
  const disponibles = 5 - (totalActual - totalEliminar);

  registroImagenesAyuda.textContent =
    `Actualmente tiene ${totalActual} imagen(es). Marcaste ${totalEliminar} para eliminar. Puedes subir hasta ${Math.max(0, disponibles)} imagen(es) nueva(s).`;
};

const renderizarResultados = (puntos) => {
  listaResultados.innerHTML = "";

  if (!Array.isArray(puntos) || puntos.length === 0) {
    listaResultados.innerHTML = `
      <div class="empty-state">
        No se encontraron resultados.
      </div>
    `;
    actualizarCantidadResultados(0);
    return;
  }

  actualizarCantidadResultados(puntos.length);

  puntos.forEach((punto) => {
    const imagenPrincipal = obtenerImagenPrincipal(punto.imagenes);

    const distanciaTag =
      punto.distancia_metros !== undefined
        ? `<span class="tag tag--distance">${punto.distancia_metros} m</span>`
        : "";

    const card = document.createElement("div");
    card.className = "result-card";

    const top = document.createElement("div");
    top.className = "result-card__top";

    const cover = document.createElement("div");
    cover.className = "result-card__cover";

    if (imagenPrincipal) {
      const img = document.createElement("img");
      img.className = "result-card__image";
      img.alt = punto.nombre || "";
      img.src = `${BACKEND_BASE_URL}${imagenPrincipal.ruta_archivo}`;
      img.addEventListener("error", () => {
        img.remove();
        const ph = document.createElement("div");
        ph.className = "result-card__image result-card__image--placeholder";
        ph.setAttribute("aria-hidden", "true");
        cover.appendChild(ph);
      });
      cover.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "result-card__image result-card__image--placeholder";
      ph.setAttribute("aria-hidden", "true");
      cover.appendChild(ph);
    }

    const body = document.createElement("div");
    body.className = "result-card__body";
    body.innerHTML = `
          <h3>${punto.nombre}</h3>
          <p>${punto.descripcion || "Sin descripción"}</p>
          <div class="result-card__meta">
            <span class="tag">${punto.categoria}</span>
            ${distanciaTag}
          </div>
        `;

    top.appendChild(cover);
    top.appendChild(body);
    card.appendChild(top);

    card.addEventListener("click", () => {
      map.setView([punto.latitud, punto.longitud], 15);
      abrirDetallePunto(punto);
    });

    listaResultados.appendChild(card);
  });
};

const abrirDetallePunto = (punto) => {
  puntoSeleccionadoDetalle = punto;

  detalleNombre.textContent = punto.nombre || "Detalle del sitio";
  detalleCategoria.textContent = punto.categoria || "";
  detalleDescripcion.textContent = punto.descripcion || "Sin descripción";
  detalleLatitud.textContent = punto.latitud ?? "-";
  detalleLongitud.textContent = punto.longitud ?? "-";

  detalleGaleria.innerHTML = "";

  if (Array.isArray(punto.imagenes) && punto.imagenes.length > 0) {
    punto.imagenes.forEach((img) => {
      const image = document.createElement("img");
      image.src = `${BACKEND_BASE_URL}${img.ruta_archivo}`;
      image.alt = img.nombre_archivo || punto.nombre;
      image.addEventListener("error", () => {
        image.remove();
        if (detalleGaleria.querySelectorAll("img").length === 0) {
          detalleGaleria.innerHTML =
            `<div class="detail-gallery__empty detail-gallery__empty--muted" aria-hidden="true"></div>`;
        }
      });
      detalleGaleria.appendChild(image);
    });
  } else {
    detalleGaleria.innerHTML =
      `<div class="detail-gallery__empty detail-gallery__empty--muted" aria-hidden="true"></div>`;
  }

  abrirModal(modalDetalle);
};

const abrirFormularioEdicion = (punto) => {
  modoEdicion = true;
  puntoEditandoId = punto.puntos_interes_id;
  puntoSeleccionadoDetalle = punto;
  prepararFormularioEditar();

  registroNombre.value = punto.nombre || "";
  registroDescripcion.value = punto.descripcion || "";
  registroCategoria.value = punto.categoria || "";
  registroLatitud.value = punto.latitud || "";
  registroLongitud.value = punto.longitud || "";
  registroImagenes.value = "";

  renderizarImagenesExistentesEnFormulario(punto.imagenes || []);
  actualizarAyudaImagenes();

  cerrarModal(modalDetalle);
  abrirModal(modalRegistro);
};

const renderizarPuntos = (puntos) => {
  limpiarRutaEnMapa();
  puntosActuales = Array.isArray(puntos) ? puntos : [];
  limpiarMarcadores();
  renderizarResultados(puntosActuales);

  if (!Array.isArray(puntosActuales) || puntosActuales.length === 0) {
    mostrarMensaje("No se encontraron puntos para mostrar.", "warning");
    return;
  }

  const bounds = [];

  puntosActuales.forEach((punto) => {
    const marker = L.marker([punto.latitud, punto.longitud], {
      icon: crearIconoBonito(punto),
    });

    marker.bindPopup(construirPopup(punto));

    marker.on("mouseover", () => {
      marker.openPopup();
    });

    marker.on("mouseout", () => {
      marker.closePopup();
    });

    marker.on("click", () => {
      abrirDetallePunto(punto);
    });

    marker.addTo(markersLayer);
    bounds.push([punto.latitud, punto.longitud]);
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 15,
    });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 15);
  }
};

// API
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
    mostrarMensaje("Error al cargar los puntos.", "error");
  }
};

const obtenerPuntosPorCategoria = async (categoria) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/puntos/categoria/${encodeURIComponent(categoria)}`
    );
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudieron cargar los puntos por categoría");
    }

    renderizarPuntos(result.data);
  } catch (error) {
    console.error("Error filtrando por categoría:", error);
    mostrarMensaje("Error al filtrar por categoría.", "error");
  }
};

const obtenerPuntosCercanos = async (lat, lng, radio) => {
  try {
    const url = `${API_BASE_URL}/puntos/cercanos/buscar?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radio=${encodeURIComponent(radio)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudieron cargar los puntos cercanos");
    }

    renderizarPuntos(result.data);
  } catch (error) {
    console.error("Error buscando cercanos:", error);
    mostrarMensaje("Error al buscar puntos cercanos.", "error");
  }
};

const buscarPuntosPorNombre = async (nombre) => {
  const filtrados = puntosActuales.filter((punto) =>
    punto.nombre.toLowerCase().includes(nombre.toLowerCase())
  );

  renderizarResultados(filtrados);

  if (filtrados.length > 0) {
    const bounds = filtrados.map((p) => [p.latitud, p.longitud]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }
};

const crearNuevoPunto = async (payload, archivos = []) => {
  const formData = new FormData();

  formData.append("nombre", payload.nombre);
  formData.append("descripcion", payload.descripcion || "");
  formData.append("categoria", payload.categoria);
  formData.append("latitud", payload.latitud);
  formData.append("longitud", payload.longitud);

  archivos.forEach((archivo) => {
    formData.append("imagenes", archivo);
  });

  const response = await fetch(`${API_BASE_URL}/puntos`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No se pudo registrar el punto");
  }

  return result.data;
};

const actualizarPunto = async (id, payload, archivos = [], imagenesEliminar = []) => {
  const formData = new FormData();

  formData.append("nombre", payload.nombre);
  formData.append("descripcion", payload.descripcion || "");
  formData.append("categoria", payload.categoria);
  formData.append("latitud", payload.latitud);
  formData.append("longitud", payload.longitud);

  archivos.forEach((archivo) => {
    formData.append("imagenes", archivo);
  });

  imagenesEliminar.forEach((imagenId) => {
    formData.append("imagenes_eliminar[]", imagenId);
  });

  const response = await fetch(`${API_BASE_URL}/puntos/${id}`, {
    method: "PUT",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No se pudo actualizar el punto");
  }

  return result.data;
};

// Ubicación
const solicitarPosicion = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

const mensajeErrorGeolocalizacion = (code) => {
  switch (code) {
    case 1:
      return "Ubicación bloqueada o denegada. Revisa el candado de la barra de direcciones y permite el permiso de ubicación.";
    case 2:
      return "El dispositivo no pudo determinar la posición. Activa el GPS o la ubicación aproximada e inténtalo de nuevo.";
    case 3:
      return "Tiempo agotado al obtener la ubicación. Prueba en otra red o acércate a una ventana (mejor señal GPS).";
    default:
      return "No fue posible obtener tu ubicación.";
  }
};

const ubicacionRequiereHttps = () => {
  const host = window.location.hostname;
  const esLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  return !window.isSecureContext && !esLocal;
};

const obtenerUbicacionConReintento = async () => {
  const intentos = [
    { enableHighAccuracy: false, timeout: 26000, maximumAge: 120000 },
    { enableHighAccuracy: false, timeout: 40000, maximumAge: 0 },
  ];

  let ultimoError = null;

  for (const opts of intentos) {
    try {
      return await solicitarPosicion(opts);
    } catch (err) {
      ultimoError = err;
      if (err && err.code === 1) {
        throw err;
      }
    }
  }

  throw ultimoError || new Error("Geolocalización no disponible");
};

const ubicarUsuarioEnMapa = async () => {
  if (!navigator.geolocation) {
    mostrarMensaje("Tu navegador no soporta geolocalización.", "warning");
    return;
  }

  if (ubicacionRequiereHttps()) {
    mostrarMensaje(
      "Para usar tu ubicación, abre esta página con HTTPS (o en localhost). En HTTP el navegador suele bloquear la geolocalización.",
      "warning",
      7000
    );
    return;
  }

  try {
    const position = await obtenerUbicacionConReintento();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (userMarker) {
      map.removeLayer(userMarker);
    }

    userMarker = L.circleMarker([lat, lng], {
      radius: 10,
      weight: 3,
      color: "#0f766e",
      fillColor: "#2dd4bf",
      fillOpacity: 0.9,
    }).addTo(map);

    userMarker.bindPopup("Estás aquí").openPopup();
    map.setView([lat, lng], 15);

    latitudInput.value = lat.toFixed(6);
    longitudInput.value = lng.toFixed(6);
    ultimaPosicionConocida = { lat, lng };
    mostrarMensaje("Ubicación obtenida correctamente.", "success", 2800);
  } catch (error) {
    console.error("Error obteniendo ubicación:", error);
    const code = error && typeof error.code === "number" ? error.code : 0;
    mostrarMensaje(mensajeErrorGeolocalizacion(code), "error", 6500);
  }
};

const solicitarRutaOsrm = async (origen, destino) => {
  const a = `${origen.lng},${origen.lat}`;
  const b = `${destino.lng},${destino.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${a};${b}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Error al consultar el servicio de rutas");
  }
  const data = await res.json();
  if (!data.routes || !data.routes[0]) {
    throw new Error("Sin ruta entre los puntos");
  }
  return data.routes[0];
};

const obtenerOrigenParaRuta = async () => {
  if (ultimaPosicionConocida) {
    return {
      lat: ultimaPosicionConocida.lat,
      lng: ultimaPosicionConocida.lng,
      origenGps: true,
    };
  }
  if (!navigator.geolocation || ubicacionRequiereHttps()) {
    const c = map.getCenter();
    return { lat: c.lat, lng: c.lng, origenGps: false };
  }
  try {
    const pos = await obtenerUbicacionConReintento();
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    ultimaPosicionConocida = { lat, lng };
    return { lat, lng, origenGps: true };
  } catch {
    const c = map.getCenter();
    return { lat: c.lat, lng: c.lng, origenGps: false };
  }
};

const trazarRutaHaciaSitio = async (destinoLat, destinoLng) => {
  limpiarRutaEnMapa();

  const origenCompleto = await obtenerOrigenParaRuta();
  const { origenGps, ...origen } = origenCompleto;
  const destino = { lat: destinoLat, lng: destinoLng };

  if (!origenGps) {
    mostrarMensaje(
      "No se pudo usar tu ubicación actual. La ruta parte del centro del mapa (usa «Mi ubicación» antes para partir de donde estás).",
      "warning",
      5500
    );
  }

  try {
    const route = await solicitarRutaOsrm(origen, destino);
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    capaRuta = L.polyline(coords, {
      color: "#0d9488",
      weight: 6,
      opacity: 0.9,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);

    const km = (route.distance / 1000).toFixed(1);
    const min = Math.max(1, Math.round(route.duration / 60));
    capaRuta.bindPopup(
      `<strong>Ruta en auto (aprox.)</strong><br>~${km} km · ~${min} min`
    );

    map.fitBounds(capaRuta.getBounds(), { padding: [52, 52], maxZoom: 15 });
    mostrarMensaje(`Ruta trazada: ~${km} km, ~${min} min. Toca la línea para ver el detalle.`, "success", 4500);
  } catch (err) {
    console.error(err);
    mostrarMensaje(
      "No se pudo trazar la ruta aquí. Abriendo Google Maps con direcciones…",
      "warning",
      4000
    );
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destinoLat},${destinoLng}`,
      "_blank"
    );
  }
};

// Eventos mapa
map.on("click", (event) => {
  const { lat, lng } = event.latlng;

  const latFormateada = formatearCoordenada(lat);
  const lngFormateada = formatearCoordenada(lng);

  latitudInput.value = latFormateada;
  longitudInput.value = lngFormateada;

  selectedMapPoint = {
    latitud: latFormateada,
    longitud: lngFormateada,
  };

  if (mapClickMarker) {
    map.removeLayer(mapClickMarker);
  }

  mapClickMarker = L.marker([lat, lng]).addTo(map);
  mapClickMarker
    .bindPopup(`Punto seleccionado<br>Lat: ${latFormateada}<br>Lng: ${lngFormateada}`)
    .openPopup();

  mostrarQuickAction();
});

btnAbrirRegistroDesdeMapa.addEventListener("click", () => {
  if (!selectedMapPoint) {
    mostrarMensaje("Primero selecciona un punto en el mapa.", "warning");
    return;
  }

  prepararFormularioCrear();
  limpiarFormularioRegistro();

  registroLatitud.value = selectedMapPoint.latitud;
  registroLongitud.value = selectedMapPoint.longitud;

  ocultarQuickAction();
  abrirModal(modalRegistro);
});

// Eventos UI
btnFiltrarCategoria.addEventListener("click", () => {
  const categoria = categoriaSelect.value;

  if (!categoria) {
    mostrarMensaje("Selecciona una categoría.", "warning");
    return;
  }

  obtenerPuntosPorCategoria(categoria);
});

btnCargarTodos.addEventListener("click", () => {
  categoriaSelect.value = "";
  buscarNombreInput.value = "";
  map.setView(guatemalaCenter, defaultZoom);
  obtenerTodosLosPuntos();
});

btnBuscarCercanos.addEventListener("click", () => {
  const lat = latitudInput.value.trim();
  const lng = longitudInput.value.trim();
  const radio = radioInput.value.trim();

  if (!lat || !lng || !radio) {
    mostrarMensaje("Debes completar latitud, longitud y radio.", "warning");
    return;
  }

  obtenerPuntosCercanos(lat, lng, radio);
});

btnBuscarNombre.addEventListener("click", () => {
  const nombre = buscarNombreInput.value.trim();

  if (!nombre) {
    renderizarResultados(puntosActuales);
    return;
  }

  buscarPuntosPorNombre(nombre);
});

btnMiUbicacion?.addEventListener("click", async () => {
  const confirmarPermiso = await confirmarAccion(
    "Para mostrar tu ubicación en el mapa, necesitamos solicitar permiso de geolocalización. ¿Deseas continuar?"
  );

  if (!confirmarPermiso) {
    return;
  }

  await ubicarUsuarioEnMapa();
});

btnUsarMiUbicacionFiltro?.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    mostrarMensaje("Tu navegador no soporta geolocalización.", "warning");
    return;
  }

  if (ubicacionRequiereHttps()) {
    mostrarMensaje(
      "Para usar tu ubicación, abre esta página con HTTPS (o en localhost).",
      "warning",
      6500
    );
    return;
  }

  try {
    const position = await obtenerUbicacionConReintento();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    latitudInput.value = lat.toFixed(6);
    longitudInput.value = lng.toFixed(6);
    ultimaPosicionConocida = { lat, lng };
    map.setView([lat, lng], 15);
    mostrarMensaje("Coordenadas de tu ubicación cargadas.", "success", 2800);
  } catch (error) {
    console.error(error);
    const code = error && typeof error.code === "number" ? error.code : 0;
    mostrarMensaje(mensajeErrorGeolocalizacion(code), "error", 6500);
  }
});

btnIrAlSitio?.addEventListener("click", async () => {
  if (!puntoSeleccionadoDetalle) return;

  const destLat = Number(puntoSeleccionadoDetalle.latitud);
  const destLng = Number(puntoSeleccionadoDetalle.longitud);

  if (Number.isNaN(destLat) || Number.isNaN(destLng)) {
    mostrarMensaje("Las coordenadas del sitio no son válidas.", "error");
    return;
  }

  cerrarModal(modalDetalle);

  try {
    await trazarRutaHaciaSitio(destLat, destLng);
  } catch (err) {
    console.error(err);
    mostrarMensaje("Ocurrió un error al trazar la ruta.", "error");
  }
});

btnEditarSitio?.addEventListener("click", () => {
  if (!puntoSeleccionadoDetalle) return;
  abrirFormularioEdicion(puntoSeleccionadoDetalle);
});

document.querySelectorAll("[data-close]").forEach((element) => {
  element.addEventListener("click", () => {
    const modalId = element.getAttribute("data-close");
    const modal = document.getElementById(modalId);
    if (modal) cerrarModal(modal);
  });
});

formRegistroPunto?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nombre: registroNombre.value.trim(),
    descripcion: registroDescripcion.value.trim(),
    categoria: registroCategoria.value,
    latitud: registroLatitud.value,
    longitud: registroLongitud.value,
  };

  if (!payload.nombre || !payload.categoria || !payload.latitud || !payload.longitud) {
    mostrarMensaje("Completa todos los campos obligatorios.", "warning");
    return;
  }

  try {
    const archivos = Array.from(registroImagenes.files || []);

    if (modoEdicion && puntoEditandoId) {
      await actualizarPunto(
        puntoEditandoId,
        payload,
        archivos,
        imagenesMarcadasParaEliminar
      );
      mostrarMensaje("Sitio actualizado correctamente.", "success");
    } else {
      await crearNuevoPunto(payload, archivos);
      mostrarMensaje("Sitio registrado correctamente.", "success");
    }

    modoEdicion = false;
    puntoEditandoId = null;
    registroImagenes.value = "";
    imagenesMarcadasParaEliminar = [];

    cerrarModal(modalRegistro);
    ocultarQuickAction();
    obtenerTodosLosPuntos();
  } catch (error) {
    console.error("Error guardando punto:", error);
    mostrarMensaje(error.message || "Error al guardar el sitio.", "error");
  }
});

// Inicio
prepararFormularioCrear();
obtenerTodosLosPuntos();