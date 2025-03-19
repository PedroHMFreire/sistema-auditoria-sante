const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

[UPLOAD_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const DATA_FILE = path.join(DATA_DIR, 'inventory-data.json');
const PAST_COUNTS_FILE = path.join(DATA_DIR, 'past-counts.json');

let systemData = [];
let storeData = [];
let countTitle = '';

function loadSavedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      systemData = data.systemData || [];
      storeData = data.storeData || [];
      countTitle = data.countTitle || '';
    }
  } catch (error) {
    console.error('Erro ao carregar dados salvos:', error);
  }
}

let pastCounts = [];
function loadPastCounts() {
  try {
    if (fs.existsSync(PAST_COUNTS_FILE)) {
      pastCounts = JSON.parse(fs.readFileSync(PAST_COUNTS_FILE, 'utf8')) || [];
    }
  } catch (error) {
    console.error('Erro ao carregar contagens passadas:', error);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ systemData, storeData, countTitle }, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

function savePastCounts() {
  try {
    fs.writeFileSync(PAST_COUNTS_FILE, JSON.stringify(pastCounts, null, 2));
  } catch (error) {
    console.error('Erro ao salvar contagens passadas:', error);
  }
}

loadSavedData();
loadPastCounts();

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
  return code.toString().replace(/[^0-9]/g, '');
}

app.post('/create-count-from-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const { title } = req.body;
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
        error: 'Formato de planilha inválido. Colunas esperadas: Código, Produto, Saldo (ou Saldo_Estoque)',
      });
    }

    const systemData = rawData.slice(1).map(row => ({
      code: extractNumericCode(row[codeCol]),
      product: row[productCol] || '',
      balance: parseFloat(row[balanceCol]) || 0,
    })).filter(item => item.code && item.product);

    if (systemData.length === 0) return res.status(400).json({ error: 'Nenhuma linha válida encontrada' });

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

    pastCounts.push(newCount);
    savePastCounts();

    fs.unlink(req.file.path, (err) => err && console.error('Erro ao excluir arquivo:', err));
    res.status(200).json({
      message: 'Contagem pré-criada com sucesso!',
      countId: pastCounts.length - 1,
      systemData, // Retornando systemData na resposta
    });
  } catch (error) {
    console.error('Erro ao criar contagem:', error);
    res.status(500).json({ error: 'Erro ao criar contagem: ' + error.message });
  }
});

app.post('/load-count', (req, res) => {
  try {
    const { countId } = req.body;
    if (countId < 0 || countId >= pastCounts.length) return res.status(400).json({ error: 'ID inválido' });

    const selectedCount = pastCounts[countId];
    systemData = selectedCount.systemData || [];
    storeData = selectedCount.storeData || [];
    countTitle = selectedCount.title;

    saveData();
    res.status(200).json({ message: 'Contagem carregada!', systemData, storeData, countTitle });
  } catch (error) {
    console.error('Erro ao carregar contagem:', error);
    res.status(500).json({ error: 'Erro ao carregar contagem: ' + error.message });
  }
});

app.post('/upload-system-excel', upload.single('file'), (req, res) => {
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

    systemData = rawData.slice(1).map(row => ({
      code: extractNumericCode(row[codeCol]),
      product: row[productCol] || '',
      balance: parseFloat(row[balanceCol]) || 0,
    })).filter(item => item.code && item.product);

    if (systemData.length === 0) return res.status(400).json({ error: 'Nenhuma linha válida encontrada' });

    saveData();
    const totalItems = systemData.length;
    const totalUnits = systemData.reduce((sum, item) => sum + item.balance, 0);

    fs.unlink(req.file.path, (err) => err && console.error('Erro ao excluir arquivo:', err));
    res.status(200).json({ message: 'Dados carregados!', summary: { totalItems, totalUnits } });
  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

app.post('/set-count-title', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Título inválido' });
    countTitle = title.trim();
    saveData();
    res.status(200).json({ message: `Título definido como "${countTitle}"` });
  } catch (error) {
    console.error('Erro ao definir título:', error);
    res.status(500).json({ error: 'Erro ao definir título: ' + error.message });
  }
});

app.post('/count-store', (req, res) => {
  try {
    const { code, quantity } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Código inválido' });
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

    storeData.push({ code: extractNumericCode(code), quantity: qty });
    saveData();

    // Atualizar status para 'in-progress' se ainda não finalizada
    const currentCountIndex = pastCounts.findIndex(c => c.title === countTitle && c.status !== 'finalized');
    if (currentCountIndex !== -1) {
      pastCounts[currentCountIndex].storeData = storeData;
      pastCounts[currentCountIndex].status = 'in-progress';
      savePastCounts();
    }

    res.status(200).json({ message: `Código ${code} adicionado com quantidade ${qty}` });
  } catch (error) {
    console.error('Erro ao adicionar código:', error);
    res.status(500).json({ error: 'Erro ao adicionar código: ' + error.message });
  }
});

app.post('/save-count', (req, res) => {
  try {
    if (storeData.length === 0) return res.status(400).json({ error: 'Nenhuma contagem para salvar' });
    saveData();
    res.status(200).json({ message: 'Contagem salva!' });
  } catch (error) {
    console.error('Erro ao salvar contagem:', error);
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

function generateReport(filterDifferences = false) {
  if (systemData.length === 0) throw new Error('Nenhum dado do sistema');

  const storeCount = storeData.reduce((acc, entry) => {
    acc[entry.code] = (acc[entry.code] || 0) + entry.quantity;
    return acc;
  }, {});

  let productsInExcess = 0;
  let productsMissing = 0;
  let productsRegular = 0;

  const reportDetails = systemData.map(item => {
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

  if (filterDifferences) reportDetails.filter(item => item.Diferença !== 0);

  const report = {
    title: countTitle || 'Contagem sem título',
    timestamp: new Date().toISOString(),
    type: filterDifferences ? 'synthetic' : 'detailed',
    systemData,
    storeData,
    summary: { totalProductsInExcess, totalProductsMissing, totalProductsRegular },
    details: reportDetails,
    status: 'finalized',
  };

  const currentCountIndex = pastCounts.findIndex(c => c.title === countTitle && c.status !== 'finalized');
  if (currentCountIndex !== -1) {
    pastCounts[currentCountIndex] = report;
  } else {
    pastCounts.push(report);
  }
  savePastCounts();

  return report;
}

app.get('/report-detailed', (req, res) => {
  try {
    const report = generateReport(false);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/report-synthetic', (req, res) => {
  try {
    const report = generateReport(true);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório sintético:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/past-counts', (req, res) => {
  try {
    const { status } = req.query;
    let filteredCounts = pastCounts;
    if (status) {
      filteredCounts = pastCounts.filter(c => c.status === status);
    }
    res.status(200).json(filteredCounts);
  } catch (error) {
    console.error('Erro ao listar contagens:', error);
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});

app.post('/reset', (req, res) => {
  try {
    systemData = [];
    storeData = [];
    countTitle = '';
    saveData();
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

process.on('SIGINT', () => { saveData(); savePastCounts(); process.exit(0); });
process.on('SIGTERM', () => { saveData(); savePastCounts(); process.exit(0); });
