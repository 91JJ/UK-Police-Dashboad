let map, markerCluster, heatLayer, currentCrimes = [];
let categoryChartInstance = null;
let streetsChartInstance = null;

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
  const forces = await res.json();
  const select = document.getElementById('force-select');
  forces.forEach(f => {
    const opt = new Option(f.name, f.id);
    select.add(opt);
  });
}

async function loadNeighbourhoods() {
  const forceId = document.getElementById('force-select').value;
  const select = document.getElementById('neighbourhood-select');
  select.innerHTML = '<option value="">All areas</option>';
  if (!forceId) return;

  const res = await fetch(`https://data.police.uk/api/${forceId}/neighbourhoods`);
  const neighbourhoods = await res.json();
  neighbourhoods.forEach(n => {
    const opt = new Option(n.name, n.id);
    select.add(opt);
  });
}

async function loadAllData() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  await loadCrimeData(lat, lng);
}

async function loadCrimeData(lat, lng) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=2024-06`;
  const res = await fetch(url);
  const crimes = await res.json();
  currentCrimes = crimes;

  // Map
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

function updateKPIs(crimes) {
  const el = document.getElementById('kpi-row');
  if (!crimes.length) return;
  const total = crimes.length;
  const counts = {};
  crimes.forEach(c => counts[c.category] = (counts[c.category]||0)+1);
  const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  el.innerHTML = `
    <div class="card"><div class="text-xs text-slate-500">TOTAL CRIMES</div><div class="text-3xl font-semibold">${total}</div></div>
    <div class="card"><div class="text-xs text-slate-500">TOP TYPE</div><div class="text-xl font-semibold">${top}</div></div>
  `;
}

function updateCharts(crimes) {
  if (categoryChartInstance) categoryChartInstance.destroy();
  if (streetsChartInstance) streetsChartInstance.destroy();

  const counts = {};
  crimes.forEach(c => counts[c.category] = (counts[c.category]||0)+1);

  categoryChartInstance = new Chart(document.getElementById('category-chart'), {
    type: 'doughnut',
    data: { labels: Object.keys(counts), datasets: [{data: Object.values(counts)}] },
    options: { responsive: true, cutout: '65%' }
  });

  // Top streets
  const streetCounts = {};
  crimes.forEach(c => {
    const s = c.location?.street?.name || 'Unknown';
    streetCounts[s] = (streetCounts[s]||0)+1;
  });
  const topStreets = Object.entries(streetCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);

  streetsChartInstance = new Chart(document.getElementById('streets-chart'), {
    type: 'bar',
    data: { labels: topStreets.map(x=>x[0]), datasets: [{data: topStreets.map(x=>x[1]), backgroundColor:'#3b82f6'}] },
    options: { indexAxis: 'y', responsive: true }
  });
}

function updateTable(crimes) {
  const tbody = document.getElementById('crime-table');
  tbody.innerHTML = '';
  crimes.slice(0,100).forEach(c => {
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

async function searchPostcode() {
  const pc = document.getElementById('postcode').value.trim().toUpperCase().replace(/\s/g,'');
  if (!pc) return;
  const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
  const json = await res.json();
  if (json.status === 200) {
    document.getElementById('lat').value = json.result.latitude;
    document.getElementById('lng').value = json.result.longitude;
    loadAllData();
  }
}

function quickLocation(lat, lng) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  loadAllData();
}

function toggleHeatmap() {
  // Add your heatmap toggle logic here
}

async function init() {
  initTailwindDarkMode();
  initMap();
  await loadForces();

  // Default load
  setTimeout(() => {
    document.getElementById('lat').value = '51.5074';
    document.getElementById('lng').value = '-0.1278';
    loadAllData();
  }, 500);
}

window.onload = init;
