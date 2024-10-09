const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

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
    const tabelas = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';");
    const dadosJSON = [];

    // Loop para pegar dados de cada tabela
    for (const tabela of tabelas.rows) {
      const data = await client.query(`SELECT * FROM ${tabela.table_name};`);
      dadosJSON.push({
        nome: tabela.table_name,
        dados: data.rows,
      });
    }

    res.json(dadosJSON); // Retorna todas as tabelas com seus dados
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).send('Erro ao buscar dados.');
  }
});

// Inicializa o servidor e conecta ao PostgreSQL
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  client.connect()
    .then(() => {
      console.log('Conectado ao PostgreSQL');
    })
    .catch(err => console.error('Erro ao conectar ao banco de dados:', err));
});
