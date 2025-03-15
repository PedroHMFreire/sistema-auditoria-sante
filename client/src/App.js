import React, { useState } from 'react';
import './App.css';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [reportType, setReportType] = useState(null);

  const handleSystemFileChange = (e) => {
    setSystemFile(e.target.files[0]);
  };

  const handleUploadSystemExcel = async () => {
    if (!systemFile) {
      alert('Por favor, selecione um arquivo Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', systemFile);

    try {
      const res = await fetch('/upload-system-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        setSystemSummary(data.summary);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo Excel:', error);
      alert('Erro ao fazer upload do arquivo Excel.');
    }
  };

  const handleUploadSystemText = async () => {
    if (!systemFile) {
      alert('Por favor, selecione um arquivo de texto.');
      return;
    }

    const formData = new FormData();
    formData.append('file', systemFile);

    try {
      const res = await fetch('/upload-system-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        setSystemSummary(data.summary);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo de texto:', error);
      alert('Erro ao fazer upload do arquivo de texto.');
    }
  };

  const handleCountStore = async () => {
    if (!storeCode.trim()) {
      alert('Por favor, insira um código da loja.');
      return;
    }
    const qty = parseInt(storeQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor, insira uma quantidade válida maior que 0.');
      return;
    }

    try {
      const res = await fetch('/count-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: storeCode, quantity: qty }),
      });
      const data = await res.json();
      if (data.message) {
        setStoreMessage(data.message);
        setStoreCode('');
        setStoreQuantity('');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar código da loja:', error);
      alert('Erro ao adicionar código da loja.');
    }
  };

  const handleFinalize = () => {
    setShowReportOptions(true);
    setFinalReport(null);
    setReportType(null);
  };

  const handleShowSyntheticReport = async () => {
    try {
      const res = await fetch('/report-synthetic');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
        setReportType('synthetic');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório sintético:', error);
      alert('Erro ao gerar relatório sintético.');
    }
  };

  const handleShowDetailedReport = async () => {
    try {
      const res = await fetch('/report-detailed');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
        setReportType('detailed');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório detalhado:', error);
      alert('Erro ao gerar relatório detalhado.');
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setSystemFile(null);
      setSystemSummary(null);
      setStoreCode('');
      setStoreQuantity('');
      setStoreMessage('');
      setShowReportOptions(false);
      setFinalReport(null);
      setReportType(null);
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
        {/* Upload de Dados do Sistema */}
        <section className="card">
          <h2>Upload de Dados do Sistema</h2>
          <p>Selecione um arquivo Excel (.xlsx, .xls) ou texto (.txt) com os dados do sistema (Código, Produto, Saldo):</p>
          <div className="field">
            <input
              type="file"
              accept=".xlsx, .xls, .txt"
              onChange={handleSystemFileChange}
              className="file-input"
            />
            <button onClick={handleUploadSystemExcel} className="btn primary">
              Upload Excel
            </button>
            <button onClick={handleUploadSystemText} className="btn secondary">
              Upload Texto
            </button>
          </div>
          {systemSummary && (
            <div className="report-initial">
              <h3>Resumo do Sistema</h3>
              <p>Total de Produtos: {systemSummary.totalItems}</p>
              <p>Total de Unidades: {systemSummary.totalUnits}</p>
            </div>
          )}
        </section>

        {/* Contagem em Loja */}
        {systemSummary && (
          <section className="card">
            <h2>Contagem em Loja</h2>
            <p>Insira o código e a quantidade dos produtos contados na loja:</p>
            <div className="field">
              <input
                type="text"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder="Código do produto"
                className="text-input"
              />
              <input
                type="number"
                value={storeQuantity}
                onChange={(e) => setStoreQuantity(e.target.value)}
                placeholder="Quantidade"
                className="text-input"
                min="1"
              />
              <button onClick={handleCountStore} className="btn primary">
                Adicionar
              </button>
            </div>
            {storeMessage && <p className="message">{storeMessage}</p>}
          </section>
        )}

        {/* Finalizar */}
        {systemSummary && (
          <section className="card">
            <h2>Finalizar Contagem</h2>
            <div className="field">
              <button onClick={handleFinalize} className="btn primary">Finalizar</button>
              <button onClick={handleReset} className="btn secondary">Reiniciar</button>
            </div>
            {showReportOptions && (
              <div className="report-options">
                <h3>Escolha o Tipo de Relatório</h3>
                <div className="field">
                  <button onClick={handleShowSyntheticReport} className="btn primary">
                    Relatório Sintético
                  </button>
                  <button onClick={handleShowDetailedReport} className="btn secondary">
                    Relatório Detalhado
                  </button>
                </div>
              </div>
            )}
            {finalReport && (
              <div className="report-final">
                <h3>
                  {reportType === 'synthetic' ? 'Relatório Sintético' : 'Relatório Detalhado'}
                </h3>
                <p>Total de Produtos em Sobra: {finalReport.summary.totalProductsInExcess}</p>
                <p>Total de Produtos Faltantes: {finalReport.summary.totalProductsMissing}</p>
                <p>Total de Produtos Regulares: {finalReport.summary.totalProductsRegular}</p>
                <h4>Detalhes</h4>
                {finalReport.details.length > 0 ? (
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
                ) : (
                  <p>Nenhum produto com discrepâncias encontrado.</p>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
