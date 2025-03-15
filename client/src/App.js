import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [initialReport, setInitialReport] = useState(null);
  const [code, setCode] = useState('');
  const [countMessage, setCountMessage] = useState('');
  const [finalReport, setFinalReport] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

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
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao contar produto:', error);
      alert('Erro ao contar produto.');
    }
  };

  const handleSave = async () => {
    if (!code) {
      alert('Por favor, insira um código para salvar.');
      return;
    }

    try {
      const res = await fetch('/save-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      alert(data.message);
      setCode('');
    } catch (error) {
      console.error('Erro ao salvar contagem:', error);
      alert('Erro ao salvar contagem.');
    }
  };

  const handleFinalize = async () => {
    try {
      const res = await fetch('/report');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erro ao finalizar contagem:', error);
      alert('Erro ao finalizar contagem.');
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
        {/* Upload */}
        <section className="card">
          <h2>Upload - Estoque em Sistema</h2>
          <div className="field">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="file-input"
            />
            <button onClick={handleUpload} className="btn primary">Upload</button>
          </div>
          {initialReport && (
            <div className="report-initial">
              <h3>Relatório Inicial</h3>
              <p>Total de Unidades: {initialReport.totalUnits}</p>
              <p>Total de Itens: {initialReport.totalItems}</p>
            </div>
          )}
        </section>

        {/* Código do Produto */}
        {initialReport && (
          <section className="card">
            <h2>Código do Produto - Contagem em Loja</h2>
            <div className="field">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código do produto"
                className="text-input"
                disabled={isPaused}
              />
              <button onClick={handleCount} className="btn secondary" disabled={isPaused}>
                Contar
              </button>
            </div>
            {countMessage && <p className="message">{countMessage}</p>}
          </section>
        )}

        {/* Salvar */}
        {initialReport && (
          <section className="card">
            <h2>Salvar Contagem</h2>
            <div className="field">
              <button onClick={handleSave} className="btn primary" disabled={isPaused}>
                Salvar
              </button>
            </div>
          </section>
        )}

        {/* Finalizar */}
        {initialReport && (
          <section className="card">
            <h2>Finalizar Contagem</h2>
            <div className="field">
              <button onClick={handleFinalize} className="btn primary" disabled={isPaused}>
                Finalizar
              </button>
            </div>
            {finalReport && (
              <div className="report-final">
                <h3>Relatório Final</h3>
                <p>Total de Produtos em Sobra: {finalReport.summary.totalProductsInExcess}</p>
                <p>Total de Produtos Faltantes: {finalReport.summary.totalProductsMissing}</p>
                <p>Total de Produtos Regulares: {finalReport.summary.totalProductsRegular}</p>
                <h4>Detalhes</h4>
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
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
