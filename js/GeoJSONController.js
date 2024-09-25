export class GeoJSONController {
    constructor(map, staticImageLayer) {
        this.map = map;
        this.layers = {}; // Armazena as camadas GeoJSON carregadas
        this.colors = {}; // Armazena as cores fixas para cada GeoJSON
        this.staticImageLayer = staticImageLayer; // Camada da imagem estática
        this.legendContent = document.getElementById('legend-content'); // Referência ao conteúdo da legenda
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

    loadGeoJSON(url) {
        // Verifica se a camada já foi carregada
        if (this.layers[url]) {
            // Se já estiver carregada, apenas adiciona ao mapa
            this.layers[url].layer.addTo(this.map);
            this.updateLegend(); // Atualiza a legenda ao exibir a camada novamente
            return; // Sai da função para não carregar novamente
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Gera ou reutiliza a cor para esta camada
                const layerColor = this.colors[url] || this.getRandomColor();
                this.colors[url] = layerColor; // Armazena a cor para garantir que seja reutilizada

                const layer = L.geoJson(data, {
                    style: {
                        color: layerColor, // Usa a cor gerada ou armazenada
                        weight: 2,
                        fillOpacity: 0.5 // Define a opacidade do preenchimento
                    },
                    pointToLayer: (feature, latlng) => {
                        // Define o estilo do marcador
                        return L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: layerColor, // Cor do marcador
                            color: layerColor, // Cor da borda do marcador
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        let popupContent = "<b>Atributos:</b><br>";
                        for (let key in feature.properties) {
                            popupContent += `${key}: ${feature.properties[key]}<br>`;
                        }
                        layer.bindPopup(popupContent);
                    }
                });

                // Adiciona a camada ao mapa e ao objeto de camadas
                this.layers[url] = { layer, color: layerColor, features: data.features }; // Armazena a camada com sua cor única e dados dos recursos
                layer.addTo(this.map); // Adiciona a camada ao mapa

                this.updateLegend(); // Atualiza a legenda após carregar a nova camada
            })
            .catch(error => console.error(`Erro ao carregar GeoJSON ${url}: `, error));
    }

    // Função auxiliar para remover a extensão .geojson
    removeGeoJSONExtension(url) {
        return url.replace(/\.geojson$/, ''); // Remove a extensão .geojson
    }

    // Retorna o tipo de geometria de uma feature (Point, LineString, Polygon, etc.)
    getGeometryType(feature) {
        return feature.geometry.type;
    }

    // Gera o símbolo adequado para a legenda com base no tipo de geometria
    getLegendIcon(geometryType, color) {
        const size = 15; // Tamanho do ícone na legenda
        let icon = '';
        switch (geometryType) {
            case 'Point':
                icon = `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background-color:${color};margin-right:5px;"></span>`;
                break;
            case 'LineString':
                icon = `<span style="display:inline-block;width:${size * 2}px;height:2px;background-color:${color};margin-right:5px;"></span>`;
                break;
            case 'Polygon':
                icon = `<span style="display:inline-block;width:${size}px;height:${size}px;background-color:${color};border:1px solid ${color};margin-right:5px;"></span>`;
                break;
            default:
                icon = `<span style="display:inline-block;width:${size}px;height:${size}px;background-color:${color};margin-right:5px;"></span>`;
                break;
        }
        return icon;
    }

    updateLegend() {
        this.legendContent.innerHTML = ''; // Limpa a legenda existente
    
        // Cria uma entrada na legenda para cada camada carregada
        Object.entries(this.layers).forEach(([url, { color, layer }]) => {
            const legendItem = document.createElement('div');
            const displayName = this.removeGeoJSONExtension(url); // Remove a extensão .geojson do nome da camada
    
            // Verifica o tipo de geometria da camada (ponto, linha, polígono ou quadrado)
            let shapeIcon = '';
            layer.eachLayer(geoLayer => {
                if (geoLayer.feature && geoLayer.feature.geometry) {
                    const geomType = geoLayer.feature.geometry.type;
    
                    // Define o ícone apropriado para o tipo de geometria
                    if (geomType === 'Point' || geomType === 'MultiPoint') {
                        // Ícone para pontos (círculo)
                        shapeIcon = `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background-color:${color};margin-right:5px;"></span>`;
                    } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
                        // Ícone para linhas (linha horizontal)
                        shapeIcon = `<span style="display:inline-block;width:20px;height:2px;background-color:${color};margin-right:5px;"></span>`;
                    } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                        // Verifica se o polígono é um quadrado ou retângulo
                        const coordinates = geoLayer.feature.geometry.coordinates[0]; // Coordenadas dos vértices
                        const isRectangle = this.isRectangle(coordinates);
    
                        if (isRectangle) {
                            // Se for um quadrado ou retângulo, usa um ícone quadrado
                            shapeIcon = `<span style="display:inline-block;width:15px;height:15px;background-color:${color};border: 2px solid ${color};margin-right:5px;"></span>`;
                        } else {
                            // Para outros polígonos (ícone de polígono mais genérico, por exemplo, triângulo)
                            shapeIcon = `<span style="display:inline-block;width:0;height:0;border-left:7.5px solid transparent;border-right:7.5px solid transparent;border-bottom:15px solid ${color};margin-right:5px;"></span>`;
                        }
                    }
                }
            });
    
            // Adiciona o ícone correspondente e o nome da camada à legenda
            legendItem.innerHTML = `${shapeIcon} ${displayName}`;
            this.legendContent.appendChild(legendItem);
        });
    }
    
    // Função auxiliar para verificar se um polígono é um retângulo/quadrado
    isRectangle(coordinates) {
        if (coordinates.length !== 5) return false; // Um retângulo/quadrado tem 4 vértices + 1 para fechar
    
        const [p1, p2, p3, p4] = coordinates;
    
        const isOrthogonal = (a, b, c) => {
            const dotProduct = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
            return dotProduct === 0; // Produto escalar = 0 significa ângulos de 90 graus
        };
    
        // Verifica se todos os ângulos são de 90 graus (ortogonais)
        return isOrthogonal(p1, p2, p3) && isOrthogonal(p2, p3, p4) && isOrthogonal(p3, p4, coordinates[0]);
    }
    

    // Remove todas as camadas do mapa
    removeAllLayers() {
        Object.values(this.layers).forEach(({ layer }) => {
            this.map.removeLayer(layer);
        });
        this.map.removeLayer(this.staticImageLayer); // Remove também a camada de imagem estática
        this.legendContent.innerHTML = ''; // Limpa a legenda
    }

    updateLayers() {
        // Remove todas as camadas antes de atualizar
        Object.values(this.layers).forEach(({ layer }) => {
            this.map.removeLayer(layer); // Remove a camada do mapa
        });
    
        // Limpa as camadas armazenadas, exceto a camada de imagem estática
        this.layers = {};
        this.legendContent.innerHTML = ''; // Limpa a legenda
    
        const staticImageChecked = document.querySelector('#selector input[type="checkbox"][value="static-image"]').checked;
    
        // Adiciona ou remove a camada de imagem estática com base no estado do checkbox
        if (staticImageChecked) {
            this.staticImageLayer.addTo(this.map); // Adiciona a camada de imagem estática
        } else {
            this.map.removeLayer(this.staticImageLayer); // Remove a camada de imagem estática se não estiver selecionada
        }
    
        // Carrega as camadas GeoJSON com base nos checkboxes selecionados
        document.querySelectorAll('#selector input[type="checkbox"]:not([value="static-image"]):checked').forEach(checkbox => {
            const layerValue = checkbox.value;
            this.loadGeoJSON(layerValue); // Carrega a camada GeoJSON
        });
    }

    // Adiciona eventos de mudança nas checkboxes
    setupCheckboxListeners() {
        document.querySelectorAll('#selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateLayers());
        });
    }
}
