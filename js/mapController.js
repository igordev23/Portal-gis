import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';

export class MapController {
    constructor(mapElementId) {
       
         // Define as camadas de mapas base
         this.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

       
       
        // Inicializa o mapa sem nenhuma camada carregada inicialmente
        this.map = L.map(mapElementId, { center: [-2.99241, -45.40649], zoom: 10, layers: [] });
          // Adiciona a camada OSM ao mapa
          this.osm.addTo(this.map); // Adicione esta linha
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

       // Coordenadas ajustadas da imagem em EPSG:4326 (latitude/longitude)
// Coordenadas ajustadas da imagem em EPSG:4326 (latitude/longitude)
const imageBounds = [[-2.9925081769999986, -45.3691209124003265], [-2.9544096540000000, -45.3142947085996823]];



        // Adicionando a camada de imagem estática
        this.staticImageLayer = L.imageOverlay('raster_jpeg.jpeg', imageBounds, {
            opacity: 0.8,
            attribution: '© Raster Image'
        });

        // Inicializar o MeasurementController para adicionar funcionalidade de medição
        this.measurementController = new MeasurementController(this.map);

        // Atualiza o elemento de coordenadas com a posição do mouse
        this.setupMouseCoordinates();

        // Inicializar os controladores adicionais
        this.geoJSONController = new GeoJSONController(this.map, this.staticImageLayer);

        // Configurar listeners de checkboxes para GeoJSON e imagem raster
        this.geoJSONController.setupCheckboxListeners();
        this.geoJSONController.updateLayers(); // Carregar camadas GeoJSON iniciais

        // Inicializar o array para armazenar os marcadores ou características que você deseja buscar
        this.features = []; // Array para armazenar as características do mapa
    }

    // Função para adicionar marcadores ao mapa (para exemplo)
    addFeature(name, coordinates) {
        const marker = L.marker(coordinates).addTo(this.map).bindPopup(name);
        this.features.push({ name, coordinates, marker }); // Adiciona a feature ao array
    }

    // Função para buscar no mapa
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

   // Troca a camada base do mapa com base no provedor selecionado
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

    // Função para adicionar as coordenadas do mouse no mapa
    setupMouseCoordinates() {
        this.map.on('mousemove', (e) => {
            const latLng = e.latlng;
            document.getElementById('coords').textContent = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
        });
    }
}
