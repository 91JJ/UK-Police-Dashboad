// script.js - Fixed version
let map, markerCluster, heatLayer, currentCrimes = [], categoryChart, streetsChart;

function initTailwindDarkMode() {
  if (localStorage.theme === 'dark' || 
     (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function initMap() {
  map = L.map('map').setView([51.5074, -0.1278], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  markerCluster = L.markerClusterGroup({ chunkedLoading: true });
  map.addLayer(markerCluster);
}

function clearMapLayers() {
  if (markerCluster) markerCluster.clearLayers();
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}

function updateMap(crimes) {
  clearMapLayers();
  if (!crimes?.length) return;

  const bounds = L.latLngBounds();
  const heatPoints = [];

  crimes.forEach(crime => {
    if (!crime.location?.latitude) return;
    const lat = parseFloat(crime.location.latitude);
    const lng = parseFloat(crime.location.longitude);
    const marker = L.marker([lat, lng]);
    marker.bindPopup(`<b>\( {crime.category}</b><br> \){crime.location.street?.name || ''}<br>${crime.month}`);
    markerCluster.addLayer(marker);
    heatPoints.push([lat, lng, 0.7]);
    bounds.extend([lat, lng]);
  });

  if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
  window.heatPoints = heatPoints;
}

function toggleHeatmap() {
  if (!window.heatPoints) return;
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; return; }
  heatLayer = L.heatLayer(window.heatPoints, { radius: 28, blur: 18 }).addTo(map);
}

function updateKPIs(crimes, date) {
  const container = document.getElementById('kpi-row');
  if (!crimes?.length) {
    container.innerHTML = `<div class="col-span-4 text-center py-4 text-slate-400">No data</div>`;
    return;
  }
  const total = crimes.length;
  const catCounts = {};
  crimes.forEach(c => catCounts[c.category] = (catCounts[c.category] || 0) + 1);
  const topCat = Object.keys(catCounts).sort((a,b)=>catCounts[b]-catCounts[a])[0];

  container.innerHTML = `
    <div class="card"><div class="text-xs text-slate-500">TOTAL</div><div class="text-3xl font-semibold">${total}</div></div>
    <div class="card"><div class="text-xs text-slate-500">TOP TYPE</div><div class="text-xl font-semibold">${topCat}</div></div>
    <div class="card"><div class="text-xs text-slate-500">PERIOD</div><div class="text-xl font-semibold">${date || 'Latest'}</div></div>
  `;
}

function updateCharts(crimes) {
  const catCounts = {};
  crimes.forEach(c => catCounts[c.category] = (catCounts[c.category] || 0) + 1);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('category-chart'), {
    type: 'doughnut',
    data: { labels: Object.keys(catCounts), datasets: [{ data: Object.values(catCounts) }] },
    options: { responsive: true, cutout: '65%' }
  });
}

function updateTable(crimes) {
  const tbody = document.getElementById('crime-table');
  tbody.innerHTML = '';
  window.currentTableCrimes = crimes;
  crimes.slice(0, 100).forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>\( {c.category}</td><td> \){c.location?.street?.name || '—'}</td><td>${c.month}</td>`;
    tbody.appendChild(row);
  });
}

function filterTable() {
  const term = document.getElementById('table-search').value.toLowerCase();
  document.querySelectorAll('#crime-table tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function exportCSV() {
  if (!window.currentTableCrimes) return;
  let csv = 'category,street,month\n';
  window.currentTableCrimes.forEach(c => {
    csv += `\( {c.category}," \){c.location?.street?.name || ''}",${c.month}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'police-data.csv';
  a.click();
}

async function loadData() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;

  const statusEl = document.getElementById('total-crimes');
  statusEl.textContent = 'Loading...';

  let url = `https://data.police.uk/api/crimes-street/\( {category}?lat= \){lat}&lng=${lng}`;
  if (date) url += `&date=${date}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const crimes = await res.json();

    currentCrimes = crimes;
    document.getElementById('map-subtitle').textContent = date ? `• ${date}` : '';
    updateMap(crimes);
    updateKPIs(crimes, date);
    updateCharts(crimes);
    updateTable(crimes);
    statusEl.textContent = `${crimes.length} crimes`;
  } catch (err) {
    console.error('API Error:', err);           // ← Check browser console (F12)
    statusEl.textContent = 'Error loading data';
    alert('Failed to load data. Open browser console (F12) and check the error.');
  }
}

async function loadComparison() {
  alert('Comparison feature coming soon in next update');
}

function quickLocation(lat, lng) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  loadData();
}

async function searchPostcode() {
  const pc = document.getElementById('postcode').value.trim().toUpperCase().replace(/\s/g, '');
  if (!pc) return;
  const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
  const json = await res.json();
  if (json.status === 200) {
    document.getElementById('lat').value = json.result.latitude;
    document.getElementById('lng').value = json.result.longitude;
    loadData();
  }
}

function useMyLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat').value = pos.coords.latitude.toFixed(5);
    document.getElementById('lng').value = pos.coords.longitude.toFixed(5);
    loadData();
  });
}

async function init() {
  initTailwindDarkMode();
  initMap();

  try {
    const res = await fetch('https://data.police.uk/api/crime-last-updated');
    const data = await res.json();
    if (data.date) {
      document.getElementById('last-updated').innerHTML = `Data as of <span class="font-medium">${data.date}</span>`;
    }
  } catch (_) {}

  // Auto-load with a known working month
  setTimeout(() => {
    document.getElementById('date').value = '2024-01';   // ← Changed to a reliable month
    loadData();
  }, 600);
}

window.onload = init;