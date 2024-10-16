export class GeoJSONController {
    constructor(map, staticImageLayer) {
        this.map = map;
        this.layers = {};
        this.colors = {};
        this.staticImageLayer = staticImageLayer;
        this.legendContent = document.getElementById('legend-content');
        this.selectorContainer = document.getElementById('selector');
        this.attributesContainer = document.getElementById('attributes-container'); // Container para exibir as tabelas de atributos

        if (!this.selectorContainer) {
            console.error('Container de seleção de camadas não encontrado!');
        }
        if (!this.legendContent) {
            console.error('Elemento de legenda não encontrado!');
        }
        if (!this.attributesContainer) {
            console.error('Container de atributos não encontrado!');
        }
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    updateWithFetchedData(dados) {
        this.updateLayerSelection(dados); // Atualiza os checkboxes

        dados.forEach(tabela => {
            const layerGroup = L.layerGroup();
            const geometryType = tabela.dados[0]?.geom?.type || 'Desconhecido';

            tabela.dados.forEach(item => {
                if (item.geom) {
                    const layerColor = this.colors[tabela.nome] || this.getRandomColor();
                    this.colors[tabela.nome] = layerColor;

                    const geoJsonLayer = L.geoJSON(item.geom, {
                        pointToLayer: (feature, latlng) => {
                            return L.circleMarker(latlng, {
                                radius: 4,
                                fillColor: layerColor,
                                color: "#000",
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

                    const fclass = item.fclass || 'N/A';
                    const name = item.name || 'N/A';
                    geoJsonLayer.bindPopup(`<strong>${tabela.nome}</strong><br>Classe: ${fclass}<br>Nome: ${name}`);

                    layerGroup.addLayer(geoJsonLayer);
                }
            });

            this.layers[tabela.nome] = { layerGroup, geometryType };
        });
    }
    updateLayerSelection(dados) {
        this.selectorContainer.innerHTML = `
            <div id="camadas-header">
                <span>Camadas</span>
            </div>
            <input type="checkbox" id="static-image" value="static-image">
            <label for="static-image">Raster</label><br>
        `;
    
        dados.forEach(tabela => {
            const checkboxId = `layer-${tabela.nome}`;
            const checkboxHtml = `
                <div class="checkbox-item">
                    <input type="checkbox" id="${checkboxId}" value="${tabela.nome}">
                    <label for="${checkboxId}">${tabela.nome}</label>
                    <button class="details-btn" id="details-${checkboxId}">...</button>
                </div>
            `;
            this.selectorContainer.insertAdjacentHTML('beforeend', checkboxHtml);
        });
    
        this.setupCheckboxListeners();
        this.setupDetailsListeners(dados); // Configura os listeners
    
        // Adicionando o listener para os botões de detalhes
        dados.forEach(tabela => {
            const checkboxId = `layer-${tabela.nome}`;
            const detailsButton = document.getElementById(`details-${checkboxId}`);
            detailsButton.addEventListener('click', () => {
                const attributesContainer = document.getElementById('attributes-container');
                attributesContainer.style.display = 'block'; // Mostra a tabela de atributos
                // Aqui você pode adicionar código para preencher a tabela de atributos conforme necessário
               
            });
        });
    }
    
    // Função para gerar e exibir a tabela de atributos no container
    generateAttributesTable(dados) {
        let tableHtml = `
          <button class="close-btn">&times;</button>
          <table>
            <thead>
              <tr><th>ID</th><th>Classe</th><th>Nome</th></tr>
            </thead>
            <tbody>
        `;

        dados.forEach(linha => {
            tableHtml += `
              <tr>
                <td>${linha.id || ''}</td>
                <td>${linha.fclass || ''}</td>
                <td>${linha.name || ''}</td>
              </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // Configura os eventos de clique para os botões de detalhes
    setupDetailsListeners(dados) {
        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const checkboxId = event.target.id.replace('details-', '');
                const tabelaSelecionada = dados.find(tabela => `layer-${tabela.nome}` === checkboxId);
                
                if (tabelaSelecionada) {
                    const attributesTable = this.generateAttributesTable(tabelaSelecionada.dados);

                    // Limpa o container de atributos antes de exibir a nova tabela
                    this.attributesContainer.innerHTML = attributesTable;

                  // Configura o botão de fechar (X) para ocultar a tabela
                    document.querySelector('.close-btn').addEventListener('click', () => {
                        this.attributesContainer.style.display = 'none'; // Oculta o contêiner
                        this.attributesContainer.innerHTML = ''; // Limpa o conteúdo
});

                }
            });
        });
    }

    updateLegend() {
        this.legendContent.innerHTML = '';

        Object.keys(this.layers).forEach(layerName => {
            const color = this.colors[layerName];
            const geometryType = this.layers[layerName].geometryType;

            const legendItem = document.createElement('div');
            let shapeIcon = '';

            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                shapeIcon = `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background-color:${color};margin-right:5px;"></span>`;
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                shapeIcon = `<span style="display:inline-block;width:20px;height:2px;background-color:${color};margin-right:5px;"></span>`;
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                shapeIcon = `<span style="display:inline-block;width:15px;height:15px;background-color:${color};border: 2px solid ${color};margin-right:5px;"></span>`;
            }

            legendItem.innerHTML = `${shapeIcon} ${layerName}`;
            this.legendContent.appendChild(legendItem);
        });
    }

    removeAllLayers() {
        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName].layerGroup;
            if (layer) {
                this.map.removeLayer(layer);
            }
        });
        this.map.removeLayer(this.staticImageLayer);
        this.legendContent.innerHTML = '';
        this.layers = {};
    }

    updateLayers() {
        const staticImageCheckbox = document.querySelector('#selector input[type="checkbox"][value="static-image"]');

        if (!staticImageCheckbox) {
            console.error('Checkbox de imagem estática não encontrado!');
            return;
        }

        const staticImageChecked = staticImageCheckbox.checked;

        if (staticImageChecked) {
            if (!this.map.hasLayer(this.staticImageLayer)) {
                this.staticImageLayer.addTo(this.map);
            }
        } else {
            if (this.map.hasLayer(this.staticImageLayer)) {
                this.map.removeLayer(this.staticImageLayer);
            }
        }

        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName].layerGroup;
            if (layer && this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });

        document.querySelectorAll('#selector input[type="checkbox"]:not([value="static-image"]):checked').forEach(checkbox => {
            const layerValue = checkbox.value;
            this.loadGeoJSON(layerValue);
        });

        this.updateLegend();
    }

    loadGeoJSON(layerName) {
        const layer = this.layers[layerName].layerGroup;
        if (layer && !this.map.hasLayer(layer)) {
            layer.addTo(this.map);
        }
        this.updateLegend();
    }

    setupCheckboxListeners() {
        document.querySelectorAll('#selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateLayers());
        });
    }
}
