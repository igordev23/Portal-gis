import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';
import { DataFetcher } from './DataFetcher.js';
import { SwipeController } from './SwipeController.js';
import ElevationService from './ElevationService.js';

export class MapController {
    constructor(mapElementId) { 


        this.initialCenter = [-4.45800, -47.52531];
        this.initialZoom = 14;
        this.pontos = [];
        this.polyline = null;
        this.elevationService = new ElevationService();
        this.chartInstance = null; // Propriedade para armazenar o gráfico

        // Inicializando o mapa e a camada base OSM
        this.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        this.map = L.map(mapElementId, { center: this.initialCenter, zoom: this.initialZoom, layers: [this.osm] });
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

        document.getElementById("terrain-elevation-btn").addEventListener("click", () => this.marcarPontos());
    

        // Adicionando os controladores
        this.measurementController = new MeasurementController(this.map);

       
    // Adicionando a imagem overlay
    const imageBounds = [[-4.474798665, -47.552014662], [-4.433812159, -47.506472635]];

    // Link direto da imagem no Google Drive
    const imageUrl = '../ORTOFOTO.png';
    
    this.staticImageLayer = L.imageOverlay(imageUrl, imageBounds, {
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

        // Configura o SwipeController para garantir camadas base no lado correto
        this.swipeController = new SwipeController(this.map, 'divider-line', 'swipe-tool-btn', this.osm, this.satellite);

        // Configura o evento do botão de impressão
        this.setupPrintEvent();

        this.setupSearchEvent();


        // Configura o evento de atualização de escala ao mudar o zoom
        this.map.on('zoomend', () => this.updateScale());

        // Exibe a escala inicial
        this.updateScale();

        

    }

    abrirModal(dataElevacao) {
        const modal = document.getElementById("elevation-modal");
        modal.style.display = "block";
    
        const canvas = document.getElementById('elevation-chart');
        const ctx = canvas.getContext('2d');
    
        // Destrói o gráfico existente, se houver
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    
        // Cria uma nova instância do gráfico
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dataElevacao.distancias,
                datasets: [{
                    label: 'Elevação (m)',
                    data: dataElevacao.elevacoes,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Distância (m)' }},
                    y: { title: { display: true, text: 'Elevação (m)' }}
                }
            }
        });
    }
    
    marcarPontos() {
        // Limpa o estado anterior
        if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.polyline = null;
        }
        if (this.marcadores && this.marcadores.length > 0) {
            this.marcadores.forEach((marker) => this.map.removeLayer(marker));
            this.marcadores = [];
        }
    
        this.pontos = [];
        this.marcadores = [];
    
        // Remove qualquer evento anterior
        if (this.capturarPontoHandler) {
            this.map.off("click", this.capturarPontoHandler);
        }
    
        // Define o evento de captura de ponto
        this.capturarPontoHandler = this.capturarPonto.bind(this);
        this.map.on("click", this.capturarPontoHandler);
    
        alert("Clique no mapa para marcar o ponto inicial.");
    }
    
    capturarPonto(event) {
        const { lat, lng } = event.latlng;
        const marker = L.marker([lat, lng]).addTo(this.map);
    
        // Salva o marcador para remoção futura, se necessário
        this.marcadores = this.marcadores || [];
        this.marcadores.push(marker);
    
        this.pontos.push([lat, lng]);
    
        if (this.pontos.length === 1) {
            alert("Ponto inicial marcado. Clique no mapa para marcar o ponto final.");
        } else if (this.pontos.length === 2) {
            // Remove o evento "click" para evitar mais marcações
            this.map.off("click", this.capturarPontoHandler);
            this.desenharLinha();
            this.calcularElevacao();
        }
    }
    
    desenharLinha() {
        this.polyline = L.polyline(this.pontos, { color: 'blue' }).addTo(this.map);
        this.map.fitBounds(this.polyline.getBounds());
    }
    
    fecharModal() {
        const modal = document.getElementById("elevation-modal");
        modal.style.display = "none"; // Fecha o modal
    
        // Destrói o gráfico se ele existir
        if (this.chartInstance) {
            this.chartInstance.destroy(); // Remove a instância do gráfico
            this.chartInstance = null;
        }
    
        // Limpa o canvas
        const canvas = document.getElementById('elevation-chart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Remove qualquer conteúdo desenhado no canvas
    
        // Remove a linha (polyline) do mapa, se existir
        if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.polyline = null;
        }
    
        // Remove todos os marcadores adicionados no mapa
        if (this.marcadores && this.marcadores.length > 0) {
            this.marcadores.forEach((marker) => this.map.removeLayer(marker));
            this.marcadores = [];
        }
    
        // Remove o evento de captura de pontos do mapa, se existir
        if (this.capturarPontoHandler) {
            this.map.off("click", this.capturarPontoHandler);
            this.capturarPontoHandler = null;
        }
    
        // Reseta o estado dos pontos
        this.pontos = [];
    }
    
    
    
    
      async calcularElevacao() {
        const [pontoInicial, pontoFinal] = this.pontos;
        
        try {
          const dataElevacao = await this.elevationService.calcularElevacao(pontoInicial, pontoFinal);
          this.abrirModal(dataElevacao);
        } catch (error) {
          alert(error.message);
        }
      }



    setupPrintEvent() {
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.generatePDF());
        }
    }


    generatePDF() {
        // Oculta elementos que não devem aparecer na captura de tela
        const elementsToHide = document.querySelectorAll('.leaflet-control-zoom, .header, #control-buttons, #sidebar, .interface-elements, .map-button, .esconde, .leaflet-control-attribution');
        elementsToHide.forEach(el => el.style.display = 'none');
    
        // Configura o estilo do #scale-display para que fique no canto inferior direito do mapa
        const scaleDisplay = document.getElementById('scale-display');
        const originalScaleDisplayStyle = scaleDisplay.style.cssText;
        scaleDisplay.style.position = 'absolute';
        scaleDisplay.style.bottom = '10px';
        scaleDisplay.style.left = '700px';
        scaleDisplay.style.backgroundColor = 'transparent';
        scaleDisplay.style.fontSize = '12px';
        scaleDisplay.style.padding = '5px';
        scaleDisplay.style.border = 'none';
    
            // Adiciona borda e padding ao elemento do mapa (#map) durante a geração do PDF
        const mapContainer = document.getElementById('map');
        const originalMapStyle = mapContainer.style.cssText;
        mapContainer.style.border = '3px solid black';
        mapContainer.style.padding = '20px';
        mapContainer.style.margin = '0 40px';  // Margem apenas nas laterais
        mapContainer.style.width = 'auto';
        mapContainer.style.height = '600px';  // Limita a altura do mapa para caber em uma página A4
        mapContainer.style.boxSizing = 'border-box';
        mapContainer.style.overflow = 'hidden';

        // Adiciona o título na div 'createTitle'
        const titleContainer = document.getElementById('createTitle');
        titleContainer.innerHTML = ''; // Limpa o conteúdo anterior, se houver
        titleContainer.style.display = 'flex';
        titleContainer.style.justifyContent = 'center';
        titleContainer.style.marginBottom = '20px';
    
        const titleElement = document.createElement('h1');
        titleElement.style.textAlign = 'center';
        titleElement.style.display = 'flex';
        titleElement.style.alignItems = 'center';
    
        // Cria a imagem para o início do título
        const startImage = document.createElement('img');
        startImage.src = 'https://www.itinga.ma.gov.br/imagens/logo.png?v=2.0';
        startImage.alt = 'Imagem Início';
        startImage.style.width = '24px';
        startImage.style.height = '24px';
        startImage.style.marginRight = '5px';
    
        // Cria o texto do título entre as imagens
        const titleText = document.createElement('span');
        titleText.textContent = 'ITINGA - MA';
        titleText.style.margin = '0 5px';
    
        // Cria a imagem para o final do título
        const endImage = document.createElement('img');
        endImage.src = 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Bandeira_Itinga_do_Maranh%C3%A3o%2C_MA.jpg?20161226183048';
        endImage.alt = 'Imagem Fim';
        endImage.style.width = '24px';
        endImage.style.height = '35px';
        endImage.style.marginLeft = '5px';
    
        // Adiciona as imagens e o texto ao título
        titleElement.appendChild(startImage);
        titleElement.appendChild(titleText);
        titleElement.appendChild(endImage);
        titleContainer.appendChild(titleElement);
    
        // Obtém informações das camadas selecionadas
        const selectedLayers = this.getSelectedLayersInfo();
    
        // Localiza a div de legenda
        const legendContainer = document.getElementById('createlegend');
        legendContainer.innerHTML = ''; // Limpa o conteúdo anterior da div de legenda
        legendContainer.style.display = 'flex';
        legendContainer.style.justifyContent = 'center';
    
        const infoContainer = document.createElement('div');
        infoContainer.id = 'print-info';
        infoContainer.style.padding = '10px';
        infoContainer.style.backgroundColor = 'white';
        infoContainer.style.fontSize = '12px';
        infoContainer.style.width = '120%';
        infoContainer.style.textAlign = 'center';
        infoContainer.style.border = 'none';
    
        const layerTitle = document.createElement('h3');
        layerTitle.textContent = 'Legendas:';
        layerTitle.style.textAlign = 'center';
        infoContainer.appendChild(layerTitle);
    
        selectedLayers.forEach((info) => {
            const { fillColor, strokeColor, lineStyle, dashArray } = info.styles;
        
            const layerInfoContainer = document.createElement('div');
            layerInfoContainer.style.display = 'flex';
            layerInfoContainer.style.alignItems = 'center';
            layerInfoContainer.style.marginBottom = '10px';
            layerInfoContainer.style.width = '100%';
        
            const geometrySVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            geometrySVG.setAttribute("width", "24");
            geometrySVG.setAttribute("height", "24");
            geometrySVG.style.marginRight = "10px";
        
            let shapeElement;
            if (info.geometryType.includes('Polygon')) {
                shapeElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                shapeElement.setAttribute("width", "20");
                shapeElement.setAttribute("height", "20");
                shapeElement.setAttribute("fill", fillColor);
                shapeElement.setAttribute("stroke", strokeColor);
                shapeElement.setAttribute("stroke-width", "3");
                if (lineStyle === 'dotted') {
                    shapeElement.setAttribute("stroke-dasharray", "3,5");
                } else if (lineStyle === 'dashed') {
                    shapeElement.setAttribute("stroke-dasharray", "5,5");
                }
            } else if (info.geometryType.includes('Line')) {
                shapeElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
                shapeElement.setAttribute("x1", "0");
                shapeElement.setAttribute("y1", "12");
                shapeElement.setAttribute("x2", "20");
                shapeElement.setAttribute("y2", "12");
                shapeElement.setAttribute("stroke", strokeColor);
                shapeElement.setAttribute("stroke-width", "3");
                if (lineStyle === 'dotted') {
                    shapeElement.setAttribute("stroke-dasharray", "3,5");
                } else if (lineStyle === 'dashed') {
                    shapeElement.setAttribute("stroke-dasharray", "5,5");
                }
            } else if (info.geometryType.includes('Point')) {
                shapeElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                shapeElement.setAttribute("cx", "10");
                shapeElement.setAttribute("cy", "10");
                shapeElement.setAttribute("r", "5");
                shapeElement.setAttribute("fill", fillColor);
                shapeElement.setAttribute("stroke", strokeColor);
                shapeElement.setAttribute("stroke-width", "3");
                shapeElement.setAttribute("stroke-dasharray", "3");
            }
        
            if (shapeElement) {
                geometrySVG.appendChild(shapeElement);
            }
        
            layerInfoContainer.appendChild(geometrySVG);
        
            const layerInfoText = document.createElement('span');
            layerInfoText.textContent = `Camada: ${info.layer}`;
            layerInfoText.style.marginLeft = '8px';
            layerInfoText.style.flex = '1';
            layerInfoText.style.textAlign = 'left';
        
            layerInfoContainer.appendChild(layerInfoText);
            infoContainer.appendChild(layerInfoContainer);
        });
        
        
    
        // Adiciona a data e a hora ao final das legendas
        const dateInfo = document.createElement('div');
        dateInfo.style.marginTop = '20px';
        dateInfo.style.textAlign = 'center';
        const now = new Date();
        const options = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        dateInfo.textContent = `${now.toLocaleDateString('pt-BR', options)}`;
        infoContainer.appendChild(dateInfo);
    
        legendContainer.appendChild(infoContainer);
    
         // Configuração de estilos de impressão
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            body {
                zoom: 0.75;
            }
            #print-info {
                page-break-inside: avoid;
            }
            #scale-display {
                position: absolute;
                bottom: 50px;
                right: 10px;
                background-color: transparent;
                font-size: 12px;
                padding: 5px;
            }
            #map {
                height: 600px;  /* Limite de altura para caber em uma página */
                page-break-inside: avoid;
            }
        }
    `;
    document.head.appendChild(style);
    
        setTimeout(() => {
            window.print();
    
            // Restaura as configurações e exibe novamente os elementos ocultos
            scaleDisplay.style.cssText = originalScaleDisplayStyle;
            titleContainer.style.display = 'none';
            legendContainer.removeChild(infoContainer);
            elementsToHide.forEach(el => el.style.display = '');
            document.head.removeChild(style);
            mapContainer.style.cssText = originalMapStyle;
        }, 500);
    }
    
  
    getSelectedLayersInfo() {
        const layersInfo = [];
    
        // Itera sobre todas as camadas registradas no GeoJSONController
        Object.keys(this.geoJSONController.layers).forEach(layerName => {
            const layer = this.geoJSONController.layers[layerName];
    
            // Verifica se a camada está visível no mapa
            if (this.map.hasLayer(layer.layerGroup)) {
                const geometryType = layer.geometryType;
    
                // Obtém informações de estilo
                const fillColor = this.geoJSONController.colors[layerName] || '#FFFFFF';
                const strokeColor = this.geoJSONController.strokeColors[layerName] || '#000000';
                const lineStyle = this.geoJSONController.lineStyle[layerName] || 'solid';
    
                // Define dashArray com base no estilo da linha
                let dashArray = '';
                if (lineStyle === 'dashed') {
                    dashArray = '5, 5';
                } else if (lineStyle === 'dotted') {
                    dashArray = '1, 5';
                }
    
                // Adiciona informações completas da camada
                layersInfo.push({
                    layer: layerName,
                    geometryType,
                    styles: {
                        fillColor,
                        strokeColor,
                        lineStyle,
                        dashArray,
                    },
                });
            }
        });
    
        return layersInfo;
    }
    
    

    resetMapView() {
        this.map.setView(this.initialCenter, this.initialZoom);
    }

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
            case 'raster':
                // Carregar a camada raster
                setTimeout(() => {
                    this.staticImageLayer.addTo(this.map);
                }, 0);
                newLayer = this.staticImageLayer;
    
                // Carregar e adicionar a camada GeoJSON
                fetch('../MN_ENTORNO.geojson')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Erro ao carregar o arquivo GeoJSON');
                        }
                        return response.json();
                    })
                    .then(geojsonData => {
                        const geojsonLayer = L.geoJSON(geojsonData, {
                            style: { color: 'blue' }, // Personalize o estilo se necessário
                        }).addTo(this.map);
                        this.geojsonLayer = geojsonLayer; // Armazena a camada GeoJSON para manipulação futura
                    })
                    .catch(error => console.error('Erro ao carregar o GeoJSON:', error));
                break;
            default:
                newLayer = this.osm;
        }
    
        if (this.currentBaseLayer && this.map.hasLayer(this.currentBaseLayer)) {
            this.map.removeLayer(this.currentBaseLayer);
        }
    
        this.currentBaseLayer = newLayer;
    
        if (provider !== 'raster') {
            this.map.addLayer(newLayer);
        }
    
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
    updateScale() {
        const zoomLevel = this.map.getZoom();
        const latitude = this.map.getCenter().lat;
        
        // Constante baseada em uma escala padrão para zoom 0
        const EARTH_CIRCUMFERENCE = 40075017; // Circunferência da Terra em metros
    
        // Converte latitude para radianos uma única vez
        const latitudeInRadians = latitude * Math.PI / 180;
        
        // Calcula a escala e arredonda o resultado
        const scale = Math.round((EARTH_CIRCUMFERENCE * Math.cos(latitudeInRadians)) / (Math.pow(2, zoomLevel) * 256));
        
        // Exibe a escala no elemento apropriado
        const scaleDisplay = document.getElementById('scale-display');
        if (scaleDisplay) {
            scaleDisplay.textContent = `Escala: 1:${scale}`;
        }
    }
    

    setupMouseCoordinates() {
        const formatSelector = document.getElementById('formatSelector');
        
        this.map.on('mousemove', (e) => {
            const latLng = e.latlng;
            let coordinatesText;
    
            // Verifica o formato selecionado
            if (formatSelector.value === 'decimal') {
                // Exibe as coordenadas em formato decimal sem o sinal e com "S" e "O"
                const latitude = `${Math.abs(latLng.lat).toFixed(5)} S`;
                const longitude = `${Math.abs(latLng.lng).toFixed(5)} O`;
                coordinatesText = `${latitude}, ${longitude}`;
            } else if (formatSelector.value === 'norte_leste') {
                // Converte para coordenadas Norte/Leste (UTM SIRGAS 2000)
                const utmCoords = this.convertToUTM_SIRGAS(latLng.lat, latLng.lng);
                coordinatesText = `${utmCoords.northing.toFixed(3)} N, ${utmCoords.easting.toFixed(3)} E`;
            } else {
                // Converte para graus, minutos e segundos (GMS)
                const latGMS = this.convertToGMS(latLng.lat) + ' S';
                const lngGMS = this.convertToGMS(latLng.lng) + ' O';
                coordinatesText = `${latGMS}, ${lngGMS}`;
            }
    
            document.getElementById('coords').textContent = coordinatesText;
        });
    }
    
    // Função para converter decimal para GMS
    convertToGMS(coordinate) {
        const degrees = Math.floor(Math.abs(coordinate));
        const minutesFloat = (Math.abs(coordinate) - degrees) * 60;
        const minutes = Math.floor(minutesFloat);
        const seconds = ((minutesFloat - minutes) * 60).toFixed(3);
    
        return `${degrees}° ${minutes}' ${seconds}"`;
    }
    
    // Função para converter coordenadas para UTM com SIRGAS 2000
    convertToUTM_SIRGAS(lat, lng) {
        // Usa o sistema proj4 para conversão (precisa da biblioteca proj4js)
        const proj4 = window.proj4;
    
        // Define a projeção UTM com SIRGAS 2000
        const utmZone = `+proj=utm +zone=${Math.floor((lng + 180) / 6) + 1} +south +datum=SIRGAS2000 +units=m +no_defs`;
        const utmCoords = proj4('WGS84', utmZone, [lng, lat]);
        return { northing: utmCoords[1], easting: utmCoords[0] };
    }
    
}    