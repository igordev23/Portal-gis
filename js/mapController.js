import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';
import { DataFetcher } from './DataFetcher.js';  // Importando a nova classe

export class MapController {
    constructor(mapElementId) {
        // Define as camadas de mapas base
        this.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        // Inicializa o mapa com a camada OSM
        this.map = L.map(mapElementId, { center: [-2.99241, -45.40649], zoom: 10, layers: [this.osm] });
        this.currentBaseLayer = this.osm;

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

        // Inicializar o MeasurementController para adicionar funcionalidade de medição
        this.measurementController = new MeasurementController(this.map);

        // Coordenadas ajustadas da imagem em EPSG:4326 (latitude/longitude)
        const imageBounds = [[-2.992508, -45.369120], [-2.954409, -45.314294]];
        this.staticImageLayer = L.imageOverlay('raster_jpeg.jpeg', imageBounds, {
            opacity: 0.8,
            attribution: '© Raster Image'
        });

        // Inicializar os controladores adicionais
        this.geoJSONController = new GeoJSONController(this.map, this.staticImageLayer);
        this.geoJSONController.setupCheckboxListeners();
        this.geoJSONController.updateLayers();

        // Inicializar o array para armazenar as características do mapa
        this.features = [];

        // Configurar coordenadas do mouse
        this.setupMouseCoordinates();

        // Inicializar o DataFetcher e chamar a função buscarDados
        this.dataFetcher = new DataFetcher(this.map, this.geoJSONController);
        this.dataFetcher.buscarDados();  // Chamando a função de busca de dados
    }

    // Função para buscar no mapa (continua a mesma)
    searchInMap(query) {
        const lowerCaseQuery = query.toLowerCase();
        const results = this.features.filter(feature =>
            feature.name.toLowerCase().includes(lowerCaseQuery)
        );

        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker && !this.features.some(f => f.marker === layer)) {
                this.map.removeLayer(layer);
            }
        });

        if (results.length > 0) {
            results.forEach(feature => {
                L.marker(feature.coordinates).addTo(this.map)
                    .bindPopup(feature.name)
                    .openPopup();
            });
        } else {
            alert('Nenhum resultado encontrado.');
        }
    }

    // Função para alternar a camada base do mapa (continua a mesma)
    switchBaseLayer(provider) {
        if (this.currentBaseLayer) {
            this.map.removeLayer(this.currentBaseLayer);
        }

        switch (provider) {
            case 'osm':
                this.currentBaseLayer = this.osm;
                break;
            case 'satellite':
                this.currentBaseLayer = this.satellite;
                break;
            case 'cartodb':
                this.currentBaseLayer = this.cartoDB_Positron;
                break;
            case 'stamen-watercolor':
                this.currentBaseLayer = this.stamenWatercolor;
                break;
            case 'esri-world-imagery':
                this.currentBaseLayer = this.esriWorldImagery;
                break;
            case 'cartodb-dark-matter':
                this.currentBaseLayer = this.cartoDB_DarkMatter;
                break;
            default:
                this.currentBaseLayer = this.osm;
        }

        if (this.currentBaseLayer) {
            this.currentBaseLayer.addTo(this.map);
        }
    }

    // Função para exibir coordenadas do mouse no mapa (continua a mesma)
    setupMouseCoordinates() {
        this.map.on('mousemove', (e) => {
            const latLng = e.latlng;
            document.getElementById('coords').textContent = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
        });
    }
}
