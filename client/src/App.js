import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import CountDetail from "./CountDetail";

function CountList({ counts }) {
  const navigate = useNavigate();

  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Contagens Criadas</h2>
      {counts.length === 0 ? (
        <p>Nenhuma contagem ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {counts.map((count) => (
            <li
              key={count.id}
              style={{
                border: "1px solid #ccc",
                margin: "10px 0",
                padding: "10px",
                cursor: "pointer",
                backgroundColor: "#f9f9f9"
              }}
              onClick={() => navigate(`/contagem/${count.id}`)}
            >
              <strong>{count.title}</strong> — {count.company}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadForm({ onUpload }) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      alert("Preencha o título e selecione um arquivo Excel.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("company", company);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:10000/create-count-from-excel", formData);
      onUpload(res.data);
      setTitle("");
      setCompany("");
      setFile(null);
    } catch (error) {
      alert("Erro ao enviar: " + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} style={{ marginBottom: "30px" }}>
      <h1>Nova Contagem de Estoque</h1>
      <input
        type="text"
        placeholder="Título da contagem"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        style={{ display: "block", marginBottom: "10px", padding: "8px", width: "100%" }}
      />
      <input
        type="text"
        placeholder="Nome da empresa (opcional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ display: "block", marginBottom: "10px", padding: "8px", width: "100%" }}
      />
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
        required
        style={{ display: "block", marginBottom: "10px" }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Criar Contagem"}
      </button>
    </form>
  );
}

function Home() {
  const [counts, setCounts] = useState([]);

  const fetchCounts = async () => {
    try {
      const res = await axios.get("http://localhost:10000/counts");
      setCounts(res.data);
    } catch (err) {
      console.error("Erro ao buscar contagens:", err);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleUploadSuccess = (newCountData) => {
    fetchCounts(); // Atualiza a lista
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <UploadForm onUpload={handleUploadSuccess} />
      <CountList counts={counts} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contagem/:id" element={<CountDetail />} />
      </Routes>
    </Router>
  );
}
