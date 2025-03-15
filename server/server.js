const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Configurar CORS
app.use(cors());
app.use(express.json());

// Configurar diretórios
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

// Garantir que os diretórios existam
[UPLOAD_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Arquivos para armazenar dados persistentes
const CURRENT_DATA_FILE = path.join(DATA_DIR, 'current-inventory-data.json');
const SAVED_COUNTS_FILE = path.join(DATA_DIR, 'saved-counts.json');

// Estado do aplicativo
let systemData = []; // Lista de produtos no sistema: [{code: "140066", product: "BONE SANTE PRETO", balance: 50}]
let storeData = [];  // Lista de contagens atuais: [{code: "140066", quantity: 5}, ...]
let currentTitle = ''; // Título da contagem atual

// Carregar dados salvos se existirem
function loadCurrentData() {
  try {
    if (fs.existsSync(CURRENT_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(CURRENT_DATA_FILE, 'utf8'));
      systemData = data.systemData || [];
      storeData = data.storeData || [];
      currentTitle = data.currentTitle || '';
      console.log('Dados atuais carregados do arquivo');
    }
  } catch (error) {
    console.error('Erro ao carregar dados atuais:', error);
  }
}

// Carregar contagens salvas
let savedCounts = [];
function loadSavedCounts() {
  try {
    if (fs.existsSync(SAVED_COUNTS_FILE)) {
      savedCounts = JSON.parse(fs.readFileSync(SAVED_COUNTS_FILE, 'utf8'));
      console.log('Contagens salvas carregadas do arquivo');
    }
  } catch (error) {
    console.error('Erro ao carregar contagens salvas:', error);
  }
}

// Salvar dados atuais
function saveCurrentData() {
  try {
    const data = { systemData, storeData, currentTitle };
    fs.writeFileSync(CURRENT_DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Dados atuais salvos em arquivo');
  } catch (error) {
    console.error('Erro ao salvar dados atuais:', error);
  }
}

// Salvar contagens finalizadas
function saveSavedCounts() {
  try {
    fs.writeFileSync(SAVED_COUNTS_FILE, JSON.stringify(savedCounts, null, 2));
    console.log('Contagens salvas atualizadas');
  } catch (error) {
    console.error('Erro ao salvar contagens:', error);
  }
}

// Carregar dados iniciais
loadCurrentData();
loadSavedCounts();

// Configuração de upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes('excel') ||
      file.mimetype.includes('spreadsheetml') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.txt')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel ou texto são permitidos'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
});

// Função para normalizar nomes de colunas
function normalizeColumnName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// Rota para upload de planilha Excel do sistema
app.post('/upload-system-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia' });
    }

    const headers = rawData[0].map(header => normalizeColumnName(header));
    const expectedColumns = ['codigo', 'produto', 'saldo', 'saldo_estoque'];

    const codeCol = headers.indexOf('codigo');
    const productCol = headers.indexOf('produto');
    let balanceCol = headers.indexOf('saldo');
    if (balanceCol === -1) balanceCol = headers.indexOf('saldo_estoque');

    if (codeCol === -1 || productCol === -1 || balanceCol === -1) {
      return res.status(400).json({
        error: 'Formato de planilha inválido. Colunas esperadas: Código, Produto, Saldo (ou Saldo_Estoque)',
      });
    }

    systemData = rawData.slice(1).map(row => ({
      code: row[codeCol] ? row[codeCol].toString() : '',
      product: row[productCol] || '',
      balance: parseFloat(row[balanceCol]) || 0,
    })).filter(item => item.code && item.product);

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada na planilha' });
    }

    saveCurrentData();

    const totalItems = systemData.length;
    const totalUnits = systemData.reduce((sum, item) => sum + item.balance, 0);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Erro ao excluir arquivo temporário:', err);
    });

    res.status(200).json({
      message: 'Dados do sistema carregados com sucesso!',
      summary: {
        totalItems,
        totalUnits,
      },
    });
  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

// Rota para upload de arquivo de texto do sistema
app.post('/upload-system-text', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    systemData = fileContent
      .trim()
      .split('\n')
      .map(line => {
        const [code, ...rest] = line.trim().split(/\s+/);
        const balance = parseFloat(rest.pop()) || 0;
        const product = rest.join(' ');
        return { code, product, balance };
      })
      .filter(item => item.code && item.product);

    if (systemData.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada no arquivo de texto' });
    }

    saveCurrentData();

    const totalItems = systemData.length;
    const totalUnits = systemData.reduce((sum, item) => sum + item.balance, 0);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Erro ao excluir arquivo temporário:', err);
    });

    res.status(200).json({
      message: 'Dados do sistema carregados com sucesso!',
      summary: {
        totalItems,
        totalUnits,
      },
    });
  } catch (error) {
    console.error('Erro ao processar arquivo de texto:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo de texto: ' + error.message });
  }
});

// Rota para adicionar código da loja com quantidade (opcional)
app.post('/count-store', (req, res) => {
  try {
    const { code, quantity } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código inválido' });
    }
    const qty = parseInt(quantity, 10) || 1; // Assume 1 se quantidade estiver em branco
    if (qty <= 0) {
      return res.status(400).json({ error: 'Quantidade inválida. Deve ser maior que 0.' });
    }

    storeData.push({ code, quantity: qty });
    saveCurrentData();

    res.status(200).json({ message: `Código ${code} adicionado com quantidade ${qty}` });
  } catch (error) {
    console.error('Erro ao adicionar código da loja:', error);
    res.status(500).json({ error: 'Erro ao adicionar código: ' + error.message });
  }
});

// Rota para salvar contagem parcial
app.post('/save-count', (req, res) => {
  try {
    if (!currentTitle) {
      return res.status(400).json({ error: 'Por favor, defina um título para a contagem antes de salvar.' });
    }
    if (systemData.length === 0 || storeData.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado de sistema ou contagem disponível para salvar.' });
    }

    const countId = Date.now().toString(); // ID único baseado no timestamp
    const savedCount = {
      id: countId,
      title: currentTitle,
      systemData: [...systemData],
      storeData: [...storeData],
      timestamp: new Date().toISOString(),
    };
    savedCounts.push(savedCount);
    saveSavedCounts();

    res.status(200).json({ message: 'Contagem salva com sucesso', countId });
  } catch (error) {
    console.error('Erro ao salvar contagem:', error);
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

// Função para gerar relatório (usada por ambas as rotas)
function generateReport(filterDifferences = false) {
  if (systemData.length === 0) {
    throw new Error('Nenhum dado do sistema fornecido');
  }

  // Contar ocorrências dos códigos na loja
  const storeCount = {};
  storeData.forEach(entry => {
    storeCount[entry.code] = (storeCount[entry.code] || 0) + entry.quantity;
  });

  let productsInExcess = 0;
  let productsMissing = 0;
  let productsRegular = 0;

  // Comparar códigos
  let reportDetails = systemData.map(item => {
    const counted = storeCount[item.code] || 0;
    const expected = item.balance;
    const difference = counted - expected;

    if (difference === 0) {
      productsRegular++;
    } else if (difference > 0) {
      productsInExcess += difference;
    } else if (difference < 0) {
      productsMissing += Math.abs(difference);
    }

    return {
      Código: item.code,
      Produto: item.product,
      Saldo_Estoque: expected,
      Contado: counted,
      Diferença: difference,
    };
  });

  // Identificar códigos contados na loja que não estão no sistema
  const systemCodes = new Set(systemData.map(item => item.code));
  const unknownProducts = Object.keys(storeCount).filter(code => !systemCodes.has(code));
  unknownProducts.forEach(code => {
    const counted = storeCount[code];
    productsInExcess += counted;
    reportDetails.push({
      Código: code,
      Produto: 'Desconhecido (não está no sistema)',
      Saldo_Estoque: 0,
      Contado: counted,
      Diferença: counted,
    });
  });

  // Filtrar apenas produtos com diferença != 0 para o relatório sintético
  if (filterDifferences) {
    reportDetails = reportDetails.filter(item => item.Diferença !== 0);
  }

  return {
    title: currentTitle,
    summary: {
      totalProductsInExcess: productsInExcess,
      totalProductsMissing: productsMissing,
      totalProductsRegular: productsRegular,
    },
    details: reportDetails,
  };
}

// Rota para relatório detalhado (todos os produtos)
app.get('/report-detailed', (req, res) => {
  try {
    const report = generateReport(false);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório detalhado: ' + error.message });
  }
});

// Rota para relatório sintético (apenas produtos com diferença)
app.get('/report-synthetic', (req, res) => {
  try {
    const report = generateReport(true);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório sintético:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório sintético: ' + error.message });
  }
});

// Rota para listar contagens salvas
app.get('/get-counts', (req, res) => {
  try {
    res.status(200).json(savedCounts);
  } catch (error) {
    console.error('Erro ao listar contagens:', error);
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});

// Rota para recuperar relatório de uma contagem específica
app.get('/get-count-report/:id', (req, res) => {
  try {
    const { id } = req.params;
    const count = savedCounts.find(c => c.id === id);
    if (!count) {
      return res.status(404).json({ error: 'Contagem não encontrada' });
    }

    // Recriar o estado temporário para gerar o relatório
    systemData = count.systemData;
    storeData = count.storeData;
    currentTitle = count.title;
    const report = generateReport(false); // Detalhado por padrão
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao recuperar relatório:', error);
    res.status(500).json({ error: 'Erro ao recuperar relatório: ' + error.message });
  }
});

// Rota para reiniciar contagem
app.post('/reset', (req, res) => {
  try {
    systemData = [];
    storeData = [];
    currentTitle = '';
    saveCurrentData();
    res.status(200).json({ message: 'Dados reiniciados com sucesso' });
  } catch (error) {
    console.error('Erro ao reiniciar contagem:', error);
    res.status(500).json({ error: 'Erro ao reiniciar contagem: ' + error.message });
  }
});

// Rota para definir o título da contagem
app.post('/set-title', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Título inválido' });
    }
    currentTitle = title;
    saveCurrentData();
    res.status(200).json({ message: 'Título definido com sucesso' });
  } catch (error) {
    console.error('Erro ao definir título:', error);
    res.status(500).json({ error: 'Erro ao definir título: ' + error.message });
  }
});

// Rota para verificar status do servidor
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    systemDataCount: systemData.length,
    storeDataCount: storeData.length,
    savedCountsCount: savedCounts.length,
  });
});

// Servir arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../client/build');
  app.use(express.static(staticDir));

  app.get('*', (req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).json({
        error: 'Frontend não foi construído corretamente',
        message: 'A pasta /client/build não foi encontrada. Verifique se o build do frontend foi executado no deploy.',
      });
    }
  });
}

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado' : err.message,
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Manipular interrupções para salvar dados antes de encerrar
process.on('SIGINT', () => {
  console.log('Servidor encerrando, salvando dados...');
  saveCurrentData();
  saveSavedCounts();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Servidor encerrando, salvando dados...');
  saveCurrentData();
  saveSavedCounts();
  process.exit(0);
});
