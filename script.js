let map, markerCluster;
let currentCrimes = [];
let currentLat = 51.5074;
let currentLng = -0.1278;
let currentDate = '2024-06';

function initMap() {
  map = L.map('map').setView([currentLat, currentLng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

async function loadForces() {
  const res = await fetch('https://data.police.uk/api/forces');
  const forces = await res.json();
  const selects = ['force-select', 'force-details-select', 'compare1', 'compare2'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (sel) forces.forEach(f => sel.add(new Option(f.name, f.id)));
  });
}

async function loadNeighbourhoods() {
  const forceId = document.getElementById('force-select').value;
  const sel = document.getElementById('neighbourhood-select');
  sel.innerHTML = '<option value="">All areas</option>';
  if (!forceId) return;
  const res = await fetch(`https://data.police.uk/api/${forceId}/neighbourhoods`);
  const data = await res.json();
  data.forEach(n => sel.add(new Option(n.name, n.id)));
}

async function loadAllData() {
  currentLat = parseFloat(document.getElementById('lat').value);
  currentLng = parseFloat(document.getElementById('lng').value);
  currentDate = document.getElementById('date').value || currentDate;

  if (!currentLat || !currentLng) {
    alert("Please set latitude and longitude");
    return;
  }

  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${currentLat}&lng=${currentLng}&date=${currentDate}`;
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

  updateKPIs(crimes);
  updateCharts(crimes);
  updateTable(crimes);
  document.getElementById('total-crimes').textContent = `${crimes.length} crimes`;
}

function quickLocation(lat, lng) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  loadAllData();
}

async function searchPostcode() {
  const pc = document.getElementById('postcode').value.trim().toUpperCase().replace(/\s/g, '');
  if (!pc) return;
  const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
  const json = await res.json();
  if (json.status === 200) {
    document.getElementById('lat').value = json.result.latitude;
    document.getElementById('lng').value = json.result.longitude;
    loadAllData();
  }
}

function updateKPIs(crimes) {
  const el = document.getElementById('kpi-row');
  if (!el || !crimes.length) return;
  // ... (same KPI HTML as before)
  el.innerHTML = `...`; // keep your previous working KPI code
}

function updateCharts(crimes) {
  // destroy old charts + create new ones (same as previous working version)
}

function updateTable(crimes) {
  const tbody = document.getElementById('crime-table');
  if (!tbody) return; // ← This fixes the null error
  tbody.innerHTML = '';
  crimes.slice(0, 80).forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${c.category}</td><td>${c.location?.street?.name || '—'}</td><td>${c.month}</td>`;
    tbody.appendChild(row);
  });
}

function exportCSV() { /* same as before */ }

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`content-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}

async function init() {
  initMap();
  await loadForces();

  // Set date from API
  try {
    const r = await fetch('https://data.police.uk/api/crime-last-updated');
    const d = await r.json();
    if (d.date) document.getElementById('date').value = d.date.substring(0, 7);
  } catch (_) {}

  // Default load
  setTimeout(() => {
    document.getElementById('lat').value = '51.5074';
    document.getElementById('lng').value = '-0.1278';
    loadAllData();
  }, 500);
}

window.onload = init;
