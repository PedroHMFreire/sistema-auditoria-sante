const express = require("express");
const app = express();
const port = process.env.PORT || 10000;
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const COUNTS_FILE = path.join(__dirname, "counts.json");

// Inicializar pasta de uploads
async function initializeUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const files = await fs.readdir(UPLOAD_DIR);
    for (const file of files) {
      await fs.unlink(path.join(UPLOAD_DIR, file));
    }
  } catch (error) {
    console.error("Erro ao inicializar diretório de uploads:", error);
  }
}
initializeUploadDir();

// Carregar e salvar contagens
async function loadCounts() {
  try {
    const data = await fs.readFile(COUNTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}
async function saveCounts(counts) {
  try {
    await fs.writeFile(COUNTS_FILE, JSON.stringify(counts, null, 2));
  } catch (error) {
    console.error("Erro ao salvar contagens:", error);
  }
}

// Inicializar contagens
let counts = [];
(async () => {
  counts = await loadCounts();
})();

// Upload Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) =>
    file.mimetype.includes("excel") ||
    file.originalname.endsWith(".xlsx") ||
    file.originalname.endsWith(".xls")
      ? cb(null, true)
      : cb(new Error("Apenas arquivos Excel são permitidos")),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Helpers
function normalizeColumnName(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}
function extractNumericCode(code) {
  return code ? code.toString().replace(/[^0-9]/g, "") : "";
}

// ROTA 1: Upload e criação de contagem
app.post("/create-count-from-excel", upload.single("file"), async (req, res) => {
  try {
    const { title, company } = req.body;
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[0].map(normalizeColumnName);
    const codeCol = headers.indexOf("codigo");
    const productCol = headers.indexOf("produto");
    let balanceCol = headers.indexOf("saldo");
    if (balanceCol === -1) balanceCol = headers.indexOf("saldo_estoque");

    if (codeCol === -1 || productCol === -1 || balanceCol === -1)
      return res.status(400).json({ error: "Planilha inválida." });

    const systemData = rawData.slice(1).map((row) => {
      const code = extractNumericCode(row[codeCol]);
      const product = String(row[productCol] || "").trim();
      const balance = parseFloat(row[balanceCol]) || 0;
      return code && product ? { code, product, balance } : null;
    }).filter(Boolean);

    const newCount = {
      id: counts.length + 1,
      title: title || "Sem título",
      company: company || "Sem empresa",
      timestamp: new Date().toISOString(),
      type: "pre-created",
      system_data: systemData,
      store_data: [],
      summary: {},
      status: "created",
    };
    counts.push(newCount);
    await saveCounts(counts);
    await fs.unlink(req.file.path);
    res.json({ message: "Contagem criada!", countId: newCount.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROTA 2: Adição de item contado
app.post("/count-store", async (req, res) => {
  const { code, quantity, countId } = req.body;
  const count = counts.find((c) => c.id === parseInt(countId));
  if (!count) return res.status(400).json({ error: "Contagem não encontrada." });

  const existing = count.store_data.find((p) => p.code === code);
  if (existing) existing.quantity += parseInt(quantity);
  else count.store_data.push({ code, quantity: parseInt(quantity) });

  const systemItem = count.system_data.find((p) => p.code === code);
  const balance = systemItem?.balance || 0;
  const difference = parseInt(quantity) - balance;

  let status = "Regular";
  if (difference > 0) status = "Excesso";
  else if (difference < 0) status = "Falta";

  count.store_data.find((p) => p.code === code).status = status;
  await saveCounts(counts);
  res.json({ message: "Produto registrado!", status });
});

// ✅ ROTA 3: Listar todas as contagens
app.get("/counts", async (req, res) => {
  res.json(counts.filter((c) => c.status !== "finalized"));
});

// ✅ ROTA 4: Obter uma contagem específica
app.get("/count/:id", async (req, res) => {
  const count = counts.find((c) => c.id === parseInt(req.params.id));
  if (!count) return res.status(404).json({ error: "Contagem não encontrada" });
  res.json(count);
});

// ✅ ROTA 5: Finalizar contagem
app.put("/count/:id/finalize", async (req, res) => {
  const count = counts.find((c) => c.id === parseInt(req.params.id));
  if (!count) return res.status(404).json({ error: "Contagem não encontrada" });

  count.status = "finalized";
  await saveCounts(counts);
  res.json({ message: "Contagem finalizada!" });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
