const { ipcRenderer } = require('electron');

// Инициализация карты Leaflet
const map = L.map('map').setView([38.7895, 0.1669], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const selectedIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

let markers = [];
let currentMarker = null;

function clearMarkerForm() {
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.getElementById('lat').value = '';
  document.getElementById('lng').value = '';
}

function fillMarkerForm(marker) {
  document.getElementById('title').value = marker.title || '';
  document.getElementById('description').value = marker.description || '';
  const latlng = marker.getLatLng();
  document.getElementById('lat').value = latlng.lat.toFixed(6);
  document.getElementById('lng').value = latlng.lng.toFixed(6);
}

function addMarker(latlng) {
  const marker = L.marker(latlng, { draggable: true, icon: defaultIcon }).addTo(map);
  marker.title = '';
  marker.description = '';
  markers.push(marker);
  currentMarker = marker;

  marker.bindPopup(`<b>${marker.title || 'Без названия'}</b><br>${marker.description || 'Без описания'}`);

  fillMarkerForm(marker);
  document.getElementById('marker-form').style.display = 'block';

  marker.on('dragend', () => {
    if (marker === currentMarker) {
      const pos = marker.getLatLng();
      document.getElementById('lat').value = pos.lat.toFixed(6);
      document.getElementById('lng').value = pos.lng.toFixed(6);
      marker.setPopupContent(`<b>${marker.title || 'Без названия'}</b><br>${marker.description || 'Без описания'}`);
    }
  });

  marker.on('click', () => {
    markers.forEach(m => m.setIcon(defaultIcon));
    marker.setIcon(selectedIcon);

    currentMarker = marker;
    fillMarkerForm(marker);
    document.getElementById('marker-form').style.display = 'block';

    marker.openPopup();
  });
}

document.getElementById('add-marker').addEventListener('click', () => {
  const center = map.getCenter();
  addMarker(center);
});

map.on('click', (e) => {
  addMarker(e.latlng);
});

document.getElementById('update-coords').addEventListener('click', () => {
  if (!currentMarker) return;
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);
  if (isNaN(lat) || isNaN(lng)) {
    alert('Введите корректные координаты');
    return;
  }
  currentMarker.setLatLng([lat, lng]);
  map.panTo([lat, lng]);
  currentMarker.setPopupContent(`<b>${currentMarker.title || 'Без названия'}</b><br>${currentMarker.description || 'Без описания'}`);
});

document.getElementById('save-marker').addEventListener('click', () => {
  if (!currentMarker) return;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  if (title === '') {
    alert('Заголовок не может быть пустым');
    return;
  }
  currentMarker.title = title;
  currentMarker.description = description;
  currentMarker.setPopupContent(`<b>${title}</b><br>${description}`);
  alert('Данные маркера сохранены');
});

document.getElementById('delete-marker').addEventListener('click', () => {
  if (!currentMarker) return;
  map.removeLayer(currentMarker);
  markers = markers.filter(m => m !== currentMarker);
  currentMarker = null;
  clearMarkerForm();
  document.getElementById('marker-form').style.display = 'none';
  alert('Маркер удалён');
});

document.getElementById('new-project').addEventListener('click', () => {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  currentMarker = null;
  clearMarkerForm();
  document.getElementById('marker-form').style.display = 'none';
  document.getElementById('project-status').textContent = 'Новый проект';
  document.getElementById('project-ciudad').value = '';
  document.getElementById('project-zona').value = '';
  document.getElementById('project-autor').value = '';
});

document.getElementById('save-project').addEventListener('click', () => {
  const pueblo = document.getElementById('project-ciudad').value.trim();
  const zona = document.getElementById('project-zona').value.trim();
  const autor = document.getElementById('project-autor').value.trim();

  if (!pueblo || !zona) {
    alert('Заполните поля "Ciudad" и "Zona"');
    return;
  }

  const puntos = markers.map(marker => ({
    titulo: marker.title,
    descripcion: marker.description,
    coordenadas: [marker.getLatLng().lat, marker.getLatLng().lng],
    preguntas: []
  }));

  const project = {
    pueblo,
    zona,
    autor,
    fecha_creacion: new Date().toISOString().split('T')[0],
    puntos
  };

  ipcRenderer.send('auto-save-project', { project, filePath: `${pueblo}_${zona}.json` });
});

document.getElementById('load-project').addEventListener('click', () => {
  ipcRenderer.send('load-project');
});

ipcRenderer.on('project-saved', (event, filePath) => {
  document.getElementById('project-status').textContent = `Проект сохранён: ${filePath}`;
  alert(`Проект сохранён в файле: ${filePath}`);
});

ipcRenderer.on('project-loaded', (event, projectData) => {
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
      if (punto.coordenadas && punto.coordenadas.length === 2) {
        const marker = L.marker(punto.coordenadas, { draggable: true, icon: defaultIcon }).addTo(map);
        marker.title = punto.titulo || '';
        marker.description = punto.descripcion || '';
        marker.bindPopup(`<b>${marker.title}</b><br>${marker.description}`);
        markers.push(marker);

        marker.on('click', () => {
          markers.forEach(m => m.setIcon(defaultIcon));
          marker.setIcon(selectedIcon);
          currentMarker = marker;
          fillMarkerForm(marker);
          document.getElementById('marker-form').style.display = 'block';
          marker.openPopup();
        });

        marker.on('dragend', () => {
          if (marker === currentMarker) {
            const pos = marker.getLatLng();
            document.getElementById('lat').value = pos.lat.toFixed(6);
            document.getElementById('lng').value = pos.lng.toFixed(6);
            marker.setPopupContent(`<b>${marker.title}</b><br>${marker.description}`);
          }
        });
      }
    });
  }

  document.getElementById('project-status').textContent = 'Проект загружен';
});

map.on('mousemove', (e) => {
  document.getElementById('coordinates').textContent = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
});

map.on('zoomend', () => {
  document.getElementById('zoom-level').textContent = `Zoom: ${map.getZoom()}`;
});
