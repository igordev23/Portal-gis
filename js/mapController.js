import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';

export class MapController {
    constructor(mapElementId) {
        // Inicializa o mapa, mas não o exibe até o usuário selecionar um mapa
        this.map = L.map(mapElementId, { center: [0, 0], zoom: 2, layers: [] });
        this.currentBaseLayer = null;

        // Define as camadas de mapas base
        this.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

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

        // Atualiza o elemento de coordenadas com a posição do mouse
        this.setupMouseCoordinates();

        // Inicializar os controladores adicionais
        this.geoJSONController = new GeoJSONController(this.map);

        // Configurar listeners de checkboxes para GeoJSON
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
        // Converte a consulta para minúsculas para comparação
        const lowerCaseQuery = query.toLowerCase();

        // Filtra as características com base na consulta
        const results = this.features.filter(feature =>
            feature.name.toLowerCase().includes(lowerCaseQuery)
        );

        // Limpa os marcadores existentes que não fazem parte do resultado da busca
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker && !this.features.some(f => f.marker === layer)) {
                this.map.removeLayer(layer);
            }
        });

        // Adiciona os marcadores dos resultados encontrados
        if (results.length > 0) {
            results.forEach(feature => {
                L.marker(feature.coordinates).addTo(this.map)
                    .bindPopup(feature.name)
                    .openPopup(); // Abre o popup para o primeiro resultado
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
                this.currentBaseLayer = this.osm; // Provedor padrão
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
