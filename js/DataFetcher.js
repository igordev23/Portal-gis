



export class DataFetcher {
    constructor(map, geoJSONController) {
        this.map = map;
        this.geoJSONController = geoJSONController; // Referência ao GeoJSONController
    }

    // Função para buscar dados e passar para o GeoJSONController
    async buscarDados() {
        try {
            const resposta = await fetch('https://eybimsa4ff.us-east-2.awsapprunner.com/api/dados');
            const dados = await resposta.json();

            // Atualizar o GeoJSONController com os novos dados
            this.geoJSONController.updateWithFetchedData(dados);

           
            

        } catch (erro) {
            console.error('Erro ao buscar dados:', erro);
            document.getElementById('tabela-container').innerHTML = '<p class="text-red-500">Erro ao buscar dados.</p>';
        }
    }
}
