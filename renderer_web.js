// renderer_web.js — versión para navegador sin dependencias de Electron

// Inicialización del mapa Leaflet centrado en coordenadas específicas
const map = L.map('map').setView([38.7895, 0.1669], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Variables globales para control de marcadores
let markers = [];
let currentMarker = null;

// Función para limpiar formulario
function clearMarkerForm() {
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.getElementById('lat').value = '';
  document.getElementById('lng').value = '';
}

// Función para rellenar formulario desde marcador
function fillMarkerForm(marker) {
  document.getElementById('title').value = marker.title || '';
  document.getElementById('description').value = marker.description || '';
  const latlng = marker.getLatLng();
  document.getElementById('lat').value = latlng.lat.toFixed(6);
  document.getElementById('lng').value = latlng.lng.toFixed(6);
}

// Función para seleccionar un marcador
function selectMarker(marker) {
  currentMarker = marker;
  fillMarkerForm(marker);
  document.getElementById('marker-form').style.display = 'block';
}

// Función para agregar nuevo marcador
function addMarker(latlng) {
  const marker = L.marker(latlng, { draggable: true }).addTo(map);
  marker.title = '';
  marker.description = '';
  markers.push(marker);
  selectMarker(marker);

  marker.on('click', () => selectMarker(marker));
  marker.on('dragend', () => {
    if (marker === currentMarker) {
      const pos = marker.getLatLng();
      document.getElementById('lat').value = pos.lat.toFixed(6);
      document.getElementById('lng').value = pos.lng.toFixed(6);
    }
  });
}

// Eventos de botones
document.getElementById('add-marker').addEventListener('click', () => {
  addMarker(map.getCenter());
});

document.getElementById('update-coords').addEventListener('click', () => {
  if (!currentMarker) return;
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);
  if (isNaN(lat) || isNaN(lng)) return alert('Coordenadas inválidas');
  currentMarker.setLatLng([lat, lng]);
  map.panTo([lat, lng]);
});

document.getElementById('save-marker').addEventListener('click', () => {
  if (!currentMarker) return;
  const title = document.getElementById('title').value.trim();
  if (title === '') return alert('El título no puede estar vacío');
  currentMarker.title = title;
  currentMarker.description = document.getElementById('description').value.trim();
  alert('Marcador actualizado');
});

document.getElementById('delete-marker').addEventListener('click', () => {
  if (!currentMarker) return;
  map.removeLayer(currentMarker);
  markers = markers.filter(m => m !== currentMarker);
  currentMarker = null;
  clearMarkerForm();
  document.getElementById('marker-form').style.display = 'none';
});

document.getElementById('new-project').addEventListener('click', () => {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  currentMarker = null;
  clearMarkerForm();
  document.getElementById('marker-form').style.display = 'none';
  document.getElementById('project-status').textContent = 'Nuevo proyecto';
  document.getElementById('project-ciudad').value = '';
  document.getElementById('project-zona').value = '';
  document.getElementById('project-autor').value = '';
});

// Guardar como JSON
document.getElementById('save-project').addEventListener('click', () => {
  const pueblo = document.getElementById('project-ciudad').value.trim();
  const zona = document.getElementById('project-zona').value.trim();
  const autor = document.getElementById('project-autor').value.trim();
  if (!pueblo || !zona) return alert('Ciudad y zona son obligatorias');

  const puntos = markers.map(marker => ({
    titulo: marker.title,
    descripcion: marker.description,
    coordenadas: [marker.getLatLng().lat, marker.getLatLng().lng],
    preguntas: []
  }));

  const project = {
    pueblo, zona, autor,
    fecha_creacion: new Date().toISOString().split('T')[0],
    puntos
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  saveAs(blob, `${pueblo}_${zona}.json`);
  document.getElementById('project-status').textContent = 'Proyecto guardado';
});

// Cargar JSON desde input
document.getElementById('load-project').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        loadProjectFromData(data);
      } catch (err) {
        alert('Error al cargar archivo JSON');
      }
    };
    reader.readAsText(file);
  });
  input.click();
});

// Función para cargar proyecto desde datos
function loadProjectFromData(projectData) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  currentMarker = null;
  clearMarkerForm();
  document.getElementById('marker-form').style.display = 'none';

  document.getElementById('project-ciudad').value = projectData.pueblo || '';
  document.getElementById('project-zona').value = projectData.zona || '';
  document.getElementById('project-autor').value = projectData.autor || '';

  if (Array.isArray(projectData.puntos)) {
    projectData.puntos.forEach(punto => {
      if (punto.coordenadas?.length === 2) {
        const marker = L.marker(punto.coordenadas, { draggable: true }).addTo(map);
        marker.title = punto.titulo || '';
        marker.description = punto.descripcion || '';
        markers.push(marker);

        marker.on('click', () => selectMarker(marker));
        marker.on('dragend', () => {
          if (marker === currentMarker) {
            const pos = marker.getLatLng();
            document.getElementById('lat').value = pos.lat.toFixed(6);
            document.getElementById('lng').value = pos.lng.toFixed(6);
          }
        });
      }
    });
  }
  document.getElementById('project-status').textContent = 'Proyecto cargado';
}

// Actualizar barra de estado
map.on('mousemove', (e) => {
  document.getElementById('coordinates').textContent =
    `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
});
map.on('zoomend', () => {
  document.getElementById('zoom-level').textContent = `Zoom: ${map.getZoom()}`;
});