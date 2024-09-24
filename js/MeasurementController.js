export class MeasurementController {
  constructor(map) {
    this.map = map;
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    // Controle de desenho
    this.drawControl = new L.Control.Draw({
      draw: {
        polyline: true,  // Desenho de linha
        polygon: true,   // Desenho de área
        marker: false,   // Desenho de marcador
        circle: false,   // Desenho de círculo
        rectangle: true  // Desenho de retângulo
      },
      edit: {
        featureGroup: this.drawnItems
      }
    });

    this.map.addControl(this.drawControl);

    // Escuta o evento de criação de novo desenho
    this.map.on(L.Draw.Event.CREATED, (event) => this.handleDrawEvent(event));
  }

  handleDrawEvent(event) {
    const layer = event.layer;
    this.drawnItems.addLayer(layer);

    // Calcular a medição apropriada para cada geometria
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      console.log('Polígono ou Retângulo desenhado');
      this.calculateArea(layer);
      this.calculateAzimuthForPolygon(layer);  // Calcular azimute para polígonos
    } else if (layer instanceof L.Polyline) {
      console.log('Linha desenhada');
      this.calculateDistance(layer);
      this.calculateAzimuth(layer);  // Calcular azimute para linhas
    } else {
      console.log('Tipo de camada não suportado');
    }

    // Adicionando hover para exibir os detalhes
    layer.on('mouseover', () => this.showDetails(layer));
    layer.on('mouseout', () => this.map.closePopup());
  }

  // Exibir os detalhes (distância, área, azimute) no hover
  showDetails(layer) {
    let content = '';

    if (layer.areaText) {
      content += `Área: ${layer.areaText} <br>`;
    }
    if (layer.distanceText) {
      content += `Distância: ${layer.distanceText} <br>`;
    }
    if (layer.azimuthText) {
      content += `Azimute: ${layer.azimuthText}`;
    }

    if (content) {
      layer.bindPopup(content).openPopup();
    }
  }

  // Cálculo do azimute para geometrias
  calculateAzimuth(layer) {
    const latlngs = layer.getLatLngs();
    if (latlngs.length < 2) return; // O azimute precisa de ao menos dois pontos

    const start = latlngs[0];
    const end = latlngs[1];

    const azimuth = this.getAzimuth(start, end);
    console.log(`Azimute: ${azimuth.toFixed(2)}°`);

    // Armazenar azimute para exibir no hover
    layer.azimuthText = `${azimuth.toFixed(2)}°`;
  }

  // Cálculo do azimute para o primeiro segmento de polígonos
  calculateAzimuthForPolygon(layer) {
    const latlngs = layer.getLatLngs()[0]; // Primeiro anel do polígono
    if (latlngs.length < 2) return; // O azimute precisa de ao menos dois pontos

    // Calcular o azimute entre os dois primeiros pontos do polígono
    const start = latlngs[0];
    const end = latlngs[1];

    const azimuth = this.getAzimuth(start, end);
    console.log(`Azimute do polígono: ${azimuth.toFixed(2)}°`);

    // Armazenar azimute para exibir no hover
    layer.azimuthText = `${azimuth.toFixed(2)}°`;
  }

  // Função de cálculo do azimute entre dois pontos
  getAzimuth(start, end) {
    const lat1 = start.lat * (Math.PI / 180);
    const lon1 = start.lng * (Math.PI / 180);
    const lat2 = end.lat * (Math.PI / 180);
    const lon2 = end.lng * (Math.PI / 180);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let azimuth = Math.atan2(y, x) * (180 / Math.PI);
    return (azimuth + 360) % 360; // Garantir que o azimute esteja entre 0 e 360
  }

  // Cálculo da distância para linhas
  calculateDistance(layer) {
    const latlngs = layer.getLatLngs();
    let totalDistance = 0;

    for (let i = 0; i < latlngs.length - 1; i++) {
      totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
    }

    const distanceText = totalDistance >= 1000
      ? `${(totalDistance / 1000).toFixed(2)} km`
      : `${totalDistance.toFixed(2)} metros`;

    layer.distanceText = distanceText;
    console.log('Distância da linha: ' + distanceText);
  }

  calculateArea(layer) {
    const latlngs = layer.getLatLngs();
  
    if (latlngs.length > 0 && latlngs[0].length > 2) {
      const closedPolygon = L.polygon(latlngs[0]);
      const area = L.GeometryUtil.geodesicArea(closedPolygon.getLatLngs()[0]); // Área em metros quadrados
  
      // Ajuste na exibição
      let areaText;
      if (area >= 1000000) {
        // Se a área for maior que 1 km², converte para quilômetros quadrados
        areaText = `${(area / 1000000).toFixed(2)} km²`;
      } else {
        // Exibe a área em metros quadrados
        areaText = `${area.toFixed(2)} metros²`;
      }
  
      layer.areaText = areaText;
      console.log('Área: ' + areaText);
    } else {
      alert('Desenhe um polígono com pelo menos três pontos para calcular a área.');
    }
  }
}
