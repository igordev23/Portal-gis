



export class DataFetcher {
    constructor(map, geoJSONController) {
        this.map = map;
        this.geoJSONController = geoJSONController; // Referência ao GeoJSONController
    }

    // Função para buscar dados e passar para o GeoJSONController
    async buscarDados() {
        try {
            const resposta = await fetch('https://portal-gis-back.onrender.com/api/dados');
            const dados = await resposta.json();

            // Atualizar o GeoJSONController com os novos dados
            this.geoJSONController.updateWithFetchedData(dados);

            // Montar a tabela
            let tabelaHtml = '<table><thead><tr><th>Nome da Tabela</th><th>Dados</th></tr></thead><tbody>';
            dados.forEach(tabela => {
                tabelaHtml += `<tr><td>${tabela.nome}</td><td>${JSON.stringify(tabela.dados)}</td></tr>`;
            });
            tabelaHtml += '</tbody></table>';

            

        } catch (erro) {
            console.error('Erro ao buscar dados:', erro);
            document.getElementById('tabela-container').innerHTML = '<p class="text-red-500">Erro ao buscar dados.</p>';
        }
    }
}
