export class GeoJSONController {
    constructor(map) {
        this.map = map;
        this.layers = {}; // Armazena as camadas GeoJSON carregadas
    }

    // Carrega um GeoJSON a partir de uma URL e adiciona ao mapa
    loadGeoJSON(url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const layer = L.geoJson(data, {
                    onEachFeature: (feature, layer) => {
                        let popupContent = "<b>Atributos:</b><br>";
                        for (let key in feature.properties) {
                            popupContent += `${key}: ${feature.properties[key]}<br>`;
                        }
                        layer.bindPopup(popupContent);
                    }
                });

                // Adiciona a camada ao mapa e ao objeto de camadas
                this.layers[url] = layer;
                layer.addTo(this.map);
            })
            .catch(error => console.error(`Erro ao carregar GeoJSON ${url}: `, error));
    }

    // Remove todas as camadas do mapa
    removeAllLayers() {
        Object.values(this.layers).forEach(layer => {
            this.map.removeLayer(layer);
        });
    }

    // Atualiza as camadas exibidas com base nos checkboxes selecionados
    updateLayers() {
        this.removeAllLayers();

        document.querySelectorAll('#selector input[type="checkbox"]:checked').forEach(checkbox => {
            this.loadGeoJSON(checkbox.value);
        });
    }

    // Adiciona eventos de mudança nas checkboxes
    setupCheckboxListeners() {
        document.querySelectorAll('#selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateLayers());
        });
    }
}
