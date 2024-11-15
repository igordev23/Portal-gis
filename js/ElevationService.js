// ElevationService.js
export default class ElevationService {
    constructor() {
      this.apiUrl = "https://api.open-elevation.com/api/v1/lookup";
    }
  
    // Função para calcular elevação entre dois pontos com dados interpolados
    async calcularElevacao(pontoInicial, pontoFinal, numPontos = 10) {
      const interpolados = Array.from({ length: numPontos }, (_, i) => {
        const lat = pontoInicial[0] + ((pontoFinal[0] - pontoInicial[0]) * i / (numPontos - 1));
        const lng = pontoInicial[1] + ((pontoFinal[1] - pontoInicial[1]) * i / (numPontos - 1));
        return { latitude: lat, longitude: lng };
      });
  
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: interpolados })
        });
        const data = await response.json();
  
        const elevacoes = data.results.map(result => result.elevation);
        const distancias = interpolados.map((_, i) => i * (100 / numPontos)); // Simulação de distâncias em metros
        
        return { distancias, elevacoes };
      } catch (error) {
        console.error("Erro ao obter dados de elevação:", error);
        throw new Error("Erro ao obter dados de elevação");
      }
    }
  }
  