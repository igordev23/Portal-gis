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
      this.calculateAreaAndPerimeter(layer);  // Calcula área e perímetro
      this.calculateAzimuthForPolygon(layer); // Calcula azimute para polígonos
    } else if (layer instanceof L.Polyline) {
      console.log('Linha desenhada');
      this.calculateDistance(layer);
      this.calculateAzimuth(layer); // Calcula azimute para linhas
    } else {
      console.log('Tipo de camada não suportado');
    }

    // Adicionando hover para exibir os detalhes
    layer.on('mouseover', () => this.showDetails(layer));
    layer.on('mouseout', () => this.map.closePopup());
  }

  // Exibir os detalhes (distância, área, perímetro) no hover
  showDetails(layer) {
    let content = '';

    if (layer.areaText) {
      content += `Área: ${layer.areaText} <br>`;
    }
    if (layer.perimeterText) {
      content += `Perímetro: ${layer.perimeterText} <br>`;
    }
    if (layer.distanceText) {
      content += `Extensão: ${layer.distanceText} <br>`;
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

  calculateAzimuthForPolygon(layer) {
    const latlngs = layer.getLatLngs()[0]; // Primeiro anel do polígono
    if (latlngs.length < 2) return;

    const start = latlngs[0];
    const end = latlngs[1];

    const azimuth = this.getAzimuth(start, end);
    console.log(`Azimute do polígono: ${azimuth.toFixed(2)}°`);

    layer.azimuthText = `${azimuth.toFixed(2)}°`;
  }

  getAzimuth(start, end) {
    const lat1 = start.lat * (Math.PI / 180);
    const lon1 = start.lng * (Math.PI / 180);
    const lat2 = end.lat * (Math.PI / 180);
    const lon2 = end.lng * (Math.PI / 180);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let azimuth = Math.atan2(y, x) * (180 / Math.PI);
    return (azimuth + 360) % 360;
  }

  calculateDistance(layer) {
    const latlngs = layer.getLatLngs();
    let totalDistance = 0;

    for (let i = 0; i < latlngs.length - 1; i++) {
      totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
    }

    layer.distanceText = totalDistance >= 1000
      ? `${(totalDistance / 1000).toFixed(2)} km`
      : `${totalDistance.toFixed(2)} m`;

    console.log('Distância da linha: ' + layer.distanceText);
  }

  calculateAreaAndPerimeter(layer) {
    const latlngs = layer.getLatLngs();

    // Verifica se o polígono é válido para calcular a área
    if (latlngs.length > 0 && latlngs[0].length > 2) {
        const closedPolygon = L.polygon(latlngs[0]);
        const area = L.GeometryUtil.geodesicArea(closedPolygon.getLatLngs()[0]); // Área em metros quadrados
        
        // Ajuste na exibição da área
        let areaText;
        if (area >= 1000000) {
            // Converte para quilômetros quadrados se a área for grande
            areaText = `${(area / 1000000).toFixed(2)} km²`;
        } else {
            // Exibe a área em metros quadrados
            areaText = `${area.toFixed(2)} m²`;
        }
        layer.areaText = areaText;

        // Calcula o perímetro
        let perimeter = 0;
        for (let i = 0; i < latlngs[0].length; i++) {
            const p1 = latlngs[0][i];
            const p2 = latlngs[0][(i + 1) % latlngs[0].length];
            perimeter += this.calculateDistanceBetweenPoints(p1, p2);
        }

        // Ajuste na exibição do perímetro
        layer.perimeterText = perimeter >= 1000
            ? `${(perimeter / 1000).toFixed(2)} km`
            : `${perimeter.toFixed(2)} m`;

        // Exibição de resultados no console
        console.log('Área: ' + layer.areaText);
        console.log('Perímetro: ' + layer.perimeterText);
    } else {
        alert('Desenhe um polígono com pelo menos três pontos para calcular a área.');
    }
}

calculateDistanceBetweenPoints(p1, p2) {
    return p1.distanceTo(p2);
}
}