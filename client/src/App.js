import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [initialReport, setInitialReport] = useState(null);
  const [code, setCode] = useState('');
  const [countMessage, setCountMessage] = useState('');
  const [finalReport, setFinalReport] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Verificar estado da contagem ao carregar a página
  useEffect(() => {
    fetch('/count-state')
      .then(res => res.json())
      .then(data => setIsPaused(data.isPaused))
      .catch(err => console.error('Erro ao verificar estado:', err));
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Por favor, selecione um arquivo Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.message) {
        setInitialReport(data.initialReport);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo.');
    }
  };

  const handleCount = async () => {
    if (!code) {
      alert('Por favor, insira um código.');
      return;
    }

    try {
      const res = await fetch('/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.message) {
        setCountMessage(data.message);
        setCode(''); // Limpar o campo após contar
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao contar produto:', error);
      alert('Erro ao contar produto.');
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch('/pause', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setIsPaused(true);
    } catch (error) {
      console.error('Erro ao pausar contagem:', error);
      alert('Erro ao pausar contagem.');
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch('/resume', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setIsPaused(false);
    } catch (error) {
      console.error('Erro ao retomar contagem:', error);
      alert('Erro ao retomar contagem.');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const res = await fetch('/report');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório.');
    }
  };

  const handleExport = async () => {
    try {
      window.location.href = '/export';
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório.');
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setInitialReport(null);
      setFinalReport(null);
      setCountMessage('');
      setCode('');
      setIsPaused(false);
    } catch (error) {
      console.error('Erro ao reiniciar contagem:', error);
      alert('Erro ao reiniciar contagem.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Auditoria Sante</h1>
      </header>

      <main className="App-main">
        {/* Upload da Planilha */}
        <section className="section">
          <h2>Upload</h2>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="file-input"
          />
          <button onClick={handleUpload} className="btn primary">Upload</button>
        </section>

        {/* Relatório Inicial */}
        {initialReport && (
          <section className="section">
            <h2>Relatório Inicial</h2>
            <p>Total de Unidades: {initialReport.totalUnits}</p>
            <p>Total de Itens: {initialReport.totalItems}</p>
          </section>
        )}

        {/* Cadastro de Produto */}
        {initialReport && (
          <section className="section">
            <h2>Cadastro de Produto</h2>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite o código do produto"
              className="input"
              disabled={isPaused}
            />
            <button onClick={handleCount} className="btn primary" disabled={isPaused}>
              Cadastro de Produto
            </button>
            {countMessage && <p className="message">{countMessage}</p>}
          </section>
        )}

        {/* Controles de Contagem */}
        {initialReport && (
          <section className="section controls">
            <button onClick={handlePause} className="btn secondary" disabled={isPaused}>
              Pausar Contagem
            </button>
            <button onClick={handleResume} className="btn secondary" disabled={!isPaused}>
              Retomar Contagem
            </button>
          </section>
        )}

        {/* Relatórios */}
        <section className="section">
          <h2>Relatórios</h2>
          <button onClick={handleGenerateReport} className="btn primary" disabled={!initialReport}>
            Relatórios
          </button>
          {finalReport && (
            <div className="report">
              <h3>Resumo</h3>
              <p>Total de Produtos em Sobra: {finalReport.summary.totalProductsInExcess}</p>
              <p>Total de Produtos Faltantes: {finalReport.summary.totalProductsMissing}</p>
              <p>Total de Produtos Regulares: {finalReport.summary.totalProductsRegular}</p>
              <h3>Detalhes</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th>Saldo em Estoque</th>
                    <th>Contado</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {finalReport.details.map((item, index) => (
                    <tr key={index}>
                      <td>{item.Código}</td>
                      <td>{item.Produto}</td>
                      <td>{item.Saldo_Estoque}</td>
                      <td>{item.Contado}</td>
                      <td>{item.Diferença}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={handleExport} className="btn secondary">
                Exportar para Excel
              </button>
            </div>
          )}
        </section>

        {/* Reiniciar Contagem */}
        <section className="section">
          <h2>Reiniciar Contagem</h2>
          <button onClick={handleReset} className="btn danger">Finalizar Contagem</button>
        </section>
      </main>
    </div>
  );
}

export default App;
