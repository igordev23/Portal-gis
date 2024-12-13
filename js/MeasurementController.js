export class MeasurementController {
  constructor(map) {
    this.map = map;
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);
    this.measurementBox = document.getElementById('measurement-box');
    this.measurementContent = document.getElementById('measurement-content');
    this.closeButton = document.getElementById('close-measurement-box');
    this.unitSelector = document.getElementById('unit-selector');
    this.selectedLayer = null;

    this.closeButton.addEventListener('click', () => this.hideMeasurementBox());
    this.unitSelector.addEventListener('change', () => {
      if (this.selectedLayer) {
        this.updateUnit(this.selectedLayer);
      }
    });

    this.drawControl = new L.Control.Draw({
      draw: {
        polyline: true,
        polygon: true,
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
    this.currentUnit = 'm';
  }

  handleDrawEvent(event) {
    const layer = event.layer;
    this.clearSelection();
    this.selectedLayer = layer;
    this.drawnItems.addLayer(layer);
    this.updateUnitOptions(layer); // Atualiza as opções de unidade com base no tipo de camada
    this.updateMeasurements(layer);
    layer.on('click', () => this.selectLayer(layer));
    this.showDetails(layer);
  }

  handleEditEvent(event) {
    event.layers.eachLayer(layer => {
      this.clearMarkersAndLabels();
      this.updateMeasurements(layer);
      this.showDetails(layer);
    });
  }

  selectLayer(layer) {
    this.clearSelection();
    this.selectedLayer = layer;
    layer.selected = true;
    this.updateUnitOptions(layer); // Atualiza as opções de unidade ao selecionar uma camada
    this.showDetails(layer);
  }

  clearSelection() {
    if (this.selectedLayer) {
        // Limpa a seleção na camada selecionada, se houver
        this.selectedLayer.selected = false;

        // Remove apenas os rótulos de distância e marcadores associados à camada selecionada
        this.clearMarkersAndLabelsForLayer(this.selectedLayer);
        
        // Desmarca a camada selecionada
        this.selectedLayer = null;
    }
}

clearMarkersAndLabelsForLayer(layer) {
    // Remove os rótulos de distância e marcadores específicos para a camada dada
    if (layer.distanceLabels) {
        layer.distanceLabels.forEach(label => this.map.removeLayer(label));
        layer.distanceLabels = [];
    }
    if (layer.pointMarkers) {
        layer.pointMarkers.forEach(marker => this.map.removeLayer(marker));
        layer.pointMarkers = [];
    }
}

deleteSelectedLayer() {
    if (this.selectedLayer) {
        // Remove a camada selecionada do grupo de camadas desenhadas
        this.drawnItems.removeLayer(this.selectedLayer);

        // Remove os rótulos e marcadores associados à camada selecionada
        this.clearMarkersAndLabelsForLayer(this.selectedLayer);
        
        // Limpa a seleção
        this.selectedLayer = null;
        this.hideMeasurementBox();
    }
}



  updateUnitOptions(layer) {
    // Limpa as opções de unidade existentes
    this.unitSelector.innerHTML = '';

    if (layer instanceof L.Polyline) {
        // Apenas unidades lineares para linhas (metros e quilômetros)
        this.unitSelector.innerHTML += `
            <option value="m">Metros</option>
            <option value="km">Quilômetros</option>
             
        `;
    } if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        // Apenas unidades de área para polígonos e retângulos
        this.unitSelector.innerHTML += `
            

             <option value="ha">Hectares</option>
        `;
    }

    // Define a unidade padrão como a primeira opção disponível
    this.currentUnit = this.unitSelector.value;
}


updateUnit(selectedLayer) {
  // Verifica se uma camada foi selecionada antes de limpar as medições anteriores
  if (selectedLayer) {
    // Limpa os rótulos das medições anteriores
    this.clearPreviousMeasurements();
    
    // Atualiza a unidade atual com o valor selecionado no seletor de unidade
    this.currentUnit = this.unitSelector.value;

    // Atualiza as medições e mostra os detalhes da nova unidade
    this.updateMeasurements(selectedLayer);
    this.showDetails(selectedLayer);
  }
}


clearPreviousMeasurements() {
  // Verifica se o array de rótulos de distância existe
  if (this.distanceLabels && this.distanceLabels.length > 0) {
    // Remove cada rótulo de distância do mapa
    this.distanceLabels.forEach(label => this.map.removeLayer(label));
    // Esvazia o array de rótulos de distância
    this.distanceLabels = [];
  }
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
    let totalDistance = 0;
    let pointNameCounter = 1;

    for (let i = 0; i < latlngs.length - 1; i++) {
        const startPoint = latlngs[i];
        const endPoint = latlngs[i + 1];
        let segmentDistance = startPoint.distanceTo(endPoint);

        if (this.currentUnit === 'km') segmentDistance /= 1000;
        totalDistance += segmentDistance;

        // Cria o marcador do ponto e adiciona o evento de clique
        const pointMarker = L.marker(startPoint, { title: `P${pointNameCounter}` }).addTo(this.map)
            .bindTooltip(`P${pointNameCounter}`).openTooltip()
            .on('click', () => this.copyCoordinatesFormatted(startPoint)); // Evento de clique para copiar coordenadas
        this.pointMarkers.push(pointMarker);

        const midLatLng = this.getMidPoint(startPoint, endPoint);
        const distanceLabel = L.marker(midLatLng, { icon: L.divIcon({ className: 'distance-label' }) })
            .addTo(this.map)
            .bindTooltip(`${segmentDistance.toFixed(2)} ${this.currentUnit}`, {
                permanent: true,
                className: 'distance-tooltip'
            });
        this.distanceLabels.push(distanceLabel);
        pointNameCounter++;
    }
    const lastPointMarker = L.marker(latlngs[latlngs.length - 1], { title: `P${pointNameCounter}` }).addTo(this.map)
        .bindTooltip(`P${pointNameCounter}`).openTooltip()
        .on('click', () => this.copyCoordinatesFormatted(latlngs[latlngs.length - 1]));
    this.pointMarkers.push(lastPointMarker);
    layer.distanceText = `${totalDistance.toFixed(2)} ${this.currentUnit}`;
}

calculateAreaAndPerimeter(layer) {
    const latlngs = layer.getLatLngs();
    if (latlngs.length > 0 && latlngs[0].length > 2) {
        const closedPolygon = L.polygon(latlngs[0]);
        let area = L.GeometryUtil.geodesicArea(closedPolygon.getLatLngs()[0]);
        let perimeter = 0;
        let pointNameCounter = 1;

        if (this.currentUnit === 'km') {
            area /= 1000000;
        }
        layer.areaText = `${area.toFixed(2)} ${this.currentUnit === 'km' ? 'km²' : 'm²'}`;

        for (let i = 0; i < latlngs[0].length; i++) {
            const p1 = latlngs[0][i];
            const p2 = latlngs[0][(i + 1) % latlngs[0].length];
            let segmentDistance = p1.distanceTo(p2);

            if (this.currentUnit === 'km') {
                segmentDistance /= 1000;
            }
            perimeter += segmentDistance;

            // Cria o marcador do ponto e adiciona o evento de clique
            const pointMarker = L.marker(p1, { title: `P${pointNameCounter}` }).addTo(this.map)
                .bindTooltip(`P${pointNameCounter}`).openTooltip()
                .on('click', () => this.copyCoordinatesFormatted(p1));
            this.pointMarkers.push(pointMarker);

            const midLatLng = this.getMidPoint(p1, p2);
            const distanceLabel = L.marker(midLatLng, { icon: L.divIcon({ className: 'distance-label' }) })
                .addTo(this.map)
                .bindTooltip(`${segmentDistance.toFixed(2)} ${this.currentUnit}`, {
                    permanent: true,
                    className: 'distance-tooltip'
                });
            this.distanceLabels.push(distanceLabel);

            pointNameCounter++;
        }

        layer.perimeterText = `${perimeter.toFixed(2)} ${this.currentUnit}`;
    } else {
        alert('Desenhe um polígono com pelo menos três pontos para calcular a área.');
    }
}

// Função para copiar coordenadas formatadas
copyCoordinatesFormatted(latlng) {
    const formatCoordinate = (coord, isLat) => {
        const hemisphere = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'O');
        const absCoord = Math.abs(coord);
        const degrees = Math.floor(absCoord);
        const minutes = Math.floor((absCoord - degrees) * 60);
        const seconds = ((absCoord - degrees - minutes / 60) * 3600).toFixed(3);
        return `${degrees}° ${minutes}' ${seconds}" ${hemisphere}`;
    };

    const formattedLat = formatCoordinate(latlng.lat, true);
    const formattedLng = formatCoordinate(latlng.lng, false);
    const coordsText = `Coordenadas: ${formattedLat}, ${formattedLng}`;

    navigator.clipboard.writeText(coordsText)
        .then(() => alert(`Coordenadas copiadas: ${coordsText}`))
        .catch(err => alert('Falha ao copiar as coordenadas: ' + err));
}




// Função para copiar coordenadas
copyCoordinates(latlng) {
    const coordsText = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsText)
        .then(() => alert(`Coordenadas copiadas: ${coordsText}`))
        .catch(err => alert('Falha ao copiar as coordenadas: ' + err));
}



  clearMarkersAndLabels() {
    this.pointMarkers.forEach(marker => this.map.removeLayer(marker));
    this.distanceLabels.forEach(label => this.map.removeLayer(label));
    this.pointMarkers = [];
    this.distanceLabels = [];
  }

  getMidPoint(latlng1, latlng2) {
    return L.latLng(
      (latlng1.lat + latlng2.lat) / 2,
      (latlng1.lng + latlng2.lng) / 2
    );

}}
