let map, markerCluster;
let currentCrimes = [];

function initMap() {
  map = L.map('map').setView([51.5074, -0.1278], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

async function loadForces() {
  const res = await fetch('https://data.police.uk/api/forces');
  const forces = await res.json();
  const select = document.getElementById('force-select');
  forces.forEach(f => select.add(new Option(f.name, f.id)));
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

async function selectArea(lat, lng, forceName) {
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  document.getElementById('area-name').textContent = forceName;
  await loadAreaDashboard();
}

async function searchByPostcode() {
  const pc = document.getElementById('postcode').value.trim().toUpperCase().replace(/\s/g, '');
  if (!pc) return;
  const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
  const json = await res.json();
  if (json.status === 200) {
    document.getElementById('lat').value = json.result.latitude;
    document.getElementById('lng').value = json.result.longitude;
    await loadAreaDashboard();
  }
}

async function loadAreaDashboard() {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const date = document.getElementById('date').value || '2024-06';

  document.getElementById('dashboard').classList.remove('hidden');

  // Load crime data
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${date}`;
  const res = await fetch(url);
  const crimes = await res.json();
  currentCrimes = crimes;

  // Update map
  markerCluster.clearLayers();
  crimes.forEach(c => {
    if (c.location?.latitude) {
      const m = L.marker([parseFloat(c.location.latitude), parseFloat(c.location.longitude)]);
      m.bindPopup(c.category);
      markerCluster.addLayer(m);
    }
  });

  // Update stats
  document.getElementById('total-crimes').textContent = crimes.length;
  const counts = {};
  crimes.forEach(c => counts[c.category] = (counts[c.category]||0)+1);
  const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  document.getElementById('top-crime').textContent = top || '—';

  // Simple category chart
  if (window.catChart) window.catChart.destroy();
  window.catChart = new Chart(document.getElementById('category-chart'), {
    type: 'doughnut',
    data: { labels: Object.keys(counts), datasets: [{data: Object.values(counts)}] },
    options: { responsive: true, cutout: '70%' }
  });
}

async function init() {
  initMap();
  await loadForces();

  // Default date
  try {
    const r = await fetch('https://data.police.uk/api/crime-last-updated');
    const d = await r.json();
    if (d.date) document.getElementById('date').value = d.date.substring(0,7);
  } catch (_) {}
}

window.onload = init;
