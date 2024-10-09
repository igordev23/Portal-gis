const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Permitir que o port seja definido por variável de ambiente

// Permitir CORS de todas as origens
app.use(cors({
  origin: '*', // Cuidado ao usar '*', idealmente defina domínios específicos para produção
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Conexão com o PostgreSQL
const client = new Client({
  user: 'postgre',
  host: 'webgis-db.cja4swa8wjlo.us-east-2.rds.amazonaws.com',
  database: 'postgres',
  password: 'GeometriaGis',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Função para buscar arquivos GeoJSON e SHP recursivamente
async function buscarArquivosRecursivamente(diretorio) {
  let geojsonResultados = [];
  let shpResultados = [];

  const lerDiretorio = async (dir) => {
    try {
      const arquivos = await fs.promises.readdir(dir);
      for (const arquivo of arquivos) {
        const caminhoCompleto = path.join(dir, arquivo);
        const estatisticas = await fs.promises.stat(caminhoCompleto);

        if (estatisticas.isDirectory()) {
          await lerDiretorio(caminhoCompleto);
        } else if (arquivo.endsWith('.geojson')) {
          geojsonResultados.push(caminhoCompleto);
        } else if (arquivo.endsWith('.shp')) {
          shpResultados.push(caminhoCompleto);
        }
      }
    } catch (erro) {
      console.error(`Erro ao ler o diretório ${dir}:`, erro);
    }
  };

  await lerDiretorio(diretorio);
  return { geojsonResultados, shpResultados };
}

// Rota para buscar dados das tabelas e retornar em formato GeoJSON
app.get('/api/dados', async (req, res) => {
  try {
    const tabelas = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';");
    const dadosGeoJSON = [];

    for (const tabela of tabelas.rows) {
      const data = await client.query(`SELECT * FROM ${tabela.table_name};`);
      dadosGeoJSON.push({
        nome: tabela.table_name,
        dados: data.rows,
      });
    }

    res.json(dadosGeoJSON);
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).send('Erro ao buscar dados.');
  }
});

// Função para buscar tabelas existentes no esquema public
async function buscarTabelas() {
  try {
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';");
    
    if (res.rows.length === 0) {
      console.log('Nenhuma tabela encontrada no esquema public.');
    } else {
      console.log(`Tabelas encontradas no esquema public: ${res.rows.length}`);
      res.rows.forEach(row => console.log(`- ${row.table_name}`));
    }
  } catch (error) {
    console.error('Erro ao buscar tabelas:', error);
  }
}

// Função para buscar e exibir os arquivos GeoJSON e SHP no terminal
async function buscarEExibirArquivos() {
  try {
    console.log('Iniciando busca automática de arquivos GeoJSON e SHP.');

    const diretorioRaiz = path.join(__dirname); // Diretório do servidor
    const { geojsonResultados, shpResultados } = await buscarArquivosRecursivamente(diretorioRaiz);

    if (geojsonResultados.length === 0 && shpResultados.length === 0) {
      console.log('Nenhum arquivo GeoJSON ou SHP encontrado.');
    } else {
      if (geojsonResultados.length > 0) {
        console.log(`Arquivos GeoJSON encontrados: ${geojsonResultados.length}`);
        geojsonResultados.forEach(arquivo => console.log(`- ${arquivo}`));
      } else {
        console.log('Nenhum arquivo GeoJSON encontrado.');
      }

      if (shpResultados.length > 0) {
        console.log(`Arquivos SHP encontrados: ${shpResultados.length}`);
        shpResultados.forEach(arquivo => console.log(`- ${arquivo}`));
      } else {
        console.log('Nenhum arquivo SHP encontrado.');
      }
    }
  } catch (error) {
    console.error('Erro ao buscar arquivos GeoJSON e SHP:', error);
  }
}

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);

  // Conectar ao banco de dados PostgreSQL
  client.connect()
    .then(() => {
      console.log('Conectado ao banco de dados PostgreSQL');

      // Chamar a função de busca de tabelas após conectar ao banco de dados
      buscarTabelas();

      // Chamar a função de busca de arquivos GeoJSON e SHP após conectar ao banco de dados
      buscarEExibirArquivos();
    })
    .catch(err => console.error('Erro ao conectar ao banco de dados:', err));
});
