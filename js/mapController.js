import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';
import { DataFetcher } from './DataFetcher.js';
import { SwipeController } from './SwipeController.js';

export class MapController {
    constructor(mapElementId) {
        // Inicializando o mapa e a camada base OSM
        this.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        this.map = L.map(mapElementId, { center: [-2.99241, -45.40649], zoom: 10, layers: [this.osm] });
        this.currentBaseLayer = this.osm;

        // Definindo outras camadas base
        this.satellite = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap contributors'
        });

        this.cartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a> contributors'
        });

        this.stamenWatercolor = L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.'
        });

        this.esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, USGS, NOAA'
        });

        this.cartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a> contributors'
        });

        // Adicionando os controladores
        this.measurementController = new MeasurementController(this.map);

        const imageBounds = [[-2.992508, -45.369120], [-2.954409, -45.314294]];
        this.staticImageLayer = L.imageOverlay('raster_jpeg.jpeg', imageBounds, {
            opacity: 0.8,
            attribution: '© Raster Image'
        });

        this.geoJSONController = new GeoJSONController(this.map, this.staticImageLayer);
        this.geoJSONController.setupCheckboxListeners();
        this.geoJSONController.updateLayers();

        this.features = [];

        this.setupMouseCoordinates();

        this.dataFetcher = new DataFetcher(this.map, this.geoJSONController);
        this.dataFetcher.buscarDados();

        // Ajuste do SwipeController para garantir camadas base no lado correto
        this.swipeController = new SwipeController(this.map, 'divider-line', 'swipe-tool-btn', this.osm, this.satellite);

        this.setupSearchEvent();
    }

    // Método atualizado para alternar camadas base corretamente
    switchBaseLayer(provider, side = 'left') {
        let newLayer;

        switch (provider) {
            case 'osm':
                newLayer = this.osm;
                break;
            case 'satellite':
                newLayer = this.satellite;
                break;
            case 'cartodb':
                newLayer = this.cartoDB_Positron;
                break;
            case 'stamen-watercolor':
                newLayer = this.stamenWatercolor;
                break;
            case 'esri-world-imagery':
                newLayer = this.esriWorldImagery;
                break;
            case 'cartodb-dark-matter':
                newLayer = this.cartoDB_DarkMatter;
                break;
            default:
                newLayer = this.osm;
        }

        // Remove a camada base anterior, se houver
        if (this.currentBaseLayer && this.map.hasLayer(this.currentBaseLayer)) {
            this.map.removeLayer(this.currentBaseLayer);
        }

        // Adiciona a nova camada base ao mapa
        this.currentBaseLayer = newLayer;
        this.map.addLayer(newLayer);

        // Atualiza as camadas no SwipeController se estiver ativo
        if (this.swipeController.isSwipeActive) {
            if (side === 'left') {
                this.swipeController.leftMapLayer = newLayer;
            } else {
                this.swipeController.rightMapLayer = newLayer;
            }
            this.swipeController.setMapLayers();
        }
    }

    disableSwipeController() {
        this.swipeController.disableSwipe();
    }

    setupSearchEvent() {
        document.getElementById('search-input').addEventListener('input', (event) => {
            const query = event.target.value;
            if (query.length > 2) {
                this.searchInMap(query);
            } else {
                document.getElementById('suggestions-list').style.display = 'none';
            }
        });

        document.addEventListener('click', (event) => {
            const suggestionsList = document.getElementById('suggestions-list');
            if (!suggestionsList.contains(event.target) && event.target.id !== 'search-input') {
                suggestionsList.style.display = 'none';
            }
        });
    }

    searchInMap(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const suggestionsList = document.getElementById('suggestions-list');
        suggestionsList.innerHTML = '';

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    suggestionsList.style.display = 'none';
                    return;
                }

                this.map.eachLayer(layer => {
                    if (layer instanceof L.Marker && layer.options.searchRelated) {
                        this.map.removeLayer(layer);
                    }
                });

                data.forEach(place => {
                    const li = document.createElement('li');
                    li.textContent = place.display_name;
                    li.addEventListener('click', () => {
                        const lat = place.lat;
                        const lon = place.lon;

                        this.map.setView([lat, lon], 13);

                        const marker = L.marker([lat, lon], { searchRelated: true }).addTo(this.map);
                    });

                    suggestionsList.appendChild(li);
                });

                suggestionsList.style.display = 'block';
            });
    }

    setupMouseCoordinates() {
        this.map.on('mousemove', (e) => {
            const latLng = e.latlng;
            document.getElementById('coords').textContent = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
        });
    }
}


