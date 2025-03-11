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

// Estado do aplicativo
let inventory = [];
let countedItems = {};

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

// Carregar dados iniciais
loadSavedData();

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
    // Aceitar apenas arquivos Excel
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
    inventory = xlsx.utils.sheet_to_json(sheet);
    
    // Validar se a planilha tem o formato esperado
    if (inventory.length === 0 || !inventory[0].hasOwnProperty('Código') || 
        !inventory[0].hasOwnProperty('Produto') || !inventory[0].hasOwnProperty('Saldo_Estoque')) {
      return res.status(400).json({ 
        error: 'Formato de planilha inválido. É necessário ter colunas: Código, Produto e Saldo_Estoque' 
      });
    }
    
    // Normalizar dados
    inventory = inventory.map(item => ({
      Código: item.Código.toString(),
      Produto: item.Produto,
      Saldo_Estoque: parseFloat(item.Saldo_Estoque) || 0
    }));
    
    // Manter contagens existentes apenas para produtos que ainda existem
    const existingCodes = new Set(inventory.map(item => item.Código));
    for (const code in countedItems) {
      if (!existingCodes.has(code)) {
        delete countedItems[code];
      }
    }
    
    // Salvar dados
    saveData();
    
    // Limpar arquivo temporário
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Erro ao excluir arquivo temporário:', err);
    });
    
    res.status(200).json({ message: 'Planilha carregada com sucesso!' });
  } catch (error) {
    console.error('Erro no upload da planilha:', error);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

// Rota para contar produto
app.post('/count', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de produto inválido' });
    }
    
    // Verificar se o produto existe no inventário
    const product = inventory.find(item => item.Código === code);
    if (!product) {
      return res.status(404).json({ error: `Produto com código ${code} não encontrado no estoque` });
    }
    
    // Incrementar contagem
    countedItems[code] = (countedItems[code] || 0) + 1;
    
    // Salvar dados
    saveData();
    
    res.status(200).json({ 
      message: `Produto ${code} contado: ${countedItems[code]}`,
      productName: product.Produto
    });
  } catch (error) {
