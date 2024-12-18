import { MeasurementController } from './MeasurementController.js';
import { GeoJSONController } from './GeoJSONController.js';
import { DataFetcher } from './DataFetcher.js';
import { SwipeController } from './SwipeController.js';
import ElevationService from './ElevationService.js';

export class MapController {
    constructor(mapElementId) {
        this.initialCenter = [-4.458, -47.52531];
        this.initialZoom = 15;
        this.pontos = [];
        this.polyline = null;
        this.elevationService = new ElevationService();
        this.chartInstance = null;
    
        // Inicializando as camadas base
        this.osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            name: "osm",
        });
    
        this.satellite = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenTopoMap contributors",
            name: "satellite",
        });
    
        this.cartoDB_Positron = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
            name: "cartoDB_Positron",
        });
    
        this.stamenWatercolor = L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg", {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.',
            name: "cartoDB_Positron",
        });
    
        this.esriWorldImagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "© Esri, USGS, NOAA",
            name: "esriWorldImagery",
        });
    
        this.cartoDB_DarkMatter = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
            name: "cartoDB_DarkMatter",
        });
    
        // Inicializando o mapa
        this.map = L.map(mapElementId, {
            center: this.initialCenter,
            zoom: this.initialZoom,
            minZoom: 10,
            maxZoom: 20,
            layers: [this.esriWorldImagery, this.osm],
        });
    
        this.currentBaseLayer = this.osm;
    
        // Configurações adicionais
        document.getElementById('scale-input').addEventListener('change', (event) => {
            const userScale = parseInt(event.target.value, 10);
            if (!isNaN(userScale)) {
                this.adjustZoomByScale(userScale);
            }
        });
    
        document.getElementById("terrain-elevation-btn").addEventListener("click", () => this.marcarPontos());
    
        // Adicionando os controladores
        this.measurementController = new MeasurementController(this.map);
    
        // Inicialização das imagens raster como um grupo de camadas
    this.rasterLayers = [];
    const mosaicBounds = [
        [-4.474798665, -47.552014662],
        [-4.433812159, -47.506472635],
    ];
    const mosaicImages = [
        "../output/mosaico-part7.jpg", "../output/mosaico-part8.jpg", "../output/mosaico-part9.jpg",
        "../output/mosaico-part4.jpg", "../output/mosaico-part5.jpg", "../output/mosaico-part6.jpg",
        "../output/mosaico-part1.jpg", "../output/mosaico-part2.jpg", "../output/mosaico-part3.jpg",
    ];
    const rows = 3, cols = 3;
    const latStep = (mosaicBounds[0][0] - mosaicBounds[1][0]) / rows;
    const lngStep = (mosaicBounds[1][1] - mosaicBounds[0][1]) / cols;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const imageIndex = row * cols + col;
            const imageBounds = [
                [
                    mosaicBounds[0][0] - row * latStep,
                    mosaicBounds[0][1] + col * lngStep,
                ],
                [
                    mosaicBounds[0][0] - (row + 1) * latStep,
                    mosaicBounds[0][1] + (col + 1) * lngStep,
                ],
            ];

            const rasterLayer = L.imageOverlay(mosaicImages[imageIndex], imageBounds, {
                opacity: 0.8,
                attribution: "© Raster Image",
            });
            this.rasterLayers.push(rasterLayer);
        }
    }
    
        this.geoJSONController = new GeoJSONController(this.map);
        this.geoJSONController.setupCheckboxListeners();
        this.geoJSONController.updateLayers();
    
        this.features = [];
    
        this.setupMouseCoordinates();
        this.dataFetcher = new DataFetcher(this.map, this.geoJSONController);
        this.dataFetcher.buscarDados();
    
        // Configuração do SwipeController
        this.swipeController = new SwipeController(
            this.map,
            "divider-line",
            "swipe-tool-btn",
            this.osm,
            this.satellite
        );
    
        L.Control.swipeMode(this.osm, this.cartoDB_DarkMatter).addTo(this.map);
    
        // Configurações adicionais de eventos
        this.setupPrintEvent();
        this.setupSearchEvent();
    
        this.map.on("zoomend", () => this.updateScale());
        this.updateScale();
    }
    
    

    abrirModal(dataElevacao) {
        const modal = document.getElementById("elevation-modal");
        modal.style.display = "block";
    
        const canvas = document.getElementById("elevation-chart");
        const ctx = canvas.getContext("2d");
    
        // Destrói o gráfico existente, se houver
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    
        // Cria um gráfico com as elevações reais
        this.chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: dataElevacao.distancias,
                datasets: [
                    {
                        label: "Elevação (m)",
                        data: dataElevacao.elevacoes,
                        borderColor: "rgba(75, 192, 192, 1)",
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0, // Remove as bolinhas
                        tension: 0.3, // Suaviza a linha
                    },
                ],
            },
            options: {
                scales: {
                    x: {
                        title: { display: true, text: "Distância (m)" },
                    },
                    y: {
                        title: { display: true, text: "Elevação (m)" },
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Elevação: ${context.raw} m`,
                        },
                    },
                },
            },
        });
    
        // Atualiza a distância total de acordo com a unidade selecionada
        const unidadeSelect = document.getElementById("unidade-distancia");
        unidadeSelect.addEventListener("change", () => {
            const unidade = unidadeSelect.value;
            const distancia =
                unidade === "km"
                    ? `${dataElevacao.distanciaTotalKm} km`
                    : `${dataElevacao.distanciaTotalMetros} metros`;
    
            document.getElementById("distancia-final").textContent = `Distância total: ${distancia}`;
        });
    
        // Dispara a primeira atualização para o valor inicial
        unidadeSelect.dispatchEvent(new Event("change"));
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
        const marker = L.marker([lat, lng], { 
            icon: L.icon({
                iconUrl: 'https://www.svgrepo.com/show/202759/line-graphic-line-chart.svg', // Exemplo de ícone customizado
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            })
        }).addTo(this.map);
    
        // Salva o marcador para remoção futura, se necessário
        this.marcadores = this.marcadores || [];
        this.marcadores.push(marker);
    
        this.pontos.push([lat, lng]);
    
        if (this.pontos.length === 1) {
            // Atualiza o alerta para informar que o ponto foi adicionado
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
            const dataElevacao = await this.elevationService.calcularElevacao(pontoInicial, pontoFinal, 50); // 50 pontos para maior precisão
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
        const elementsToHide = document.querySelectorAll('.leaflet-control-zoom, .header, #control-buttons, #sidebar, .interface-elements, .map-button, .esconde, .leaflet-control-attribution, .leaflet-control-sm-button');
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
        titleText.innerHTML = 'Prefeitura do Município de Itinga<br>Sistema de Geoprocessamento';
        titleText.style.margin = '0 100px';
        titleText.style.width = '500px';
    
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



    loadRasterLayersLazy() {
        const mapBounds = this.map.getBounds();
    
        // Inicializa o cache para rastrear o status das camadas
        this.activeRasterLayers = this.activeRasterLayers || new Set();
    
        // Função para atualizar as camadas raster com otimização
        const updateRasterLayers = () => {
            const updatedBounds = this.map.getBounds();
    
            this.rasterLayers.forEach((layer) => {
                const layerBounds = layer.getBounds();
    
                if (updatedBounds.intersects(layerBounds)) {
                    // Adiciona a camada se estiver nos limites e ainda não estiver ativa
                    if (!this.map.hasLayer(layer)) {
                        layer.addTo(this.map);
                        this.activeRasterLayers.add(layer);
                    }
                } else {
                    // Remove a camada se estiver fora dos limites visíveis
                    if (this.map.hasLayer(layer)) {
                        this.map.removeLayer(layer);
                        this.activeRasterLayers.delete(layer);
                    }
                }
            });
        };
    
        // Carrega camadas raster iniciais com atraso escalonado
        this.rasterLayers.forEach((layer, index) => {
            const layerBounds = layer.getBounds();
            if (mapBounds.intersects(layerBounds) && !this.activeRasterLayers.has(layer)) {
                setTimeout(() => {
                    if (!this.map.hasLayer(layer)) {
                        layer.addTo(this.map);
                        this.activeRasterLayers.add(layer);
                    }
                }, Math.min(index * 200, 1000)); // Reduz ainda mais o atraso escalonado para tempo de resposta mais rápido
            }
        });
    
        // Configura o evento `moveend` e `zoomend` com debounce para evitar processamento excessivo
        if (!this._rasterEventListenerActive) {
            this._rasterEventListenerActive = true;
    
            const debounce = (fn, delay) => {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn(...args), delay);
                };
            };
    
            // Detecta dispositivos móveis para ajustar a responsividade
            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
            const debounceDelay = isMobile ? 100 : 50; // Reduz o atraso para eventos de zoom
    
            this.map.on('moveend', debounce(updateRasterLayers, debounceDelay));
            this.map.on('zoomend', debounce(updateRasterLayers, debounceDelay)); // Adiciona suporte a eventos de zoom
        }
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
            this.loadRasterLayersLazy();
            return; // Termina aqui para raster
        default:
            newLayer = this.osm;
    }

    // Remove a camada base atual
    if (this.currentBaseLayer && this.map.hasLayer(this.currentBaseLayer)) {
        this.map.removeLayer(this.currentBaseLayer);
    }

    // Remove camadas raster, caso estejam visíveis
    this.rasterLayers.forEach((layer) => {
        if (this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
        }
    });

    // Remove o evento `moveend` ao sair das camadas raster
    if (provider !== 'raster') {
        this.map.off('moveend');
    }

    this.currentBaseLayer = newLayer;

    if (provider !== 'raster') {
        this.map.addLayer(newLayer);
    }

    // Atualiza o controlador de swipe se necessário
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
        // Obtém o nível de zoom e o centro atual do mapa
        const zoomLevel = this.map.getZoom();
        const latitude = this.map.getCenter().lat;
    
        // Constantes para Web Mercator
        const EARTH_RADIUS = 6378137; // Raio da Terra em metros (SIRGAS 2000 usa GRS80)
        const TILE_SIZE = 256; // Tamanho dos tiles padrão no Leaflet
    
        // Resolução no Equador (tamanho de um pixel em metros no nível de zoom atual)
        const resolutionAtEquator = (2 * Math.PI * EARTH_RADIUS) / (TILE_SIZE * Math.pow(2, zoomLevel));
        
        // Ajusta a resolução com base na latitude (corrigindo a distorção da projeção)
        const resolutionAtLatitude = resolutionAtEquator * Math.cos(latitude * Math.PI / 180);
    
        // Calcula a escala assumindo 96 DPI
        const dpi = 96; // Densidade de pixels por polegada
        const metersPerInch = 0.0254; // Conversão de polegadas para metros
        let scale = Math.round(resolutionAtLatitude / (metersPerInch / dpi));
    
       // Escalas predefinidas (adicionando 1:500,000)
const predefinedScales = [
    500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000
];

    
        // Aproxima o valor calculado para a escala mais próxima
        scale = predefinedScales.reduce((prev, curr) => 
            Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
        );
    
        // Atualiza a exibição da escala no input
        const scaleInput = document.getElementById('scale-input');
        if (scaleInput) {
            scaleInput.value = scale;
        }
    }
    
    // Função para ajustar o zoom com base na escala inserida
    adjustZoomByScale(userScale) {
        // Escalas predefinidas (adicionando 1:500,000)
         const predefinedScales = [
    500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000
];

    
        // Aproxima o valor inserido para a escala mais próxima
        const closestScale = predefinedScales.reduce((prev, curr) => 
            Math.abs(curr - userScale) < Math.abs(prev - userScale) ? curr : prev
        );
    
        // Calcula o zoom correspondente
        const dpi = 96;
        const metersPerInch = 0.0254;
        const resolutionAtScale = closestScale * (metersPerInch / dpi);
        const zoomLevel = Math.log2((2 * Math.PI * 6378137) / (256 * resolutionAtScale));
    
        // Ajusta o zoom no mapa
        this.map.setZoom(Math.round(zoomLevel));
    
        // Atualiza o input da escala para refletir a escala mais próxima
        const scaleInput = document.getElementById('scale-input');
        if (scaleInput) {
            scaleInput.value = closestScale;
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