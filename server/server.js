const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const multer = require('multer'); // Para upload de arquivos
const xlsx = require('xlsx'); // Para ler Excel
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Armazenamento em memória (pode ser substituído por SQLite)
let inventory = [];
let countedItems = {};

// Upload da planilha
const upload = multer({ dest: 'uploads/' });
app.post('/upload', upload.single('file'), (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  inventory = xlsx.utils.sheet_to_json(sheet);
  res.send({ message: 'Planilha carregada com sucesso!' });
});

// Registrar contagem
app.post('/count', (req, res) => {
  const { code } = req.body;
  countedItems[code] = (countedItems[code] || 0) + 1;
  res.send({ message: `Produto ${code} contado: ${countedItems[code]}` });
});

// Gerar relatório
app.get('/report', (req, res) => {
  const report = inventory.map(item => ({
    Código: item.Código,
    Produto: item.Produto,
    Saldo_Estoque: item.Saldo_Estoque,
    Contado: countedItems[item.Código] || 0,
    Diferença: (countedItems[item.Código] || 0) - item.Saldo_Estoque
  }));
  res.json(report);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});