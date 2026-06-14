let map, markerCluster;
let currentCrimes = [];

function initMap() {
  map = L.map('map').setView([51.5074, -0.1278], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

async function loadAllData() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const date = document.getElementById('date').value || '2024-06';

  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${date}`;
  const res = await fetch(url);
  const crimes = await res.json();
  currentCrimes = crimes;

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
  const total = crimes.length;
  const counts = {};
  crimes.forEach(c => counts[c.category] = (counts[c.category]||0)+1);
  const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  el.innerHTML = `
    <div class="card"><div class="text-xs text-slate-500">TOTAL</div><div class="text-3xl font-semibold">${total}</div></div>
    <div class="card"><div class="text-xs text-slate-500">TOP TYPE</div><div class="text-xl font-semibold">${top}</div></div>
  `;
}

function updateCharts(crimes) {
  const counts = {};
  crimes.forEach(c => counts[c.category] = (counts[c.category]||0)+1);

  if (window.catChart) window.catChart.destroy();
  window.catChart = new Chart(document.getElementById('category-chart'), {
    type: 'doughnut',
    data: { labels: Object.keys(counts), datasets: [{data: Object.values(counts)}] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%' }
  });

  // Top streets
  const streetCounts = {};
  crimes.forEach(c => {
    const s = c.location?.street?.name || 'Unknown';
    streetCounts[s] = (streetCounts[s]||0)+1;
  });
  const topStreets = Object.entries(streetCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);

  if (window.streetsChart) window.streetsChart.destroy();
  window.streetsChart = new Chart(document.getElementById('streets-chart'), {
    type: 'bar',
    data: { labels: topStreets.map(x=>x[0]), datasets: [{data: topStreets.map(x=>x[1]), backgroundColor:'#3b82f6'}] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
  });
}

function updateTable(crimes) {
  const tbody = document.getElementById('crime-table');
  if (!tbody) return;
  tbody.innerHTML = '';
  crimes.slice(0,80).forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${c.category}</td><td>${c.location?.street?.name || '—'}</td><td>${c.month}</td>`;
    tbody.appendChild(row);
  });
}

function exportCSV() {
  if (!currentCrimes.length) return;
  let csv = 'category,street,month\n';
  currentCrimes.forEach(c => csv += `${c.category},"${c.location?.street?.name||''}",${c.month}\n`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = 'police-data.csv';
  a.click();
}

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

  try {
    const r = await fetch('https://data.police.uk/api/crime-last-updated');
    const d = await r.json();
    if (d.date) document.getElementById('date').value = d.date.substring(0,7);
  } catch (_) {}

  setTimeout(() => {
    loadAllData();
  }, 500);
}

window.onload = init;
