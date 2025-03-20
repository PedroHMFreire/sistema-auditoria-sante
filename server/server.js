const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Inicializar o banco de dados
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS counts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        type VARCHAR(50) NOT NULL,
        system_data JSONB NOT NULL,
        store_data JSONB NOT NULL,
        summary JSONB NOT NULL,
        details JSONB NOT NULL,
        status VARCHAR(50) NOT NULL
      );
    `);
    console.log('Tabela "counts" criada ou já existe.');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  }
}

initializeDatabase();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let systemData = [];
let storeData = [];
let countTitle = '';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel são permitidos'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function normalizeColumnName(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function extractNumericCode(code) {
  if (code == null || code === '' || (typeof code !== 'string' && typeof code !== 'number')) {
    return '';
  }
  return code.toString().replace(/[^0-9]/g, '');
}

app.post('/create-count-from-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const { title } = req.body;
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length === 0) return res.status(400).json({ error: 'Planilha vazia' });

    console.log('Dados brutos do Excel:', rawData);

    const headers = rawData[0].map(normalizeColumnName);
    const codeCol = headers.indexOf('codigo');
    const productCol = headers.indexOf('produto');
    let balanceCol = headers.indexOf('saldo');
    if (balanceCol === -1) balanceCol = headers.indexOf('saldo_estoque');

    if (codeCol === -1 || productCol === -1 || balanceCol === -1) {
      return res.status(400).json({
        error: 'Formato de planilha inválido. Colunas esperadas: Código, Produto, Saldo (ou Saldo_Estoque)',
      });
    }

    const systemData = rawData.slice(1).filter(row => row && row.length > 0).map((row, index) => {
      const code = extractNumericCode(row[codeCol]);
      const product = row[productCol] ? String(row[productCol]).trim() : '';
      const balance = parseFloat(row[balanceCol]) || 0;

      console.log(`Linha ${index + 2}: Código=${code}, Produto=${product}, Saldo=${balance}`);

      if (!code || !product) {
        console.log(`Linha ${index + 2} ignorada: Código ou Produto vazio`);
        return null;
      }

      return { code, product, balance };
    }).filter(item => item !== null);

    if (systemData.length === 0) return res.status(400).json({ error: 'Nenhuma linha válida encontrada. Verifique se as colunas Código e Produto estão preenchidas.' });

    const newCount = {
      title: title || `Contagem sem título - ${new Date().toISOString().slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      type: 'pre-created',
      systemData,
      storeData: [],
      summary: { totalProductsInExcess: 0, totalProductsMissing: 0, totalProductsRegular: 0 },
      details: [],
      status: 'created',
    };

    const result = await pool.query(
      `INSERT INTO counts (title, timestamp, type, system_data, store_data, summary, details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        newCount.title,
        newCount.timestamp,
        newCount.type,
        JSON.stringify(newCount.systemData),
        JSON.stringify(newCount.storeData),
        JSON.stringify(newCount.summary),
        JSON.stringify(newCount.details),
        newCount.status,
      ]
    );

    const countId = result.rows[0].id;

    fs.unlink(req.file.path, (err) => err && console.error('Erro ao excluir arquivo:', err));
    res.status(200).json({
      message: 'Contagem pré-criada com sucesso!',
      countId,
      systemData,
    });
  } catch (error) {
    console.error('Erro ao criar contagem:', error);
    res.status(500).json({ error: 'Erro ao criar contagem: ' + error.message });
  }
});

app.post('/load-count', async (req, res) => {
  try {
    const { countId } = req.body;
    const result = await pool.query('SELECT * FROM counts WHERE id = $1', [countId]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'ID inválido' });

    const selectedCount = result.rows[0];
    systemData = Array.isArray(selectedCount.system_data) ? selectedCount.system_data : [];
    storeData = Array.isArray(selectedCount.store_data) ? selectedCount.store_data : [];
    countTitle = selectedCount.title;

    res.status(200).json({ message: 'Contagem carregada!', systemData, storeData, countTitle });
  } catch (error) {
    console.error('Erro ao carregar contagem:', error);
    res.status(500).json({ error: 'Erro ao carregar contagem: ' + error.message });
  }
});

app.post('/upload-system-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length === 0) return res.status(400).json({ error: 'Planilha vazia' });

    const headers = rawData[0].map(normalizeColumnName);
    const codeCol = headers.indexOf('codigo');
    const productCol = headers.indexOf('produto');
    let balanceCol = headers.indexOf('saldo');
    if (balanceCol === -1) balanceCol = headers.indexOf('saldo_estoque');

    if (codeCol === -1 || productCol === -1 || balanceCol === -1) {
      return res.status(400).json({
        error: 'Formato inválido. Colunas: Código, Produto, Saldo (ou Saldo_Estoque)',
      });
    }

    systemData = rawData.slice(1).filter(row => row && row.length > 0).map(row => {
      const code = extractNumericCode(row[codeCol]);
      const product = row[productCol] ? String(row[productCol]).trim() : '';
      const balance = parseFloat(row[balanceCol]) || 0;

      if (!code || !product) return null;

      return { code, product, balance };
    }).filter(item => item !== null);

    if (systemData.length === 0) return res.status(400).json({ error: 'Nenhuma linha válida encontrada. Verifique se as colunas Código e Produto estão preenchidas.' });

    const totalItems = systemData.length;
    const totalUnits = systemData.reduce((sum, item) => sum + item.balance, 0);

    fs.unlink(req.file.path, (err) => err && console.error('Erro ao excluir arquivo:', err));
    res.status(200).json({ message: 'Dados carregados!', summary: { totalItems, totalUnits } });
  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

app.post('/set-count-title', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Título inválido' });
    countTitle = title.trim();
    res.status(200).json({ message: `Título definido como "${countTitle}"` });
  } catch (error) {
    console.error('Erro ao definir título:', error);
    res.status(500).json({ error: 'Erro ao definir título: ' + error.message });
  }
});

app.post('/count-store', async (req, res) => {
  try {
    const { code, quantity, countId } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Código inválido' });
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return res.status(400).json({ error: 'Quantidade inválida' });
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const result = await pool.query('SELECT store_data FROM counts WHERE id = $1', [countId]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Contagem não encontrada' });

    storeData = Array.isArray(result.rows[0].store_data) ? result.rows[0].store_data : [];
    storeData.push({ code: extractNumericCode(code), quantity: qty });

    await pool.query(
      'UPDATE counts SET store_data = $1, status = $2 WHERE id = $3',
      [JSON.stringify(storeData), 'created', countId]
    );

    res.status(200).json({ message: `Código ${code} adicionado com quantidade ${qty}` });
  } catch (error) {
    console.error('Erro ao adicionar código:', error);
    res.status(500).json({ error: 'Erro ao adicionar código: ' + error.message });
  }
});

app.post('/save-count', async (req, res) => {
  try {
    const { countId } = req.body;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const result = await pool.query('SELECT store_data FROM counts WHERE id = $1', [countId]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Contagem não encontrada' });

    storeData = Array.isArray(result.rows[0].store_data) ? result.rows[0].store_data : [];
    if (storeData.length === 0) return res.status(400).json({ error: 'Nenhuma contagem para salvar' });

    res.status(200).json({ message: 'Contagem salva!' });
  } catch (error) {
    console.error('Erro ao salvar contagem:', error);
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

function generateReport(systemData, storeData, countTitle, filterDifferences = false) {
  if (!Array.isArray(systemData) || systemData.length === 0) throw new Error('Nenhum dado do sistema');

  const storeCount = storeData.reduce((acc, entry) => {
    acc[entry.code] = (acc[entry.code] || 0) + entry.quantity;
    return acc;
  }, {});

  let productsInExcess = 0;
  let productsMissing = 0;
  let productsRegular = 0;

  let reportDetails = systemData.map(item => {
    const counted = storeCount[item.code] || 0;
    const expected = item.balance;
    const difference = counted - expected;

    if (difference === 0) productsRegular++;
    else if (difference > 0) productsInExcess += difference;
    else if (difference < 0) productsMissing += Math.abs(difference);

    return {
      Código: item.code,
      Produto: item.product,
      Saldo_Estoque: expected,
      Contado: counted,
      Diferença: difference,
    };
  });

  const unknownProducts = Object.keys(storeCount).filter(code => !systemData.some(item => item.code === code));
  unknownProducts.forEach(code => {
    const counted = storeCount[code];
    productsInExcess += counted;
    reportDetails.push({
      Código: code,
      Produto: 'Desconhecido',
      Saldo_Estoque: 0,
      Contado: counted,
      Diferença: counted,
    });
  });

  if (filterDifferences) {
    reportDetails = reportDetails.filter(item => item.Diferença !== 0);
  }

  return {
    title: countTitle || 'Contagem sem título',
    timestamp: new Date().toISOString(),
    type: filterDifferences ? 'synthetic' : 'detailed',
    systemData,
    storeData,
    summary: {
      totalProductsInExcess: productsInExcess,
      totalProductsMissing: productsMissing,
      totalProductsRegular: productsRegular,
    },
    details: reportDetails,
    status: 'finalized',
  };
}

app.get('/report-detailed', async (req, res) => {
  try {
    const { countId } = req.query;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const result = await pool.query('SELECT * FROM counts WHERE id = $1', [countId]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Contagem não encontrada' });

    const count = result.rows[0];
    const systemData = Array.isArray(count.system_data) ? count.system_data : [];
    const storeData = Array.isArray(count.store_data) ? count.store_data : [];

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado do sistema disponível para gerar o relatório' });
    }

    const report = generateReport(systemData, storeData, count.title, false);
    await pool.query(
      'UPDATE counts SET system_data = $1, store_data = $2, summary = $3, details = $4, status = $5 WHERE id = $6',
      [
        JSON.stringify(report.systemData),
        JSON.stringify(report.storeData),
        JSON.stringify(report.summary),
        JSON.stringify(report.details),
        report.status,
        countId,
      ]
    );

    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/report-synthetic', async (req, res) => {
  try {
    const { countId } = req.query;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const result = await pool.query('SELECT * FROM counts WHERE id = $1', [countId]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Contagem não encontrada' });

    const count = result.rows[0];
    const systemData = Array.isArray(count.system_data) ? count.system_data : [];
    const storeData = Array.isArray(count.store_data) ? count.store_data : [];

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado do sistema disponível para gerar o relatório' });
    }

    const report = generateReport(systemData, storeData, count.title, true);
    await pool.query(
      'UPDATE counts SET system_data = $1, store_data = $2, summary = $3, details = $4, status = $5 WHERE id = $6',
      [
        JSON.stringify(report.systemData),
        JSON.stringify(report.storeData),
        JSON.stringify(report.summary),
        JSON.stringify(report.details),
        report.status,
        countId,
      ]
    );

    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório sintético:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/past-counts', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM counts';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    console.log('Executando query:', query, 'com parâmetros:', params);
    const result = await pool.query(query, params);
    console.log('Resultado bruto da query:', result.rows);

    // Validar e processar os dados retornados
    const counts = result.rows.map(row => {
      // Garantir que os campos JSONB sejam objetos válidos
      const systemData = Array.isArray(row.system_data) ? row.system_data : [];
      const storeData = Array.isArray(row.store_data) ? row.store_data : [];
      const summary = typeof row.summary === 'object' && row.summary !== null ? row.summary : {};
      const details = Array.isArray(row.details) ? row.details : [];

      console.log(`Detalhes de system_data para contagem ${row.id}:`, systemData);

      return {
        ...row,
        system_data: systemData,
        store_data: storeData,
        summary: summary,
        details: details,
      };
    });

    console.log('Dados processados enviados para o frontend:', counts);
    res.status(200).json(counts);
  } catch (error) {
    console.error('Erro ao listar contagens:', error);
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});

app.post('/reset', async (req, res) => {
  try {
    systemData = [];
    storeData = [];
    countTitle = '';
    res.status(200).json({ message: 'Dados reiniciados!' });
  } catch (error) {
    console.error('Erro ao reiniciar:', error);
    res.status(500).json({ error: 'Erro ao reiniciar: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', systemDataCount: systemData.length, storeDataCount: storeData.length });
});

if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../client/build');
  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(500).json({ error: 'Frontend não construído' });
  });
}

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno' });
});

app.listen(port, () => console.log(`Servidor na porta ${port}`));
