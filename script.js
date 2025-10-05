const map = L.map("map").setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
}).addTo(map);

let chlorData = [];
let heatLayer = null;

// Grupo para armazenar os desenhos
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Adiciona o controle de desenho, ligado ao layerGroup
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

    // Ativa modo de desenhar retângulo automaticamente ao carregar
    const drawRectangle = new L.Draw.Rectangle(map, {
      shapeOptions: { color: "#ff7800", weight: 1 },
    });
    drawRectangle.enable();
  });

// Função para verificar se ponto está dentro do retângulo
function pointInBounds(point, bounds) {
  return bounds.contains(L.latLng(point.lat, point.lon));
}

// Evento ao desenhar retângulo
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  drawnItems.addLayer(layer); // Adiciona ao grupo

  const bounds = layer.getBounds();

  // Filtra os pontos dentro do retângulo
  const filteredPoints = chlorData
    .filter((d) => pointInBounds(d, bounds))
    .map((d) => [d.lat, d.lon, d.value]);

  // Remove heatmap anterior
  if (heatLayer) map.removeLayer(heatLayer);

  if (filteredPoints.length > 0) {
    heatLayer = L.heatLayer(filteredPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 9,
      gradient: { 0.1: "blue", 0.3: "lime", 0.6: "yellow", 1: "red" },
    }).addTo(map);

    // Calcula média de fitoplâncton
    const total = filteredPoints.reduce((sum, p) => sum + p[2], 0);
    const avg = total / filteredPoints.length;
    document.getElementById(
      "coords"
    ).innerText = `Média Fitoplâncton: ${avg.toFixed(4)} mg/m³ (${
      filteredPoints.length
    } pontos)`;
  } else {
    document.getElementById("coords").innerText =
      "Nenhum ponto dentro da área selecionada";
  }

  // Re-ativa o modo de desenhar para permitir novos retângulos
  const drawRectangle = new L.Draw.Rectangle(map, {
    shapeOptions: { color: "#ff7800", weight: 1 },
  });
  drawRectangle.enable();
});
