const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

app.use(cors());
app.use(express.json());

// Configuração do banco de dados
const sequelize = new Sequelize(process.env.DATABASE_URL);
const User = sequelize.define('User', {
  email: DataTypes.STRING,
  password: DataTypes.STRING,
  company: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
});
const Count = sequelize.define('Count', {
  title: DataTypes.STRING,
  company: DataTypes.STRING,
  timestamp: DataTypes.DATE,
  system_data: DataTypes.JSON,
  store_data: DataTypes.JSON,
  status: DataTypes.STRING,
  userId: DataTypes.INTEGER,
});

// Sincronizar modelos
(async () => {
  await sequelize.sync();
})();

const UPLOAD_DIR = path.join(__dirname, 'uploads');

async function initializeUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const files = await fs.readdir(UPLOAD_DIR);
    for (const file of files) {
      await fs.unlink(path.join(UPLOAD_DIR, file));
    }
  } catch (error) {
    console.error('Erro ao inicializar/limpar uploads:', error);
  }
}

initializeUploadDir();

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
  return code?.toString().replace(/[^0-9]/g, '') || '';
}

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  });
}

app.post('/register', async (req, res) => {
  const { email, password, company } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashedPassword, company });
  res.status(200).json({ message: 'Registro pendente. Aguarde aprovação.' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (user && await bcrypt.compare(password, user.password) && user.approved) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas ou conta não aprovada' });
  }
});

app.post('/request-payment', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const pix = 'seu-pix-aqui'; // Substitua pelo seu Pix
  res.json({ message: `Envie R$ 29,90 para ${pix}. Após confirmação, libere o acesso.`, pix });
});

app.post('/approve-user/:id', async (req, res) => {
  await User.update({ approved: true }, { where: { id: req.params.id } });
  res.json({ message: 'Usuário aprovado' });
});

app.post('/create-count-from-excel', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const { title, company } = req.body;
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[0].map(normalizeColumnName);
    const codeCol = headers.indexOf('codigo');
    const productCol = headers.indexOf('produto');
    let balanceCol = headers.indexOf('saldo');
    if (balanceCol === -1) balanceCol = headers.indexOf('saldo_estoque');

    const systemData = rawData.slice(1).filter(row => row && row.length > 0).map(row => {
      const code = extractNumericCode(row[codeCol]);
      const product = String(row[productCol]).trim();
      const balance = parseFloat(row[balanceCol]) || 0;
      return { code, product, balance };
    }).filter(item => item.code && item.product);

    const newCount = {
      title: title || `Contagem sem título - ${new Date().toISOString().slice(0, 10)}`,
      company: company || 'Sem Empresa',
      timestamp: new Date().toISOString(),
      type: 'pre-created',
      system_data: systemData,
      store_data: [],
      summary: { totalProductsInExcess: 0, totalProductsMissing: 0, totalProductsRegular: 0 },
      status: 'created',
      userId: req.user.id,
    };

    await Count.create(newCount);
    await fs.unlink(req.file.path);
    res.status(200).json({ message: 'Contagem criada com sucesso!', countId: newCount.id, systemData });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar contagem: ' + error.message });
  }
});

app.post('/count-store', authenticateToken, async (req, res) => {
  try {
    const { code, quantity, countId } = req.body;
    const qty = parseInt(quantity, 10) || 1;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });

    count.store_data.push({ code: extractNumericCode(code), quantity: qty, timestamp: new Date().toISOString() });
    await count.save();
    const systemItem = count.system_data.find(item => item.code === extractNumericCode(code));
    const productName = systemItem ? systemItem.product : 'Produto desconhecido';
    const balance = systemItem ? systemItem.balance : 0;
    const difference = qty - balance;
    let status = 'Regular';
    if (difference > 0) status = 'Excesso';
    else if (difference < 0) status = 'Falta';
    res.status(200).json({ message: `Código ${code} adicionado com quantidade ${qty}`, productName, status });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar código: ' + error.message });
  }
});

app.post('/remove-store-item', authenticateToken, async (req, res) => {
  try {
    const { countId, index } = req.body;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count || !count.store_data[index]) return res.status(400).json({ error: 'Item não encontrado' });
    count.store_data.splice(index, 1);
    await count.save();
    res.status(200).json({ message: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover item: ' + error.message });
  }
});

app.post('/edit-store-item', authenticateToken, async (req, res) => {
  try {
    const { countId, index, code, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count || !count.store_data[index]) return res.status(400).json({ error: 'Item não encontrado' });
    count.store_data[index] = { code: extractNumericCode(code), quantity: qty, timestamp: new Date().toISOString() };
    await count.save();
    const systemItem = count.system_data.find(item => item.code === extractNumericCode(code));
    const productName = systemItem ? systemItem.product : 'Produto desconhecido';
    const balance = systemItem ? systemItem.balance : 0;
    const difference = qty - balance;
    let status = 'Regular';
    if (difference > 0) status = 'Excesso';
    else if (difference < 0) status = 'Falta';
    res.status(200).json({ message: `Item ${code} editado com sucesso`, productName, status });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar item: ' + error.message });
  }
});

app.post('/save-count', authenticateToken, async (req, res) => {
  try {
    const { countId } = req.body;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });
    await count.save();
    res.status(200).json({ message: 'Contagem salva!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar contagem: ' + error.message });
  }
});

app.post('/finalize-count', authenticateToken, async (req, res) => {
  try {
    const { countId } = req.body;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count) return res.status(400).json({ error: 'Contagem não encontrada' });
    const report = generateReport(count.system_data, count.store_data, count.title, false);
    count.status = 'finalized';
    count.summary = report.summary;
    count.details = report.details;
    count.timestamp = new Date().toISOString();
    await count.save();
    res.status(200).json({ message: 'Contagem finalizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao finalizar contagem: ' + error.message });
  }
});

function generateReport(systemData, storeData, countTitle, filterDifferences) {
  const storeCount = storeData.reduce((acc, entry) => {
    acc[entry.code] = (acc[entry.code] || 0) + entry.quantity;
    return acc;
  }, {});
  let productsInExcess = 0, productsMissing = 0, productsRegular = 0;
  let reportDetails = systemData.map(item => {
    const counted = storeCount[item.code] || 0;
    const expected = item.balance || 0;
    const difference = counted - expected;
    if (difference === 0) productsRegular++;
    else if (difference > 0) productsInExcess += difference;
    else if (difference < 0) productsMissing += Math.abs(difference);
    return { Código: item.code, Produto: item.product, Saldo_Estoque: expected, Contado: counted, Diferença: difference };
  });
  const unknownProducts = Object.keys(storeCount).filter(code => !systemData.some(item => item.code === code));
  unknownProducts.forEach(code => {
    const counted = storeCount[code];
    productsInExcess += counted;
    reportDetails.push({ Código: code, Produto: 'Desconhecido', Saldo_Estoque: 0, Contado: counted, Diferença: counted });
  });
  if (filterDifferences) reportDetails = reportDetails.filter(item => item.Diferença !== 0);
  return { title: countTitle, timestamp: new Date().toISOString(), summary: { totalProductsInExcess: productsInExcess, totalProductsMissing: productsMissing, totalProductsRegular: productsRegular }, details: reportDetails, status: 'finalized' };
}

app.get('/report-detailed', authenticateToken, async (req, res) => {
  try {
    const { countId } = req.query;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count) return res.status(404).json({ error: 'Contagem não encontrada' });
    const report = generateReport(count.system_data, count.store_data, count.title, false);
    res.status(200).send(/* HTML do relatório com estilos */); // Manter a lógica existente
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/report-synthetic', authenticateToken, async (req, res) => {
  try {
    const { countId } = req.query;
    const count = await Count.findOne({ where: { id: countId, userId: req.user.id } });
    if (!count) return res.status(404).json({ error: 'Contagem não encontrada' });
    const report = generateReport(count.system_data, count.store_data, count.title, true);
    res.status(200).send(/* HTML do relatório com estilos */); // Manter a lógica existente
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

app.get('/past-counts', authenticateToken, async (req, res) => {
  try {
    const counts = await Count.findAll({ where: { userId: req.user.id } });
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});

app.get('/companies', authenticateToken, async (req, res) => {
  try {
    const companies = await User.findAll({ where: { approved: true }, attributes: ['company'] });
    res.status(200).json([...new Set(companies.map(c => c.company).filter(c => c && c !== 'Sem Empresa'))]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar empresas: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../client/build');
  app.use(express.static(staticDir));
  app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno: ' + err.message });
});

app.listen(port, () => console.log(`Servidor na porta ${port}`));
