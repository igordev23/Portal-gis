export class GeoJSONController {
    constructor(map, staticImageLayer) {
        this.map = map;
        this.layers = {}; // Armazena as camadas GeoJSON carregadas
        this.colors = {}; // Armazena as cores fixas para cada GeoJSON
        this.staticImageLayer = staticImageLayer; // Camada da imagem estática
        this.legendContent = document.getElementById('legend-content'); // Referência ao conteúdo da legenda
        this.selectorContainer = document.getElementById('selector'); // Container do seletor de camadas

        if (!this.selectorContainer) {
            console.error('Container de seleção de camadas não encontrado!');
        }
        if (!this.legendContent) {
            console.error('Elemento de legenda não encontrado!');
        }
    }

    // Gera uma cor hexadecimal aleatória
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Atualiza o mapa com os dados recebidos do DataFetcher e checkboxes dinâmicos
    updateWithFetchedData(dados) {
        // Atualiza os checkboxes com as camadas encontradas no servidor
        this.updateLayerSelection(dados);

        // Carrega os dados GeoJSON mas não adiciona ao mapa ainda
        dados.forEach(tabela => {
            const layerGroup = L.layerGroup(); // Cria um grupo de camadas para cada tabela

            // Armazenar o tipo de geometria para a legenda
            const geometryType = tabela.dados[0]?.geom?.type || 'Desconhecido'; // Defina um tipo padrão se não houver dados

            tabela.dados.forEach(item => {
                if (item.geom) {
                    const layerColor = this.colors[tabela.nome] || this.getRandomColor();
                    this.colors[tabela.nome] = layerColor;

                    // Se for um Point, utilizamos circleMarker para criar um marcador estilizado
                    const geoJsonLayer = L.geoJSON(item.geom, {
                        pointToLayer: (feature, latlng) => {
                            return L.circleMarker(latlng, {
                                radius: 4, // Tamanho do círculo
                                fillColor: layerColor,
                                color: "#000", // Borda do círculo
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        },
                        style: {
                            color: layerColor,
                            weight: 2,
                            fillOpacity: 0.5
                        }
                    });

                    // Extrair e exibir apenas fclass e name no popup
                    const fclass = item.fclass || 'N/A';
                    const name = item.name || 'N/A';
                    geoJsonLayer.bindPopup(`<strong>${tabela.nome}</strong><br>Classe: ${fclass}<br>Nome: ${name}`);

                    layerGroup.addLayer(geoJsonLayer); // Adiciona cada geometria ao grupo de camadas
                }
            });

            // Armazena o grupo de camadas, incluindo o tipo de geometria
            this.layers[tabela.nome] = { layerGroup, geometryType }; // Armazena o grupo de camadas e o tipo de geometria
        });
    }

    // Atualiza os checkboxes no HTML com base nas camadas recebidas
    updateLayerSelection(dados) {
        // Limpa os checkboxes existentes
        this.selectorContainer.innerHTML = `
          <div id="camadas-header">
            <span>Camadas</span>
            
          </div>
          <input type="checkbox" id="static-image" value="static-image">
          <label for="static-image">Raster</label><br>
        `;

        // Adiciona as novas camadas dinâmicas baseadas no servidor
        dados.forEach(tabela => {
            const checkboxId = `layer-${tabela.nome}`;
            const checkboxHtml = `
              <input type="checkbox" id="${checkboxId}" value="${tabela.nome}">
              <label for="${checkboxId}">${tabela.nome}</label><br>
            `;
            this.selectorContainer.insertAdjacentHTML('beforeend', checkboxHtml);
        });

        // Adiciona eventos de mudança nos checkboxes
        this.setupCheckboxListeners();
    }

    // Atualiza a legenda com base nas camadas atuais
    updateLegend() {
        this.legendContent.innerHTML = ''; // Limpa a legenda existente

        // Cria uma entrada na legenda para cada camada carregada
        Object.keys(this.layers).forEach(layerName => {
            const color = this.colors[layerName];
            const geometryType = this.layers[layerName].geometryType; // Acessar o tipo de geometria armazenado

            const legendItem = document.createElement('div');
            let shapeIcon = '';

            // Define o ícone apropriado com base no tipo de geometria
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                // Ícone para pontos (círculo)
                shapeIcon = `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background-color:${color};margin-right:5px;"></span>`;
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                // Ícone para linhas (linha horizontal)
                shapeIcon = `<span style="display:inline-block;width:20px;height:2px;background-color:${color};margin-right:5px;"></span>`;
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                // Ícone para polígonos (usar um quadrado ou retângulo)
                shapeIcon = `<span style="display:inline-block;width:15px;height:15px;background-color:${color};border: 2px solid ${color};margin-right:5px;"></span>`;
            }

            // Adiciona o ícone correspondente e o nome da camada à legenda
            legendItem.innerHTML = `${shapeIcon} ${layerName}`; // Exibe o ícone e o nome da camada
            this.legendContent.appendChild(legendItem);
        });
    }

    // Remove todas as camadas do mapa
    removeAllLayers() {
        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName].layerGroup; // Acessar o grupo de camadas
            if (layer) {
                this.map.removeLayer(layer);
            }
        });
        this.map.removeLayer(this.staticImageLayer); // Remove também a camada de imagem estática
        this.legendContent.innerHTML = ''; // Limpa a legenda
        this.layers = {}; // Limpa as camadas armazenadas
    }

    // Atualiza as camadas no mapa com base nos checkboxes
    updateLayers() {
        const staticImageCheckbox = document.querySelector('#selector input[type="checkbox"][value="static-image"]');
        
        if (!staticImageCheckbox) {
            console.error('Checkbox de imagem estática não encontrado!');
            return;
        }

        const staticImageChecked = staticImageCheckbox.checked;

        // Gerencia a camada de imagem estática
        if (staticImageChecked) {
            if (!this.map.hasLayer(this.staticImageLayer)) {
                this.staticImageLayer.addTo(this.map); // Adiciona se não estiver no mapa
            }
        } else {
            if (this.map.hasLayer(this.staticImageLayer)) {
                this.map.removeLayer(this.staticImageLayer); // Remove se estiver no mapa
            }
        }

        // Remove todas as camadas GeoJSON antes de atualizar
        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName].layerGroup; // Acessar o grupo de camadas
            if (layer && this.map.hasLayer(layer)) {
                this.map.removeLayer(layer); // Remove a camada do mapa
            }
        });

        // Carrega as camadas GeoJSON com base nos checkboxes selecionados
        document.querySelectorAll('#selector input[type="checkbox"]:not([value="static-image"]):checked').forEach(checkbox => {
            const layerValue = checkbox.value;
            this.loadGeoJSON(layerValue); // Carrega a camada GeoJSON no mapa
        });

        this.updateLegend();
    }

    // Adiciona uma camada GeoJSON ao mapa (somente se o checkbox estiver marcado)
    loadGeoJSON(layerName) {
        const layer = this.layers[layerName].layerGroup; // Acessar o grupo de camadas
        if (layer && !this.map.hasLayer(layer)) {
            layer.addTo(this.map); // Adiciona ao mapa se o checkbox estiver marcado
        }
        this.updateLegend(); // Atualiza a legenda
    }

    // Adiciona eventos de mudança nos checkboxes
    setupCheckboxListeners() {
        document.querySelectorAll('#selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateLayers());
        });
    }
}
