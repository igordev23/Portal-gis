export class MeasurementController {
  constructor(map) {
    this.map = map;
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);
    this.measurementBox = document.getElementById('measurement-box');
    this.measurementContent = document.getElementById('measurement-content');
    this.closeButton = document.getElementById('close-measurement-box');

    this.closeButton.addEventListener('click', () => this.hideMeasurementBox());

    this.drawControl = new L.Control.Draw({
      draw: {
        polyline: true,  // Desenho de linha
        polygon: true,   // Desenho de área
        marker: false,
        circle: false,
        rectangle: true
      },
      edit: {
        featureGroup: this.drawnItems
      }
    });

    this.map.addControl(this.drawControl);

    this.map.on(L.Draw.Event.CREATED, (event) => this.handleDrawEvent(event));
    this.map.on(L.Draw.Event.EDITED, (event) => this.handleEditEvent(event));
    this.map.on(L.Draw.Event.DELETED, () => this.clearMarkersAndLabels());

    this.pointMarkers = [];
    this.distanceLabels = [];
  }

  handleDrawEvent(event) {
    const layer = event.layer;
    this.drawnItems.addLayer(layer);
    this.updateMeasurements(layer);
    layer.on('click', () => this.showDetails(layer));
    this.showDetails(layer);
  }

  handleEditEvent(event) {
    // Recalcula as medições para cada layer editado
    event.layers.eachLayer(layer => {
      this.clearMarkersAndLabels();
      this.updateMeasurements(layer);
      this.showDetails(layer);
    });
  }

  updateMeasurements(layer) {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      this.calculateAreaAndPerimeter(layer);
      this.calculateAzimuthForPolygon(layer);
    } else if (layer instanceof L.Polyline) {
      this.calculateIncrementalDistance(layer);
      this.calculateAzimuth(layer);
    }
  }

  showDetails(layer) {
    let content = '';
    if (layer.areaText) content += `Área: ${layer.areaText} <br>`;
    if (layer.perimeterText) content += `Perímetro: ${layer.perimeterText} <br>`;
    if (layer.distanceText) content += `Extensão total: ${layer.distanceText} <br>`;
    if (layer.azimuthText) content += `Azimute: ${layer.azimuthText} <br>`;

    this.measurementContent.innerHTML = content ? content : 'Nenhuma medida disponível.';
    this.showMeasurementBox();
  }

  showMeasurementBox() {
    this.measurementBox.classList.remove('hidden');
  }

  hideMeasurementBox() {
    this.measurementBox.classList.add('hidden');
  }

  calculateAzimuth(layer) {
    const latlngs = layer.getLatLngs();
    if (latlngs.length < 2) return;

    const start = latlngs[0];
    const end = latlngs[1];
    const azimuth = this.getAzimuth(start, end);
    layer.azimuthText = `${azimuth.toFixed(2)}°`;
  }

  calculateAzimuthForPolygon(layer) {
    const latlngs = layer.getLatLngs()[0];
    if (latlngs.length < 2) return;

    const start = latlngs[0];
    const end = latlngs[1];
    const azimuth = this.getAzimuth(start, end);
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

  calculateIncrementalDistance(layer) {
    const latlngs = layer.getLatLngs();
    let pointNameCounter = 1;
    let totalDistance = 0;

    for (let i = 0; i < latlngs.length - 1; i++) {
      const startPoint = latlngs[i];
      const endPoint = latlngs[i + 1];

      const segmentDistance = startPoint.distanceTo(endPoint);
      totalDistance += segmentDistance;

      const pointMarker = L.marker(startPoint, { title: `P${pointNameCounter}` }).addTo(this.map)
        .bindTooltip(`P${pointNameCounter}`).openTooltip();
      this.pointMarkers.push(pointMarker);

      const midLatLng = this.getMidPoint(startPoint, endPoint);
      const distanceLabel = L.marker(midLatLng, { icon: L.divIcon({ className: 'distance-label' }) })
        .addTo(this.map)
        .bindTooltip(`${segmentDistance >= 1000 ? (segmentDistance / 1000).toFixed(2) + ' km' : segmentDistance.toFixed(2) + ' m'}`, {
          permanent: true,
          className: 'distance-tooltip'
        });
      this.distanceLabels.push(distanceLabel);

      pointNameCounter++;
    }

    const lastPointMarker = L.marker(latlngs[latlngs.length - 1], { title: `P${pointNameCounter}` }).addTo(this.map)
      .bindTooltip(`P${pointNameCounter}`).openTooltip();
    this.pointMarkers.push(lastPointMarker);

    layer.distanceText = totalDistance >= 1000
      ? `${(totalDistance / 1000).toFixed(2)} km`
      : `${totalDistance.toFixed(2)} m`;
  }

  calculateAreaAndPerimeter(layer) {
    const latlngs = layer.getLatLngs();
    if (latlngs.length > 0 && latlngs[0].length > 2) {
        const closedPolygon = L.polygon(latlngs[0]);
        const area = L.GeometryUtil.geodesicArea(closedPolygon.getLatLngs()[0]);

        layer.areaText = area >= 1000000
            ? `${(area / 1000000).toFixed(2)} km²`
            : `${area.toFixed(2)} m²`;

        let perimeter = 0;
        let pointNameCounter = 1;

        // Adiciona marcadores e etiquetas de distância entre cada ponto
        for (let i = 0; i < latlngs[0].length; i++) {
            const p1 = latlngs[0][i];
            const p2 = latlngs[0][(i + 1) % latlngs[0].length];

            // Calcula a distância entre os pontos
            const segmentDistance = p1.distanceTo(p2);
            perimeter += segmentDistance;

            // Cria o marcador do ponto atual
            const pointMarker = L.marker(p1, { title: `P${pointNameCounter}` }).addTo(this.map)
                .bindTooltip(`P${pointNameCounter}`).openTooltip();
            this.pointMarkers.push(pointMarker);

            // Calcula o ponto médio para a etiqueta de distância
            const midLatLng = this.getMidPoint(p1, p2);
            const distanceLabel = L.marker(midLatLng, { icon: L.divIcon({ className: 'distance-label' }) })
                .addTo(this.map)
                .bindTooltip(`${segmentDistance >= 1000 ? (segmentDistance / 1000).toFixed(2) + ' km' : segmentDistance.toFixed(2) + ' m'}`, {
                    permanent: true,
                    className: 'distance-tooltip'
                });
            this.distanceLabels.push(distanceLabel);

            pointNameCounter++;
        }

        // Exibe o marcador do último ponto
        const lastPointMarker = L.marker(latlngs[0][latlngs[0].length - 1], { title: `P${pointNameCounter}` }).addTo(this.map)
            .bindTooltip(`P${pointNameCounter}`).openTooltip();
        this.pointMarkers.push(lastPointMarker);

        layer.perimeterText = perimeter >= 1000
            ? `${(perimeter / 1000).toFixed(2)} km`
            : `${perimeter.toFixed(2)} m`;
    } else {
        alert('Desenhe um polígono com pelo menos três pontos para calcular a área.');
    }
}


  clearMarkersAndLabels() {
    this.pointMarkers.forEach(marker => this.map.removeLayer(marker));
    this.distanceLabels.forEach(label => this.map.removeLayer(label));
    this.pointMarkers = [];
    this.distanceLabels = [];
  }

  getMidPoint(p1, p2) {
    return L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
  }
}
