export default class ElevationService {
  constructor() {
      this.apiUrl = "https://api.open-elevation.com/api/v1/lookup";
  }

  // Calcula a distância real em metros entre dois pontos (usando a fórmula de Haversine)
  calcularDistancia(lat1, lng1, lat2, lng2) {
      const R = 6371e3; // Raio da Terra em metros
      const toRad = (value) => (value * Math.PI) / 180;

      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);

      const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distância em metros
  }

  // Interpolação de pontos com base na distância real
  interpolarPontos(pontoInicial, pontoFinal, numPontos) {
      const [lat1, lng1] = pontoInicial;
      const [lat2, lng2] = pontoFinal;

      const distanciaTotal = this.calcularDistancia(lat1, lng1, lat2, lng2);
      const pontos = Array.from({ length: numPontos }, (_, i) => {
          const proporcao = i / (numPontos - 1);
          const lat = lat1 + (lat2 - lat1) * proporcao;
          const lng = lng1 + (lng2 - lng1) * proporcao;
          return {
              latitude: parseFloat(lat.toFixed(6)), // Arredonda coordenadas
              longitude: parseFloat(lng.toFixed(6)),
              distancia: parseFloat((proporcao * distanciaTotal).toFixed(2)), // Distância arredondada
          };
      });

      return {
          pontos,
          distanciaTotalMetros: parseFloat(distanciaTotal.toFixed(2)),
          distanciaTotalKm: parseFloat((distanciaTotal / 1000).toFixed(2)), // Conversão para km
      };
  }

  // Função para calcular elevação entre dois pontos
  async calcularElevacao(pontoInicial, pontoFinal, numPontos = 10) {
      const { pontos, distanciaTotalMetros, distanciaTotalKm } =
          this.interpolarPontos(pontoInicial, pontoFinal, numPontos);

      try {
          const response = await fetch(this.apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  locations: pontos.map(({ latitude, longitude }) => ({
                      latitude,
                      longitude,
                  })),
              }),
          });

          const data = await response.json();

          const elevacoes = data.results.map((result) =>
              parseFloat(result.elevation.toFixed(2))
          );
          const distancias = pontos.map(({ distancia }) => distancia);

          return { distancias, elevacoes, distanciaTotalMetros, distanciaTotalKm };
      } catch (error) {
          console.error("Erro ao obter dados de elevação:", error);
          throw new Error(
              "Erro ao obter dados de elevação. Verifique sua conexão ou tente novamente."
          );
      }
  }
}
