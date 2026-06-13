// script.js - UK Police Dashboard v2

let map;
let markerCluster;
let heatLayer;
let currentCrimes = [];
let categoryChart;
let streetsChart;

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
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markerCluster = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true
  });
  map.addLayer(markerCluster);
}

function clearMapLayers() {
  if (markerCluster) markerCluster.clearLayers();
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
}

function updateMap(crimes) {
  clearMapLayers();
  if (!crimes || crimes.length === 0) return;

  const bounds = L.latLngBounds();
  const heatPoints = [];

  crimes.forEach(crime => {
    if (!crime.location?.latitude || !crime.location?.longitude) return;

    const lat = parseFloat(crime.location.latitude);
    const lng = parseFloat(crime.location.longitude);
    const street = crime.location.street?.name || 'Unknown location';

    const marker = L.marker([lat, lng]);
    marker.bindPopup(`
      <b>${crime.category}</b><br>
      ${street}<br>
      <span class="text-xs text-slate-500">${crime.month}</span>
    `);

    markerCluster.addLayer(marker);
    heatPoints.push([lat, lng, 0.7]);
    bounds.extend([lat, lng]);
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  window.heatPoints = heatPoints;
}

function toggleHeatmap() {
  if (!window.heatPoints || window.heatPoints.length === 0) return;

  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
    return;
  }

  heatLayer = L.heatLayer(window.heatPoints, {
    radius: 30,
    blur: 20,
    maxZoom: 17,
    gradient: { 0.4: '#3b82f6', 0.65: '#22c55e', 0.85: '#eab308', 1: '#ef4444' }
  }).addTo(map);
}

function updateKPIs(crimes, date) {
  const container = document.getElementById('kpi-row');
  if (!crimes || crimes.length === 0) {
    container.innerHTML = `<div class="col-span-4 text-center py-6 text-slate-400">No data found for this selection.</div>`;
    return;
  }

  const total = crimes.length;
  const catCounts = {};
  crimes.forEach(c => catCounts[c.category] = (catCounts[c.category] || 0) + 1);
  const topCat = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];

  const streetCounts = {};
  crimes.forEach(c => {
    const s = c.location?.street?.name || 'Unknown';
    streetCounts[s] = (streetCounts[s] || 0) + 1;
  });
  const topStreet = Object.keys(streetCounts).sort((a, b) => streetCounts[b] - streetCounts[a])[0];

  container.innerHTML = `
    <div class="card">
      <div class="text-xs text-slate-500">TOTAL CRIMES</div>
      <div class="text-4xl font-semibold mt-1">${total}</div>
    </div>
    <div class="card">
      <div class="text-xs text-slate-500">MOST COMMON</div>
      <div class="text-2xl font-semibold mt-1 truncate">${topCat}</div>
    </div>
    <div class="card">
      <div class="text-xs text-slate-500">TOP STREET</div>
      <div class="text-xl font-semibold mt-1 truncate">${topStreet}</div>
    </div>
    <div class="card">
      <div class="text-xs text-slate-500">PERIOD</div>
      <div class="text-2xl font-semibold mt-1">${date || 'Latest available'}</div>
    </div>
  `;
}

function updateCharts(crimes) {
  // Category Doughnut
  const catCounts = {};
  crimes.forEach(c => catCounts[c.category] = (catCounts[c.category] || 0) + 1);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('category-chart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catCounts),
      datasets: [{
        data: Object.values(catCounts),
        backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6']
      }]
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
    }
  });

  // Top Streets Bar Chart
  const streetCounts = {};
  crimes.forEach(c => {
    const s = c.location?.street?.name || 'Unknown';
    streetCounts[s] = (streetCounts[s] || 0) + 1;
  });
  const topStreets = Object.entries(streetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (streetsChart) streetsChart.destroy();
  streetsChart = new Chart(document.getElementById('streets-chart'), {
    type: 'bar',
    data: {
      labels: topStreets.map(x => x[0]),
      datasets: [{
        label: 'Incidents',
        data: topStreets.map(x => x[1]),
        backgroundColor: '#3b82f6'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function updateTable(crimes) {
  const tbody = document.getElementById('crime-table');
  tbody.innerHTML = '';
  window.currentTableCrimes = crimes;

  crimes.slice(0, 150).forEach(crime => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer';
    row.innerHTML = `
      <td class="px-6 py-3 font-medium">${crime.category}</td>
      <td class="px-6 py-3 text-slate-600 dark:text-slate-400">${crime.location?.street?.name || '—'}</td>
      <td class="px-6 py-3 text-slate-500">${crime.month}</td>
    `;
    row.onclick = () => {
      if (crime.location?.latitude) {
        map.flyTo([parseFloat(crime.location.latitude), parseFloat(crime.location.longitude)], 17);
      }
    };
    tbody.appendChild(row);
  });
}

function filterTable() {
  const term = document.getElementById('table-search').value.toLowerCase();
  const rows = document.querySelectorAll('#crime-table tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function exportCSV() {
  if (!window.currentTableCrimes) return;

  const headers = ['category', 'street', 'month', 'latitude', 'longitude'];
  let csv = headers.join(',') + '\n';

  window.currentTableCrimes.forEach(c => {
    csv += [
      c.category,
      `"${c.location?.street?.name || ''}"`,
      c.month,
      c.location?.latitude || '',
      c.location?.longitude || ''
    ].join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `uk-police-data-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

async function loadData() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;

  document.getElementById('total-crimes').textContent = 'Loading...';

  let url = `https://data.police.uk/api/crimes-street/\( {category}?lat= \){lat}&lng=${lng}`;
  if (date) url += `&date=${date}`;

  try {
    const res = await fetch(url);
    const crimes = await res.json();
    currentCrimes = crimes;

    document.getElementById('map-subtitle').textContent = date ? `• ${date}` : '• Latest data';
    updateMap(crimes);
    updateKPIs(crimes, date);
    updateCharts(crimes);
    updateTable(crimes);

    document.getElementById('total-crimes').textContent = `${crimes.length} crimes`;
  } catch (error) {
    document.getElementById('total-crimes').textContent = 'Error loading data';
    console.error(error);
  }
}

async function loadComparison() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;

  if (!date) {
    alert('Please select a specific month first.');
    return;
  }

  const [year, month] = date.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDate = `\( {prevYear}- \){String(prevMonth).padStart(2, '0')}`;

  const urlCurrent = `https://data.police.uk/api/crimes-street/\( {category}?lat= \){lat}&lng=\( {lng}&date= \){date}`;
  const urlPrev = `https://data.police.uk/api/crimes-street/\( {category}?lat= \){lat}&lng=\( {lng}&date= \){prevDate}`;

  try {
    const [current, previous] = await Promise.all([
      fetch(urlCurrent).then(r => r.json()),
      fetch(urlPrev).then(r => r.json())
    ]);

    const diff = current.length - previous.length;
    const pct = previous.length > 0 ? ((diff / previous.length) * 100).toFixed(1) : 'N/A';

    alert(`Comparison Results:\n\n${date}: \( {current.length} crimes\n \){prevDate}: ${previous.length} crimes\n\nChange: \( {diff > 0 ? '+' : ''} \){diff} incidents (${pct}%)`);
  } catch (e) {
    alert('Could not load comparison data.');
  }
}

function quickLocation(lat, lng) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  loadData();
}

async function searchPostcode() {
  const input = document.getElementById('postcode').value.trim().toUpperCase().replace(/\s/g, '');
  if (!input) return;

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${input}`);
    const json = await res.json();
    if (json.status === 200 && json.result) {
      document.getElementById('lat').value = json.result.latitude;
      document.getElementById('lng').value = json.result.longitude;
      loadData();
    } else {
      alert('Postcode not found');
    }
  } catch (e) {
    alert('Postcode lookup failed');
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat').value = pos.coords.latitude.toFixed(5);
    document.getElementById('lng').value = pos.coords.longitude.toFixed(5);
    loadData();
  }, () => alert('Could not get your location'));
}

async function init() {
  initTailwindDarkMode();
  initMap();

  // Load last updated timestamp
  try {
    const res = await fetch('https://data.police.uk/api/crime-last-updated');
    const data = await res.json();
    if (data.date) {
      document.getElementById('last-updated').innerHTML = 
        `Data as of <span class="font-medium">${data.date}</span>`;
    }
  } catch (_) {}

  // Load initial data
  setTimeout(() => {
    loadData();
  }, 700);
}

window.onload = init;