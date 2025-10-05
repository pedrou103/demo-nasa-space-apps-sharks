const map = L.map("map").setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
}).addTo(map);

let chlorData = [];
let heatLayer = null;
let drawnLayer = null; // Guarda o retângulo desenhado atual

// Grupo para armazenar os desenhos
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Controle de desenho
const drawControl = new L.Control.Draw({
  draw: {
    rectangle: true,
    polygon: false,
    circle: false,
    marker: false,
    polyline: false,
  },
  edit: {
    featureGroup: drawnItems,
    remove: true,
  },
});
map.addControl(drawControl);

// Carrega JSON de Fitoplâncton
fetch("chlorophyll_global.json")
  .then((res) => res.json())
  .then((data) => {
    chlorData = data;
    console.log("Dados carregados:", data.length, "registros");

    // Ativa modo de desenhar retângulo automaticamente
    const drawRectangle = new L.Draw.Rectangle(map, {
      shapeOptions: { color: "#ff7800", weight: 1 },
    });
    drawRectangle.enable();
  });

// Verifica se ponto está no retângulo
function pointInBounds(point, bounds) {
  return bounds.contains(L.latLng(point.lat, point.lon));
}

// Cria card Bootstrap com os dados
function createInfoCard(bounds, avg, count) {
  const infoCard = document.getElementById("info-card");

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  infoCard.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-header bg-success text-white">
        Área Selecionada
      </div>
      <div class="card-body">
        <p><strong>Latitude:</strong> ${sw.lat.toFixed(4)} to ${ne.lat.toFixed(4)}</p>
        <p><strong>Longitude:</strong> ${sw.lng.toFixed(4)} to ${ne.lng.toFixed(4)}</p>
        <p><strong>Média Fitoplâncton:</strong> ${avg.toFixed(4)} mg/m³</p>
        <p><strong>Nº de pontos:</strong> ${count}</p>
      </div>
    </div>
  `;
}

// Evento ao desenhar
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const bounds = layer.getBounds();

  // Remove retângulo anterior, se existir
  if (drawnLayer) {
    drawnItems.removeLayer(drawnLayer);
  }
  drawnItems.addLayer(layer);
  drawnLayer = layer; // Atualiza referência ao novo retângulo

  // Filtra pontos dentro do retângulo
  const filteredPoints = chlorData
    .filter((d) => pointInBounds(d, bounds))
    .map((d) => [d.lat, d.lon, d.value]);

  // Remove heatmap anterior
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  if (filteredPoints.length > 0) {
    // Adiciona novo heatmap
    heatLayer = L.heatLayer(filteredPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 9,
      gradient: { 0.1: "blue", 0.3: "lime", 0.6: "yellow", 1: "red" },
    }).addTo(map);

    // Calcula média
    const total = filteredPoints.reduce((sum, p) => sum + p[2], 0);
    const avg = total / filteredPoints.length;

    // Cria card com informações
    createInfoCard(bounds, avg, filteredPoints.length);
  } else {
    document.getElementById("info-card").innerHTML = `
      <div class="card border-warning">
        <div class="card-body text-warning">
          Nenhum ponto dentro da área selecionada.
        </div>
      </div>
    `;
  }

  // Reativa ferramenta de desenho
  const drawRectangle = new L.Draw.Rectangle(map, {
    shapeOptions: { color: "#ff7800", weight: 1 },
  });
  drawRectangle.enable();
});
