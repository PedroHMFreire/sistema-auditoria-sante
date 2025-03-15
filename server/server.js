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

// Arquivo para armazenar dados persistentes
const DATA_FILE = path.join(DATA_DIR, 'inventory-data.json');
const STATE_FILE = path.join(DATA_DIR, 'count-state.json');

// Estado do aplicativo
let inventory = [];
let countedItems = {};
let countState = { isPaused: false };

// Função para normalizar nomes de colunas
function normalizeColumnName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// Carregar dados salvos se existirem
function loadSavedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      inventory = data.inventory || [];
      countedItems = data.countedItems || {};
      console.log('Dados carregados do arquivo');
    }
  } catch (error) {
    console.error('Erro ao carregar dados salvos:', error);
  }
}

// Carregar estado da contagem
function loadCountState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      countState = state;
      console.log('Estado da contagem carregado:', countState);
    }
  } catch (error) {
    console.error('Erro ao carregar estado da contagem:', error);
  }
}

// Salvar dados em arquivo
function saveData() {
  try {
    const data = { inventory, countedItems };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Dados salvos em arquivo');
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Salvar estado da contagem
function saveCountState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(countState, null, 2));
    console.log('Estado da contagem salvo:', countState);
  } catch (error) {
    console.error('Erro ao salvar estado da contagem:', error);
  }
}

// Carregar dados iniciais
loadSavedData();
loadCountState();

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
    if (file.mimetype.includes('excel') || 
        file.mimetype.includes('spreadsheetml') ||
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel são permitidos'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
});

// Rota para upload de planilha
app.post('/upload', upload.single('file'), (req, res) => {
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
    const expectedColumns = ['codigo', 'produto', 'saldo_estoque'];

    const missingColumns = expectedColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Formato de planilha inválido. Colunas faltando: ${missingColumns.join(', ')}. Colunas esperadas: Código, Produto, Saldo_Estoque`
      });
    }

    const columnMap = {
      codigo: headers.indexOf('codigo'),
      produto: headers.indexOf('produto'),
      saldo_estoque: headers.indexOf('saldo_estoque')
    };

    inventory = rawData.slice(1).map(row => {
      const normalizedRow = {
        Código: row[columnMap.codigo] ? row[columnMap.codigo].toString() : '',
        Produto: row[columnMap.produto] || '',
        Saldo_Estoque: parseFloat(row[columnMap.saldo_estoque]) || 0
      };
      return normalizedRow;
    }).filter(row => row.Código && row.Produto);

    if (inventory.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada na planilha' });
    }

    countedItems = {};
    saveData();

    const totalUnits = inventory.reduce((sum, item) => sum + item.Saldo_Estoque, 0);
    const totalItems = inventory.length;

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Erro ao excluir arquivo temporário:', err);
    });

    res.status(200).json({ 
      message: 'Planilha carregada com sucesso!',
      initialReport: {
        totalUnits,
        totalItems
      }
    });
  } catch (error) {
    console.error('Erro no upload da planilha:', error);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

// Rota para contar produto
app.post('/count', (req, res) => {
  try {
    if (countState.isPaused) {
      return res.status(400).json({ error: 'Contagem está pausada. Retome a contagem antes de continuar.' });
    }

    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de produto inválido' });
    }
    
    countedItems[code] = (countedItems[code] || 0) + 1;
    saveData();
    
    const product = inventory.find(item => item.Código === code);
    res.status(200).json({ 
      message: `Produto ${code} contado: ${countedItems[code]}`,
      productName: product ? product.Produto : 'Produto não encontrado no estoque'
    });
  } catch (error) {
    console.error('Erro ao contar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Rota para salvar contagem manualmente
app.post('/save-count', (req, res) => {
  try {
    if (countState.isPaused) {
      return res.status(400).json({ error: 'Contagem está pausada. Retome a contagem antes de continuar.' });
    }

    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de produto inválido' });
    }

    saveData();
    
    res.status(200).json({ 
      message: `Contagem do produto ${code} salva com sucesso: ${countedItems[code] || 0}`
    });
  } catch (error) {
    console.error('Erro ao salvar contagem:', error);
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

// Rota para pausar a contagem
app.post('/pause', (req, res) => {
  try {
    countState.isPaused = true;
    saveCountState();
    saveData();
    res.status(200).json({ message: 'Contagem pausada com sucesso' });
  } catch (error) {
    console.error('Erro ao pausar contagem:', error);
    res.status(500).json({ error: 'Erro ao pausar contagem: ' + error.message });
  }
});

// Rota para retomar a contagem
app.post('/resume', (req, res) => {
  try {
    countState.isPaused = false;
    saveCountState();
    res.status(200).json({ message: 'Contagem retomada com sucesso' });
  } catch (error) {
    console.error('Erro ao retomar contagem:', error);
    res.status(500).json({ error: 'Erro ao retomar contagem: ' + error.message });
  }
});

// Rota para verificar o estado da contagem
app.get('/count-state', (req, res) => {
  try {
    res.status(200).json({ isPaused: countState.isPaused });
  } catch (error) {
    console.error('Erro ao verificar estado da contagem:', error);
    res.status(500).json({ error: 'Erro ao verificar estado: ' + error.message });
  }
});

// Rota para gerar relatório final
app.get('/report', (req, res) => {
  try {
    if (inventory.length === 0) {
      return res.status(200).json({ message: 'Nenhum dado disponível para gerar relatório' });
    }
    
    let productsInExcess = 0;
    let productsMissing = 0;
    let productsRegular = 0;

    const reportDetails = inventory.map(item => {
      const counted = countedItems[item.Código] || 0;
      const difference = counted - item.Saldo_Estoque;

      if (difference === 0) {
        productsRegular++;
      } else if (counted > item.Saldo_Estoque) {
        productsInExcess += difference;
      } else if (counted < item.Saldo_Estoque) {
        productsMissing += Math.abs(difference);
      }

      return {
        Código: item.Código,
        Produto: item.Produto,
        Saldo_Estoque: item.Saldo_Estoque,
        Contado: counted,
        Diferença: difference
      };
    });

    const inventoryCodes = new Set(inventory.map(item => item.Código));
    for (const code in countedItems) {
      if (!inventoryCodes.has(code)) {
        productsInExcess += countedItems[code];
        reportDetails.push({
          Código: code,
          Produto: 'Desconhecido (não está no sistema)',
          Saldo_Estoque: 0,
          Contado: countedItems[code],
          Diferença: countedItems[code]
        });
      }
    }

    res.status(200).json({
      summary: {
        totalProductsInExcess: productsInExcess,
        totalProductsMissing: productsMissing,
        totalProductsRegular: productsRegular
      },
      details: reportDetails
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

// Rota para reiniciar contagem
app.post('/reset', (req, res) => {
  try {
    countedItems = {};
    countState.isPaused = false;
    saveData();
    saveCountState();
    res.status(200).json({ message: 'Contagem reiniciada com sucesso' });
  } catch (error) {
    console.error('Erro ao reiniciar contagem:', error);
    res.status(500).json({ error: 'Erro ao reiniciar contagem: ' + error.message });
  }
});

// Rota para verificar status do servidor
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    inventoryCount: inventory.length,
    countedItemsCount: Object.keys(countedItems).length
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
        message: 'A pasta /client/build não foi encontrada. Verifique se o build do frontend foi executado no deploy.'
      });
    }
  });
}

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado' : err.message
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Manipular interrupções para salvar dados antes de encerrar
process.on('SIGINT', () => {
  console.log('Servidor encerrando, salvando dados...');
  saveData();
  saveCountState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Servidor encerrando, salvando dados...');
  saveData();
  saveCountState();
  process.exit(0);
});
