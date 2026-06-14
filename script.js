let map, markerCluster, heatLayer, currentCrimes = [];
let categoryChartInstance = null;
let streetsChartInstance = null;

let forcesList = [];

function initTailwindDarkMode() {
  if (localStorage.theme === 'dark') document.documentElement.classList.add('dark');
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function initMap() {
  map = L.map('map').setView([51.5074, -0.1278], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

async function loadForces() {
  const res = await fetch('https://data.police.uk/api/forces');
  forcesList = await res.json();
  const select = document.getElementById('force-select');
  forcesList.forEach(f => {
    const opt = new Option(f.name, f.id);
    select.add(opt);
  });
}

async function loadNeighbourhoods() {
  const forceId = document.getElementById('force-select').value;
  const neighSelect = document.getElementById('neighbourhood-select');
  neighSelect.innerHTML = '<option value="">All areas</option>';

  if (!forceId) return;

  const res = await fetch(`https://data.police.uk/api/${forceId}/neighbourhoods`);
  const neighbourhoods = await res.json();

  neighbourhoods.forEach(n => {
    const opt = new Option(n.name, n.id);
    neighSelect.add(opt);
  });
}

async function loadAllData() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;

  await loadCrimeData(lat, lng);
}

async function loadCrimeData(lat, lng) {
  const date = '2024-06';
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${date}`;

  const res = await fetch(url);
  const crimes = await res.json();

  currentCrimes = crimes;

  // Update Map
  markerCluster.clearLayers();
  crimes.forEach(c => {
    if (c.location?.latitude) {
      const m = L.marker([parseFloat(c.location.latitude), parseFloat(c.location.longitude)]);
      m.bindPopup(c.category);
      markerCluster.addLayer(m);
    }
  });

  // KPIs + Charts + Table
  updateKPIs(crimes);
  updateCharts(crimes);
  updateTable(crimes);
  document.getElementById('total-crimes').textContent = `${crimes.length} crimes`;
}

function updateKPIs(crimes) {
  // Add your KPI logic here (same as previous working version)
}

function updateCharts(crimes) {
  // Destroy old charts
  if (categoryChartInstance) categoryChartInstance.destroy();
  if (streetsChartInstance) streetsChartInstance.destroy();

  // Category chart + Top streets chart logic...
}

function updateTable(crimes) {
  // Table rendering logic...
}

function exportCSV() { /* ... */ }

async function searchPostcode() {
  // Same as before
}

function quickLocation(lat, lng) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  loadAllData();
}

async function init() {
  initTailwindDarkMode();
  initMap();
  await loadForces();

  // Auto load default location
  setTimeout(() => {
    document.getElementById('lat').value = '51.5074';
    document.getElementById('lng').value = '-0.1278';
    loadAllData();
  }, 600);
}

window.onload = init;
