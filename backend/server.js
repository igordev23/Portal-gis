const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path'); // Importar biblioteca para manipulação de caminhos

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

app.get('/api/dados', async (req, res) => {
    try {
        const tabelas = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';");
        const dadosGeoJSON = [];

        for (const tabela of tabelas.rows) {
            const nomeTabela = tabela.table_name;

            console.log(`Buscando dados da tabela: ${nomeTabela}`);

            // Verificar colunas geométricas
            const colunaGeometria = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${nomeTabela}' AND column_name IN ('geom', 'geometry', 'geometria');
            `);

            if (colunaGeometria.rows.length > 0) {
                const data = await client.query(`SELECT *, ST_AsGeoJSON(geom) as geom FROM "${nomeTabela}";`);
                const dadosComGeoJSON = data.rows.map(row => ({
                    ...row,
                    geom: JSON.parse(row.geom)
                }));

                dadosGeoJSON.push({
                    nome: nomeTabela,
                    dados: dadosComGeoJSON
                });
            }

            // Verificar colunas de imagem
            const colunaImagem = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${nomeTabela}' AND column_name IN ('imagem', 'raster', 'photo');
            `);

            if (colunaImagem.rows.length > 0) {
                const imagens = await client.query(`SELECT * FROM "${nomeTabela}";`);
                const urlsImagens = imagens.rows.map(row => {
                    // Construa a URL completa da imagem se necessário
                    return path.join('http://localhost:3000/imagens', row[colunaImagem.rows[0].column_name]);
                });

                dadosGeoJSON.push({
                    nome: nomeTabela,
                    dados: urlsImagens.map(url => ({
                        raster: url
                    }))
                });
            }
        }

        res.json(dadosGeoJSON);
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).send('Erro ao buscar dados.');
    }
});

// Servir arquivos de imagem estáticos, se as imagens estiverem no servidor local
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));

// Inicializa o servidor e conecta ao PostgreSQL
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    client.connect()
        .then(() => {
            console.log('Conectado ao PostgreSQL');
        })
        .catch(err => console.error('Erro ao conectar ao banco de dados:', err));
});
