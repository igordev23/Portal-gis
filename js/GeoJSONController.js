export class GeoJSONController {
    constructor(map, staticImageLayer) {
        this.map = map;
        this.layers = {};
        this.colors = {};
        this.strokeColors = {};
        this.lineStyle = {};
        this.strokeWidth =  {};
        this.fillOpacity = {};
        this.highlightColor = '#FF0000'; // Cor para destaque
        this.staticImageLayer = staticImageLayer;
        this.legendContent = document.getElementById('legend-content');
        this.selectorContainer = document.getElementById('selector');
        this.attributesContainer = document.getElementById('attributes-container');
        this.currentHighlightedLayer = null;

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
                    // Define os atributos de estilo, usando valores padrão se não forem fornecidos
                    const fillColor = item.fill_color || this.colors[tabela.nome] || this.getRandomColor();
                    const strokeColor = item.stroke_color || this.strokeColors[tabela.nome]  || '#000000'; // Cor padrão para a borda
                    const strokeWidth = item.stroke_width ||this.strokeWidth[tabela.nome] ||3; // Largura padrão da linha
                    const lineStyle = item.line_style || this.lineStyle[tabela.nome] || 'solid'; // Estilo padrão da linha
                    const fillOpacity = item.fill_opacity || this.fillOpacity[tabela.nome]|| 1; // Opacidade padrão para preenchimento
                    
                    this.colors[tabela.nome] = fillColor; // Armazena a cor de preenchimento
                    this.strokeColors[tabela.nome] = strokeColor;
                    this.lineStyle[tabela.nome] = lineStyle;
                    this.strokeWidth[tabela.nome] = strokeWidth;
                    this.fillOpacity[tabela.nome] = fillOpacity;

                    const geoJsonLayer = L.geoJSON(item.geom, {
                        pointToLayer: (feature, latlng) => {
                            return L.circleMarker(latlng, {
                                radius: 4,
                                fillColor: fillColor,
                                color: strokeColor,
                                weight: strokeWidth,
                                fillOpacity: fillOpacity // Usando fillOpacity aqui
                            });
                        },
                        style: (feature) => {
                            let dashArray = '';
                            if (lineStyle === 'dashed') {
                                dashArray = '5, 5';
                            } else if (lineStyle === 'dotted') {
                                dashArray = '1, 5';
                            }
    
                            return {
                                color: strokeColor,
                                weight: strokeWidth,
                                fillColor: fillColor,
                                fillOpacity: fillOpacity, // Usando fillOpacity aqui
                                dashArray: dashArray
                            };
                        }
                    });
    
                    geoJsonLayer.bindPopup(() => {
                        // Lista de atributos que devem ser ignorados
                        const ignoredAttributes = [
                            'geom', 'stroke_color', 'fill_color', 'stroke_width', 
                            'line_style', 'fill_opacity', 'geoJsonLayer'
                        ];
                    
                        // Identifique os atributos válidos
                        const validAttributes = Object.keys(item)
                            .filter(attr => 
                                !ignoredAttributes.includes(attr) && 
                                item[attr] !== null && item[attr] !== undefined && 
                                item[attr].toString().trim() !== '' && 
                                item[attr] !== 0
                            );
                    
                        // Caso não haja atributos válidos, retorne uma mensagem padrão
                        if (validAttributes.length === 0) {
                            return `<strong>${tabela.nome}</strong><br><em>Nenhum atributo disponível.</em>`;
                        }
                    
                        // Formate os atributos válidos
                        const attributes = validAttributes
                            .map(attr => `<strong>${attr}:</strong> ${item[attr]}`)
                            .join('<br>');
                    
                        return `<strong>${tabela.nome}</strong><br>${attributes}`;
                    });
                    
                    
                    // Associar o item ao geoJsonLayer para referência futura
                    item.geoJsonLayer = geoJsonLayer;
    
                    layerGroup.addLayer(geoJsonLayer);
                }
            });
    
            this.layers[tabela.nome] = { layerGroup, geometryType, dados: tabela.dados };
        });
    }
    
    

    updateLayerSelection(dados) {
        

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
    
        dados.forEach(tabela => {
            const checkboxId = `layer-${tabela.nome}`;
            const detailsButton = document.getElementById(`details-${checkboxId}`);
            detailsButton.addEventListener('click', () => {
                const attributesContainer = document.getElementById('attributes-container');
                attributesContainer.style.display = 'block'; // Mostra a tabela de atributos
            });
        });
    }
   
    generateAttributesTable(dados) {
        if (dados.length === 0) return '<p>Nenhum dado disponível.</p>';
    
        // Lista de atributos que devem ser ignorados
        const ignoredAttributes = [
            'geom', 'stroke_color', 'fill_color', 'stroke_width', 
            'line_style', 'fill_opacity', 'geoJsonLayer'
        ];
    
        // Identifique os atributos válidos: não ignorados e com valores significativos
        const allAttributes = Object.keys(dados[0]);
        const validAttributes = allAttributes.filter(attr => 
            !ignoredAttributes.includes(attr) && 
            dados.some(linha => {
                const value = linha[attr];
                return value !== null && value !== undefined && value.toString().trim() !== '' && value !== 0;
            })
        );
    
        // Caso não haja atributos válidos
        if (validAttributes.length === 0) return '<p>Nenhum atributo disponível.</p>';
    
        // Crie o cabeçalho da tabela dinamicamente com atributos válidos
        let tableHtml = `
            <div class="attributes-container">
                <button class="close-btn">&times;</button>
                <div class="table-wrapper">
                    <table class="attributes-table">
                        <thead>
                            <tr>${validAttributes.map(attr => `<th>${attr}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
        `;
    
        // Popule todas as linhas da tabela, apenas com atributos válidos
        dados.forEach(linha => {
            tableHtml += `
                <tr class="attribute-row" data-id="${linha.id}">
                    ${validAttributes.map(attr => {
                        const value = linha[attr];
                        return value !== null && value !== undefined && value.toString().trim() !== '' && value !== 0
                            ? `<td>${value}</td>`
                            : '<td></td>'; // Preencha células vazias para manter a estrutura
                    }).join('')}
                </tr>
            `;
        });
    
        tableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    
        return tableHtml;
    }
    
    

    setupDetailsListeners(dados) {
        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const checkboxId = event.target.id.replace('details-', '');
                const tabelaSelecionada = dados.find(tabela => `layer-${tabela.nome}` === checkboxId);
    
                if (tabelaSelecionada) {
                    // Gere e insira a tabela de atributos com todos os dados
                    const attributesTable = this.generateAttributesTable(tabelaSelecionada.dados);
                    this.attributesContainer.innerHTML = attributesTable;
    
                    // Configura o botão de fechar
                    document.querySelector('.close-btn').addEventListener('click', () => {
                        this.attributesContainer.style.display = 'none';
                        this.attributesContainer.innerHTML = '';
                    });
    
                    // Configura os cliques nas linhas da tabela
                    this.setupRowClickListener(tabelaSelecionada.dados);
                }
            });
        });
    }
    setupRowClickListener(dados) {
        let highlightTimeout;
    
        document.querySelectorAll('.attribute-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const id = event.currentTarget.getAttribute('data-id');
                const selectedFeature = dados.find(item => item.id == id);
    
                if (selectedFeature) {
                    // Cancelar timeout anterior, se existir
                    if (highlightTimeout) {
                        clearTimeout(highlightTimeout);
                    }
    
                    // Remover o destaque anterior, se existir
                    if (this.currentHighlightedLayer) {
                        this.map.removeLayer(this.currentHighlightedLayer);
                        this.currentHighlightedLayer = null;
                    }
    
                    // Criar uma nova camada para o destaque
                    const highlightLayer = L.geoJSON(selectedFeature.geoJsonLayer.toGeoJSON(), {
                        style: {
                            fillColor: 'yellow', // Cor de preenchimento para destaque
                            color: 'red',        // Cor da borda para destaque
                            fillOpacity: 0.7,    // Opacidade maior para destacar
                            weight: 5            // Largura da borda maior para destaque
                        }
                    }).addTo(this.map);
    
                    // Salvar a camada de destaque como atual
                    this.currentHighlightedLayer = highlightLayer;
    
                    // Ajustar o mapa para a feição selecionada
                    const bounds = highlightLayer.getBounds();
                    this.map.fitBounds(bounds);
    
                    // Configurar a remoção do destaque após 5 segundos
                    highlightTimeout = setTimeout(() => {
                        if (this.currentHighlightedLayer) {
                            this.map.removeLayer(this.currentHighlightedLayer);
                            this.currentHighlightedLayer = null; // Limpa a referência
                        }
                    }, 5000);
                }
            });
        });
    }
    
    
    // Método auxiliar para restaurar o estilo original
    restoreOriginalStyle(layer) {
        const originalStyle = layer.options.originalStyle;
        if (originalStyle) {
            layer.setStyle({
                fillColor: originalStyle.fillColor, // Restaurar cor de preenchimento original
                color: originalStyle.color,         // Restaurar cor da borda original
                fillOpacity: originalStyle.fillOpacity, // Restaurar opacidade original
                weight: originalStyle.weight       // Restaurar largura da borda original
            });
        }
    }
    
    
    // Método auxiliar para restaurar o estilo original
    restoreOriginalStyle(layer) {
        const originalOptions = layer.options;
        layer.setStyle({
            fillColor: originalOptions.originalFillColor, // Cor de preenchimento original
            color: originalOptions.originalColor,         // Cor da borda original
            fillOpacity: originalOptions.originalFillOpacity, // Opacidade original
            weight: originalOptions.originalStrokeWidth  // Largura da borda original
        });
    }
    
    
    
    
    

    updateLegend() {
        this.legendContent.innerHTML = '';
    
        Object.keys(this.layers).forEach(layerName => {
            const { geometryType } = this.layers[layerName];
    
            // Obtém informações de estilo
            let fillColor = this.colors[layerName] || '#FFFFFF'; // Cor de preenchimento
            let strokeColor = this.strokeColors[layerName] || '#000000'; // Cor da borda
            let lineStyle = this.lineStyle[layerName] || 'solid'; // Estilo da linha
            let dashArray = '';
    
            // Define dashArray com base no estilo da linha
            if (lineStyle === 'dashed') {
                dashArray = '5, 5';
            } else if (lineStyle === 'dotted') {
                dashArray = '1, 5';
            }
    
            // Criação do item da legenda
            const legendItem = document.createElement('div');
            let shapeIcon = '';
    
            // Define o ícone para cada tipo de geometria
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                shapeIcon = `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background-color:${fillColor};margin-right:5px;"></span>`;
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                shapeIcon = `
                    <span style="
                        display:inline-block;
                        width:20px;
                        height:2px;
                        background-color:${strokeColor};
                        ${dashArray ? `border-top: 2px dashed ${strokeColor};` : ''}
                        margin-right:5px;">
                    </span>`;
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                shapeIcon = `
                    <span style="
                        display:inline-block;
                        width:15px;
                        height:15px;
                        background-color:${fillColor};
                        border: 2px ${lineStyle === 'solid' ? 'solid' : 'dashed'} ${strokeColor};
                        ${lineStyle === 'dotted' ? 'border-style: dotted;' : ''}
                        margin-right:5px;">
                    </span>`;
            }
    
            // Adiciona o nome da camada à legenda
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
        // Certifica-se de que a camada raster não seja gerenciada aqui
        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName].layerGroup;
            if (layer && this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
    
        // Adiciona camadas GeoJSON selecionadas
        document.querySelectorAll('#selector input[type="checkbox"]:not([value="static-image"]):checked').forEach(checkbox => {
            const layerValue = checkbox.value;
            const layer = this.layers[layerValue]?.layerGroup;
            if (layer) {
                layer.addTo(this.map);
            }
        });
    
        this.updateLegend();
    }
    

    setupCheckboxListeners() {
        const allCheckboxes = document.querySelectorAll('#selector input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateLayers();
            });
        });
    }
}
