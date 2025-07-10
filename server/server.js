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
app.use(express.json({ limit: '10mb' }));

// Configuração do banco de dados
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV !== 'production',
});
const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  company: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });
const Count = sequelize.define('Count', {
  title: DataTypes.STRING,
  company: DataTypes.STRING,
  timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  system_data: DataTypes.JSON,
  store_data: DataTypes.JSON,
  status: { type: DataTypes.STRING, defaultValue: 'created' },
  userId: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: true });

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Conexão com o banco estabelecida com sucesso.');
  } catch (error) {
    console.error('Erro ao conectar ao banco:', error);
  }
})();

const UPLOAD_DIR = path.join(__dirname, 'uploads');

async function initializeUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const files = await fs.readdir(UPLOAD_DIR);
    await Promise.all(files.map(file => fs.unlink(path.join(UPLOAD_DIR, file))));
  } catch (error) {
    console.error('Erro ao inicializar/limpar uploads:', error);
  }
}
initializeUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function normalizeColumnName(name) {
  return name ? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : '';
}

function extractNumericCode(code) {
  return code?.toString().replace(/[^0-9]/g, '') || '';
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token ausente.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: `Token inválido: ${err.message}` });
    req.user = decoded;
    next();
  });
}

app.post('/register', async (req, res) => {
  try {
    const { email, password, company } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ email, password: hashedPassword, company });
    res.status(201).json({ message: 'Registro pendente. Aguarde aprovação.' });
  } catch (error) {
    res.status(400).json({ error: 'Erro no registro: ' + error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)) || !user.approved) {
      return res.status(401).json({ error: 'Credenciais inválidas ou conta não aprovada' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Erro no login: ' + error.message });
  }
});

app.post('/approve-user/:id', async (req, res) => {
  try {
    await User.update({ approved: true }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Usuário aprovado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar usuário: ' + error.message });
  }
});

app.post('/create-count-from-excel', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('Usuário autenticado:', req.user);
    console.log('Arquivo recebido:', req.file);

    if (!req.user?.id) {
      return res.status(403).json({ error: 'Usuário não autenticado corretamente' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { title, company } = req.body || {};
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

    if (!rawData || rawData.length < 2) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Planilha vazia ou inválida' });
    }

    const headers = rawData[0].map(normalizeColumnName);
    const [codeCol, productCol, balanceCol] = ['codigo', 'produto', 'saldo', 'saldo_estoque']
      .map(h => headers.indexOf(h))
      .filter(i => i !== -1);

    if (codeCol === -1 || productCol === -1 || balanceCol === -1) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Formato inválido. A planilha deve conter: codigo, produto, saldo ou saldo_estoque' });
    }

    const systemData = rawData.slice(1)
      .filter(row => row?.length)
      .map(row => {
        const code = extractNumericCode(row[codeCol]);
        const product = (row[productCol] || '').toString().trim();
        const balance = parseFloat(row[balanceCol]) || 0;
        return code && product ? { code, product, balance } : null;
      })
      .filter(Boolean);

    if (systemData.length === 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Nenhum dado válido encontrado' });
    }

    const newCount = {
      title: title || `Contagem-${new Date().toISOString().slice(0, 10)}`,
      company: company || 'Sem Empresa',
      system_data: systemData,
      userId: req.user.id,
    };

    const createdCount = await Count.create(newCount);
    await fs.unlink(req.file.path);
    res.status(201).json({ message: 'Contagem criada com sucesso', countId: createdCount.id, itemCount: systemData.length });
  } catch (error) {
    console.error('Erro ao criar contagem:', error.stack);
    if (req.file?.path) await fs.unlink(req.file.path).catch(err => console.error('Erro ao deletar arquivo:', err));
    res.status(500).json({ error: 'Erro ao criar contagem: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
