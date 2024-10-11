const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const geojson = require('geojson'); // Importar a biblioteca geojson

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

// Conexão com o PostgreSQL
const client = new Client({
  user: 'postgre', 
  host: 'webgis-db.cja4swa8wjlo.us-east-2.rds.amazonaws.com',
  database: 'postgres', 
  password: 'GeometriaGis', 
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Rota para buscar dados das tabelas e retornar em formato JSON
app.get('/api/dados', async (req, res) => {
    try {
        res.json({ dadosGeoJSON, dadosRaster }); // Retornar os dados que já foram buscados
    } catch (error) {
        console.error('Erro ao retornar dados:', error);
        res.status(500).send('Erro ao retornar dados.');
    }
});

// Inicializa o servidor e conecta ao PostgreSQL
client.connect()
    .then(() => {
        console.log('Conectado ao PostgreSQL');
        // Inicia o servidor
        app.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
            // Buscar dados após a conexão
            buscarDados();
        });
    })
    .catch(err => console.error('Erro ao conectar ao banco de dados:', err));

let dadosGeoJSON = [];
let dadosRaster = [];

// Função para buscar dados das tabelas
async function buscarDados() {
    try {
        const tabelas = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';");
        console.log('Tabelas encontradas:', tabelas.rows); // Log das tabelas encontradas

        for (const tabela of tabelas.rows) {
            const nomeTabela = tabela.table_name;

            console.log(`Buscando dados da tabela: ${nomeTabela}`); // Log da tabela
            
            // Consultar a tabela e verificar se tem uma coluna geométrica
            const colunaGeometria = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${nomeTabela}' AND column_name IN ('geom', 'geometry', 'geometria');
            `);
            console.log(`Colunas geométricas na tabela ${nomeTabela}:`, colunaGeometria.rows); // Log das colunas geométricas

            if (colunaGeometria.rows.length > 0) {
                const data = await client.query(`SELECT *, ST_AsGeoJSON(geom) as geom FROM "${nomeTabela}";`); // Converter geometria para GeoJSON
                console.log(`Dados GeoJSON da tabela ${nomeTabela}:`, data.rows); // Log dos dados GeoJSON
                
                const dadosComGeoJSON = data.rows.map(row => ({
                    ...row,
                    geom: JSON.parse(row.geom) // Parse o GeoJSON da string
                }));

                dadosGeoJSON.push({
                    nome: nomeTabela,
                    dados: dadosComGeoJSON,
                });
            }

            // Verificar se a tabela possui uma coluna do tipo raster
            const colunaRaster = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${nomeTabela}' AND data_type = 'raster';
            `);
            console.log(`Colunas raster na tabela ${nomeTabela}:`, colunaRaster.rows); // Log das colunas raster

            if (colunaRaster.rows.length > 0) {
                const rasterData = await client.query(`SELECT *, ST_AsJPEG(${colunaRaster.rows[0].column_name}) as raster FROM "${nomeTabela}";`);
                console.log(`Dados raster da tabela ${nomeTabela}:`, rasterData.rows); // Log dos dados raster
                
                dadosRaster.push({
                    nome: nomeTabela,
                    dados: rasterData.rows.map(row => ({
                        ...row,
                        raster: row.raster ? `data:image/jpeg;base64,${row.raster.toString('base64')}` : null // Converter raster para base64
                    })),
                });
            }
        }

        console.log('Dados GeoJSON e Raster carregados com sucesso.');
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    }
}
