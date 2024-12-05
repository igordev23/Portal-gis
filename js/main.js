//main.js


// Importa o MapController do arquivo mapController.js
import { MapController } from './mapController.js';


// Cria a instância e expõe globalmente após o carregamento do DOM
document.addEventListener("DOMContentLoaded", function() {
  const mapControllerInstance = new MapController("map");
  window.mapController = mapControllerInstance; // Expondo a instância globalmente
   // Botão "Fechar" no modal
   document.getElementById('elevation-modal').querySelector('button').addEventListener('click', () => {
    mapControllerInstance.fecharModal(); // Chama o método fecharModal
  });
});


// Adiciona o evento de clique para o botão "home-btn"
document.getElementById("home-btn").addEventListener("click", () => {
  window.mapController.resetMapView();
});

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

document.getElementById('legend-btn').addEventListener('click', function () {
  const legend = document.getElementById('legend');
  // Alterna a visibilidade da legenda
  if (legend.style.display === 'none' || legend.style.display === '') {
      legend.style.display = 'block'; // Mostra a legenda
  } else {
      legend.style.display = 'none'; // Oculta a legenda
  }
});


// Seleciona o botão "Mapas base" e o menu
const baseMapBtn = document.getElementById('base-map-btn');
const mapProviderMenu = document.getElementById('map-provider-menu');
const closeBtn = document.getElementById('map-provider-close-btn');


// Seleciona os elementos do DOM

const selector = document.getElementById('selector');


// Função para mostrar/ocultar o menu de camadas
operationalLayersBtn.addEventListener('click', () => {
  if (selector.classList.contains('hidden')) {
    selector.classList.remove('hidden');
    selector.classList.add('show');
  } else {
    selector.classList.add('hidden');
    selector.classList.remove('show');
  }
});


const  camadasbnt = document.getElementById('camadas-close-btn')

// Função para mostrar/ocultar o menu de camadas
camadasbnt.addEventListener('click', () => {
  if (selector.classList.contains('hidden')) {
    selector.classList.remove('hidden');
    selector.classList.add('show');
  } else {
    selector.classList.add('hidden');
    selector.classList.remove('show');
  }
});



// Mostrar/ocultar o menu ao clicar no botão "Mapas base"
baseMapBtn.addEventListener('click', () => {

  if (mapProviderMenu.classList.contains('hidden')) {
    mapProviderMenu.classList.remove('hidden');
    mapProviderMenu.style.display = 'block'; // Mostra o menu
  } else {
    mapProviderMenu.classList.add('hidden');
    mapProviderMenu.style.display = 'none'; // Esconde o menu
  }
});

// Mostrar/ocultar o menu ao clicar no botão "Mapas base"
mapProviderMenu.addEventListener('click', () => {
  
  if (mapProviderMenu.classList.contains('hidden')) {
    mapProviderMenu.classList.remove('hidden');
    mapProviderMenu.style.display = 'block'; // Mostra o menu
  } else {
    mapProviderMenu.classList.add('hidden');
    mapProviderMenu.style.display = 'none'; // Esconde o menu
  }
});



// Fecha a legenda ao clicar no botão de fechar
document.getElementById('legend-close-btn').addEventListener('click', () => {
  document.getElementById('legend').style.display = 'none';
});

// Exibe a legenda novamente (isso pode ser colocado no botão que você usa para ativar a legenda)
function showLegend() {
  document.getElementById('legend').style.display = 'block';
}




// Adiciona as novas opções ao menu de provedores antes de aplicar os eventos
document.getElementById('map-provider-menu').innerHTML += `
  <div class="provider-option" data-provider="osm">OSM</div>
  <div class="provider-option" data-provider="satellite">Satellite</div>
  <div class="provider-option" data-provider="cartodb">CartoDB Positron</div>
  <div class="provider-option" data-provider="stamen-watercolor">Stamen Watercolor</div>
  <div class="provider-option" data-provider="esri-world-imagery">Esri World Imagery</div>
  <div class="provider-option" data-provider="cartodb-dark-matter">CartoDB Dark Matter</div>
  <div class="provider-option" data-provider="raster">Ortofoto</div>
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

async function carregarDados() {
  try {
      const response = await fetch('https://portal-gis-back.onrender.com/api/dados');
      const dados = await response.json();

      const dadosDiv = document.getElementById('dados');
      dadosDiv.innerHTML = ''; // Limpa o conteúdo anterior

      if (dados.length === 0) {
          dadosDiv.innerHTML = '<p>Nenhuma tabela encontrada.</p>';
      }

      dados.forEach(tabela => {
          const tabelaDiv = document.createElement('div');
          tabelaDiv.classList.add('tabela');

          const titulo = document.createElement('h2');
          titulo.innerText = `Tabela: ${tabela.nome}`;
          tabelaDiv.appendChild(titulo);

          // Cria uma tabela HTML para os dados
          const table = document.createElement('table');
          const thead = document.createElement('thead');
          const tbody = document.createElement('tbody');

          // Cria o cabeçalho da tabela com os nomes das colunas id, fclass e name
          const headerRow = document.createElement('tr');
          ['id', 'fclass', 'name'].forEach(coluna => {
              const th = document.createElement('th');
              th.innerText = coluna;
              headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);

          // Preenche as linhas com os dados
          tabela.dados.forEach(linha => {
              const row = document.createElement('tr');

              ['id', 'fclass', 'name'].forEach(coluna => {
                  const td = document.createElement('td');
                  td.innerText = linha[coluna] !== undefined ? linha[coluna] : ''; // Exibe a célula se existir
                  row.appendChild(td);
              });

              tbody.appendChild(row);
          });

          table.appendChild(thead);
          table.appendChild(tbody);
          tabelaDiv.appendChild(table);

          dadosDiv.appendChild(tabelaDiv);
      });
  } catch (error) {
      console.error('Erro ao carregar dados:', error);
      document.getElementById('dados').innerHTML = '<p>Erro ao carregar dados.</p>';
  }
}



 




