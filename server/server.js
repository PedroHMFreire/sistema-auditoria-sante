const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const COUNTS_FILE = path.join(__dirname, 'counts.json');

// Criar o diretório de uploads e limpá-lo na inicialização
async function initializeUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('Diretório de uploads criado:', UPLOAD_DIR);

    const files = await fs.readdir(UPLOAD_DIR);
    for (const file of files) {
      await fs.unlink(path.join(UPLOAD_DIR, file));
      console.log(`Arquivo removido: ${file}`);
    }
    console.log('Diretório de uploads limpo.');
  } catch (error) {
    console.error('Erro ao inicializar/limpar o diretório de uploads:', error);
  }
}

initializeUploadDir();

// Funções para ler e salvar contagens no arquivo JSON
async function loadCounts() {
  try {
    const data = await fs.readFile(COUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('Erro ao carregar contagens:', error);
    return [];
  }
}

async function saveCounts(counts) {
  try {
    await fs.writeFile(COUNTS_FILE, JSON.stringify(counts, null, 2));
    console.log('Contagens salvas com sucesso em counts.json');
  } catch (error) {
    console.error('Erro ao salvar contagens:', error);
  }
}

// Carregar contagens na inicialização
let counts = [];
(async () => {
  counts = await loadCounts();
  console.log('Contagens carregadas:', counts);
})();

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

    if (systemData.length === 0) return res.status(400).json({ error: 'Nenhuma linha válida encontrada.' });

    const newCount = {
      id: counts.length + 1,
      title: title || `Contagem sem título - ${new Date().toISOString().slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      type: 'pre-created',
      system_data: systemData,
      store_data: [],
      summary: { totalProductsInExcess: 0, totalProductsMissing: 0, totalProductsRegular: 0 },
      details: [],
      status: 'created',
    };

    counts.push(newCount);
    await saveCounts(counts);
    console.log('Nova contagem criada:', newCount);

    await fs.unlink(req.file.path).catch(err => console.error('Erro ao excluir arquivo:', err));
    res.status(200).json({
      message: 'Contagem criada com sucesso!',
      countId: newCount.id,
      systemData,
    });
  } catch (error) {
    console.error('Erro ao criar contagem:', error);
    res.status(500).json({ error: 'Erro ao criar contagem: ' + error.message });
  }
});

app.post('/count-store', async (req, res) => {
  try {
    const { code, quantity, countId } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Código inválido' });
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return res.status(400).json({ error: 'Quantidade inválida' });
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const count = counts.find(c => c.id === parseInt(countId));
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });

    if (!Array.isArray(count.store_data)) count.store_data = [];
    count.store_data.push({ code: extractNumericCode(code), quantity: qty });
    count.status = 'created';
    await saveCounts(counts);

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

    const count = counts.find(c => c.id === parseInt(countId));
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });

    if (!Array.isArray(count.store_data) || count.store_data.length === 0) {
      return res.status(400).json({ error: 'Nenhuma contagem para salvar' });
    }

    await saveCounts(counts);
    res.status(200).json({ message: 'Contagem salva!' });
  } catch (error) {
    console.error('Erro ao salvar contagem:', error);
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

app.post('/finalize-count', async (req, res) => {
  try {
    const { countId } = req.body;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const count = counts.find(c => c.id === parseInt(countId));
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });

    const report = generateReport(count.system_data, count.store_data, count.title, false);
    count.status = 'finalized';
    count.summary = report.summary;
    count.details = report.details;
    count.timestamp = new Date().toISOString();
    await saveCounts(counts);

    res.status(200).json({ message: 'Contagem finalizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao finalizar contagem:', error);
    res.status(500).json({ error: 'Erro ao finalizar contagem: ' + error.message });
  }
});

function generateReport(systemData, storeData, countTitle, filterDifferences = false) {
  if (!Array.isArray(systemData) || systemData.length === 0) {
    throw new Error('Nenhum dado do sistema');
  }

  const storeCount = storeData.reduce((acc, entry) => {
    acc[entry.code] = (acc[entry.code] || 0) + entry.quantity;
    return acc;
  }, {});

  let productsInExcess = 0;
  let productsMissing = 0;
  let productsRegular = 0;

  let reportDetails = systemData.map(item => {
    const counted = storeCount[item.code] || 0;
    const expected = item.balance || 0;
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
    system_data: systemData,
    store_data: storeData,
    summary: {
      totalProductsInExcess: productsInExcess,
      totalProductsMissing: productsMissing,
      totalProductsRegular: productsRegular,
    },
    details: reportDetails,
    status: 'finalized',
  };
}

// Estilos CSS inline para os relatórios
const reportStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Poppins', sans-serif;
    background-color: #1C2526;
    color: #FFFFFF;
  }
  .App {
    max-width: 900px;
    margin: 40px auto;
    padding: 20px;
    border-radius: 12px;
    background-color: #1C2526;
  }
  .App-header {
    text-align: center;
    padding: 20px;
    border-bottom: 1px solid #444;
    background-color: #1C2526;
  }
  .app-title {
    font-family: 'Norwester', sans-serif;
    font-size: 2.5em;
    font-weight: bold;
    color: #FF6200;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .nav-link {
    text-decoration: none;
    color: #FFFFFF;
    font-size: 1em;
    padding: 8px 16px;
    border-radius: 6px;
    transition: background-color 0.3s, color 0.3s;
  }
  .nav-link:hover {
    background-color: #FF6200;
    color: #000000;
  }
  .App-main {
    padding: 30px 0;
  }
  .card {
    background: #1C2526;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .card h2 {
    font-size: 1.8em;
    color: #FFFFFF;
    margin-bottom: 15px;
    font-weight: 600;
  }
  .card h3 {
    font-size: 1.5em;
    color: #FFFFFF;
    margin-bottom: 10px;
  }
  .card p {
    font-size: 1em;
    color: #FFFFFF;
    margin-bottom: 15px;
  }
  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  .report-table th,
  .report-table td {
    border: 1px solid #555;
    padding: 10px;
    text-align: center;
    color: #FFFFFF;
  }
  .report-table th {
    background-color: #333333;
    color: #FFFFFF;
  }
  @media print {
    .App-header {
      display: none !important;
    }
    .App-main {
      padding: 0;
    }
    .card {
      border: none;
      padding: 0;
    }
    .report-table th,
    .report-table td {
      border: 1px solid #000;
      padding: 5px;
    }
    .report-table th {
      background-color: #E0E0E0;
    }
  }
`;

app.get('/report-detailed', async (req, res) => {
  try {
    const { countId } = req.query;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const count = counts.find(c => c.id === parseInt(countId));
    if (!count) return res.status(404).json({ error: 'Contagem não encontrada' });

    const systemData = Array.isArray(count.system_data) ? count.system_data : [];
    const storeData = Array.isArray(count.store_data) ? count.store_data : [];

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado do sistema disponível para gerar o relatório' });
    }

    const report = generateReport(systemData, storeData, count.title, false);

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Detalhado - AUDITÊ</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
        <style>
          ${reportStyles}
        </style>
      </head>
      <body>
        <div class="App">
          <header class="App-header">
            <h1 class="app-title">AUDITÊ</h1>
            <nav>
              <a href="/past-counts" class="nav-link">Voltar</a>
            </nav>
          </header>
          <main class="App-main">
            <div class="card">
              <h2>RELATÓRIO DETALHADO</h2>
              <p><strong>Título:</strong> ${report.title}</p>
              <p><strong>Data:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
              <h3>Resumo</h3>
              <p>Produtos em Excesso: ${report.summary.totalProductsInExcess}</p>
              <p>Produtos Faltando: ${report.summary.totalProductsMissing}</p>
              <p>Produtos Regulares: ${report.summary.totalProductsRegular}</p>
              <h3>Detalhes</h3>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th>Saldo Estoque</th>
                    <th>Contado</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.details.map(item => `
                    <tr>
                      <td>${item.Código || 'N/A'}</td>
                      <td>${item.Produto || 'N/A'}</td>
                      <td>${item.Saldo_Estoque}</td>
                      <td>${item.Contado}</td>
                      <td>${item.Diferença}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </body>
      </html>
    `;
    res.status(200).send(html);
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/report-synthetic', async (req, res) => {
  try {
    const { countId } = req.query;
    if (!countId) return res.status(400).json({ error: 'ID da contagem não fornecido' });

    const count = counts.find(c => c.id === parseInt(countId));
    if (!count) return res.status(404).json({ error: 'Contagem não encontrada' });

    const systemData = Array.isArray(count.system_data) ? count.system_data : [];
    const storeData = Array.isArray(count.store_data) ? count.store_data : [];

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado do sistema disponível para gerar o relatório' });
    }

    const report = generateReport(systemData, storeData, count.title, true);

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Sintético - AUDITÊ</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
        <style>
          ${reportStyles}
        </style>
      </head>
      <body>
        <div class="App">
          <header class="App-header">
            <h1 class="app-title">AUDITÊ</h1>
            <nav>
              <a href="/past-counts" class="nav-link">Voltar</a>
            </nav>
          </header>
          <main class="App-main">
            <div class="card">
              <h2>RELATÓRIO SINTÉTICO</h2>
              <p><strong>Título:</strong> ${report.title}</p>
              <p><strong>Data:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
              <h3>Resumo</h3>
              <p>Produtos em Excesso: ${report.summary.totalProductsInExcess}</p>
              <p>Produtos Faltando: ${report.summary.totalProductsMissing}</p>
              <p>Produtos Regulares: ${report.summary.totalProductsRegular}</p>
              <h3>Detalhes (Apenas Diferenças)</h3>
              ${report.details.length > 0 ? `
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Saldo Estoque</th>
                      <th>Contado</th>
                      <th>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.details.map(item => `
                      <tr>
                        <td>${item.Código || 'N/A'}</td>
                        <td>${item.Produto || 'N/A'}</td>
                        <td>${item.Saldo_Estoque}</td>
                        <td>${item.Contado}</td>
                        <td>${item.Diferença}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p>Nenhuma diferença encontrada.</p>'}
            </div>
          </main>
        </div>
      </body>
      </html>
    `;
    res.status(200).send(html);
  } catch (error) {
    console.error('Erro ao gerar relatório sintético:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/past-counts', async (req, res) => {
  try {
    const { status } = req.query;
    let filteredCounts = counts;
    if (status) {
      filteredCounts = counts.filter(count => count.status === status);
    }
    console.log('Dados enviados para o frontend:', filteredCounts);
    res.status(200).json(filteredCounts);
  } catch (error) {
    console.error('Erro ao listar contagens:', error);
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});

app.post('/reset', async (req, res) => {
  try {
    counts = [];
    await saveCounts(counts);
    res.status(200).json({ message: 'Dados reiniciados!' });
  } catch (error) {
    console.error('Erro ao reiniciar:', error);
    res.status(500).json({ error: 'Erro ao reiniciar: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  try {
    res.status(200).json({ status: 'ok', counts: counts.length });
  } catch (error) {
    console.error('Erro no endpoint /health:', error);
    res.status(500).json({ error: 'Erro no endpoint de saúde' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../client/build');
  app.use(express.static(staticDir));

  app.get('*', (req, res) => {
    try {
      if (req.path.startsWith('/create-count') ||
          req.path.startsWith('/count-store') ||
          req.path.startsWith('/save-count') ||
          req.path.startsWith('/finalize-count') ||
          req.path.startsWith('/report-detailed') ||
          req.path.startsWith('/report-synthetic') ||
          req.path.startsWith('/past-counts') ||
          req.path.startsWith('/reset') ||
          req.path.startsWith('/health')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      const indexPath = path.join(staticDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).json({ error: 'Frontend não construído' });
      }
    } catch (error) {
      console.error('Erro ao servir o frontend:', error);
      res.status(500).json({ error: 'Erro ao servir o frontend' });
    }
  });
}

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno: ' + err.message });
});

app.listen(port, () => console.log(`Servidor na porta ${port}`));