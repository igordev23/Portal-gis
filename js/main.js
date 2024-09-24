//main.js


// Importa o MapController do arquivo mapController.js
import { MapController } from './mapController.js';

// Inicializa o controlador de mapas
const mapController = new MapController('map');

// Exibe o menu de provedores de mapas quando o botão "Base Map" é clicado
document.getElementById('base-map-btn').addEventListener('click', function () {
  const menu = document.getElementById("map-provider-menu");
  menu.style.display = menu.style.display === "none" ? "block" : "none";
});

// Adicionar evento de clique ao botão
document.getElementById('measure-btn').addEventListener('click', function() {
  const toolbar = document.querySelector('.leaflet-draw'); // Selecionar a toolbar do Leaflet Draw

  // Verificar se a toolbar está visível ou oculta
  if (toolbar.style.display === 'none' || !toolbar.style.display) {
      toolbar.style.display = 'block'; // Mostrar a toolbar
  } else {
      toolbar.style.display = 'none';  // Ocultar a toolbar
  }
});
// Seleciona o botão e a div de seleção
const operationalLayersBtn = document.getElementById('operational-layers-btn');
const selectorDiv = document.getElementById('selector');

// Inicializa a div como oculta
selectorDiv.classList.remove('show');

// Adiciona um evento de clique ao botão
operationalLayersBtn.addEventListener('click', () => {
    // Alterna a visibilidade da div
    if (selectorDiv.classList.contains('show')) {
        selectorDiv.classList.remove('show'); // Remove a classe para esconder
    } else {
        selectorDiv.classList.add('show'); // Adiciona a classe para mostrar
    }
});

// script.js ou onde você controla a lógica do botão de busca

// script.js ou onde você controla a lógica do botão de busca

const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

// Adiciona um evento de clique ao botão de busca
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim(); // Captura o valor do campo de busca
    
    // Verifica se está capturando o valor corretamente
    console.log('Valor da busca:', query);  // Adiciona esta linha para verificar o valor no console

    if (query) {
        mapController.searchInMap(query); // Chama a função de busca no mapa
    }
});






// Adiciona as novas opções ao menu de provedores antes de aplicar os eventos
document.getElementById('map-provider-menu').innerHTML += `
  <div class="provider-option" data-provider="osm">OSM</div>
  <div class="provider-option" data-provider="satellite">Satellite</div>
  <div class="provider-option" data-provider="cartodb">CartoDB Positron</div>
  <div class="provider-option" data-provider="stamen-watercolor">Stamen Watercolor</div>
  <div class="provider-option" data-provider="esri-world-imagery">Esri World Imagery</div>
  <div class="provider-option" data-provider="cartodb-dark-matter">CartoDB Dark Matter</div>
`;

// Usa delegação de eventos para as opções do menu de provedores
document.getElementById('map-provider-menu').addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('provider-option')) {
    const selectedProvider = e.target.getAttribute('data-provider');
    mapController.switchBaseLayer(selectedProvider);

    // Exibe o mapa na tela
    document.getElementById('map-container').style.display = 'block';

    // Oculta o menu de opções de mapas
    document.getElementById("map-provider-menu").style.display = "none";
  }
});

// Seleciona o botão de fechar
document.getElementById('close-map-btn').addEventListener('click', function () {
  // Esconde o contêiner do mapa
  document.getElementById('map-container').style.display = 'none';
});
