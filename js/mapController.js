import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';
import { DataFetcher } from './DataFetcher.js'; // Importando a nova classe
import { SwipeController } from './SwipeController.js'; // Importando o SwipeController

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
        this.dataFetcher.buscarDados(); // Chamando a função de busca de dados

         // Inicialize o SwipeController após o mapa estar pronto
         this.swipeController = new SwipeController(this.map, 'divider-line', 'swipe-tool-btn');

        // Configurar o evento de input para busca de lugares
        this.setupSearchEvent();
    }

    // Função para configurar o evento de busca
    setupSearchEvent() {
        document.getElementById('search-input').addEventListener('input', (event) => {
            const query = event.target.value;
            if (query.length > 2) { // Começar a busca após 2 caracteres
                this.searchInMap(query);
            } else {
                document.getElementById('suggestions-list').style.display = 'none'; // Ocultar lista se menos de 2 caracteres
            }
        });

        // Evento para ocultar a lista de sugestões ao clicar fora
        document.addEventListener('click', (event) => {
            const suggestionsList = document.getElementById('suggestions-list');
            if (!suggestionsList.contains(event.target) && event.target.id !== 'search-input') {
                suggestionsList.style.display = 'none'; // Ocultar lista se clicar fora
            }
        });
    }

    // Função para buscar lugares reais no mapa usando Nominatim
    searchInMap(query) {
        const lowerCaseQuery = query.toLowerCase();
        const suggestionsList = document.getElementById('suggestions-list');
        suggestionsList.innerHTML = ''; // Limpar sugestões anteriores

        // URL da API Nominatim para geocodificação
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

        // Fazendo uma requisição fetch para buscar o local real
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    suggestionsList.style.display = 'none'; // Ocultar lista se nenhum lugar for encontrado
                    return;
                }

                // Limpar marcadores de buscas anteriores
                this.map.eachLayer(layer => {
                    if (layer instanceof L.Marker && layer.options.searchRelated) {
                        this.map.removeLayer(layer);
                    }
                });

                // Adicionar sugestões à lista
                data.forEach(place => {
                    const li = document.createElement('li');
                    li.textContent = place.display_name; // Nome do lugar
                    li.onclick = () => {
                        this.addMarkerAndSetView(place.lat, place.lon, place.display_name); // Adicionar marcador e centralizar
                        suggestionsList.style.display = 'none'; // Ocultar lista após seleção
                    };
                    suggestionsList.appendChild(li);
                });

                // Exibir a lista de sugestões
                if (suggestionsList.childElementCount > 0) {
                    suggestionsList.style.display = 'block';
                } else {
                    suggestionsList.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Erro ao buscar o local:', error);
            });
    }

    // Função para adicionar um marcador e centralizar no mapa
    addMarkerAndSetView(lat, lon, name) {
        const marker = L.marker([lat, lon], { searchRelated: true })
            .addTo(this.map)
            .bindPopup(name)
            .openPopup();

        // Centralizar o mapa no lugar selecionado
        this.map.setView([lat, lon], 12);
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
