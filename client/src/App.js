import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import PastCounts from './PastCounts';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [countTitle, setCountTitle] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [reportType, setReportType] = useState(null);
  const [pastCounts, setPastCounts] = useState([]);
  const [selectedCountId, setSelectedCountId] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    fetch('/past-counts')
      .then(res => res.json())
      .then(data => setPastCounts(data))
      .catch(err => console.error('Erro ao carregar contagens passadas:', err));
  }, []);

  const handleSystemFileChange = (e) => {
    setSystemFile(e.target.files[0]);
  };

  const handleCreateCountFromExcel = async () => {
    if (!systemFile) {
      alert('Por favor, selecione um arquivo Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', systemFile);
    formData.append('title', countTitle || '');

    try {
      const res = await fetch('/create-count-from-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        setSystemFile(null);
        setCountTitle('');
        fetch('/past-counts')
          .then(res => res.json())
          .then(data => setPastCounts(data));
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao criar contagem a partir de Excel:', error);
      alert('Erro ao criar contagem.');
    }
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

  const handleLoadCount = async (countId) => {
    try {
      const res = await fetch('/load-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countId }),
      });
      const data = await res.json();
      if (data.message) {
        setSystemSummary({ totalItems: data.systemData.length, totalUnits: data.systemData.reduce((sum, item) => sum + item.balance, 0) });
        setCountTitle(data.countTitle);
        setSelectedCountId(countId);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
      alert('Erro ao carregar contagem.');
    }
  };

  const handleSetCountTitle = async () => {
    if (!countTitle.trim()) {
      alert('Por favor, insira um título para a contagem.');
      return;
    }

    try {
      const res = await fetch('/set-count-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: countTitle }),
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        if (selectedCountId !== null) {
          pastCounts[selectedCountId].title = countTitle;
          fetch('/past-counts')
            .then(res => res.json())
            .then(data => setPastCounts(data));
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao definir título:', error);
      alert('Erro ao definir título.');
    }
  };

  const handleCountStore = async () => {
    if (!storeCode.trim()) {
      alert('Por favor, insira um código da loja.');
      return;
    }
    const qty = storeQuantity.trim() ? parseInt(storeQuantity, 10) : 1; // Padrão 1 se em branco
    if (qty <= 0) {
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

  const handleSaveCount = async () => {
    try {
      const res = await fetch('/save-count', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error('Erro ao salvar contagem:', error);
      alert('Erro ao salvar contagem.');
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

  const handlePrintReport = () => {
    window.print();
  };

  const handleSaveReportAsText = () => {
    if (!finalReport) return;

    const reportText = `
Relatório ${reportType === 'synthetic' ? 'Sintético' : 'Detalhado'} - ${finalReport.title}
Data: ${new Date(finalReport.timestamp).toLocaleString()}

Resumo:
- Total de Produtos em Sobra: ${finalReport.summary.totalProductsInExcess}
- Total de Produtos Faltantes: ${finalReport.summary.totalProductsMissing}
- Total de Produtos Regulares: ${finalReport.summary.totalProductsRegular}

Detalhes:
${finalReport.details.length > 0 ? finalReport.details.map(item => `
Código: ${item.Código}
Produto: ${item.Produto}
Saldo em Estoque: ${item.Saldo_Estoque}
Contado: ${item.Contado}
Diferença: ${item.Diferença}
`).join('\n') : 'Nenhum produto com discrepâncias encontrado.'}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${reportType}-${finalReport.title}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setSystemFile(null);
      setSystemSummary(null);
      setCountTitle('');
      setStoreCode('');
      setStoreQuantity('');
      setStoreMessage('');
      setShowReportOptions(false);
      setFinalReport(null);
      setReportType(null);
      setSelectedCountId(null);
    } catch (error) {
      console.error('Erro ao reiniciar contagem:', error);
      alert('Erro ao reiniciar contagem.');
    }
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Sistema de Auditoria Sante</h1>
          <nav>
            <Link to="/" className="nav-link">Nova Contagem</Link>
            <Link to="/past-counts" className="nav-link">Contagens Passadas</Link>
          </nav>
        </header>

        <main className="App-main">
          <Switch>
            <Route path="/" exact>
              {/* Criar Contagem Prévia */}
              <section className="card">
                <h2>Criar Contagem Prévia</h2>
                <p>Carregue um arquivo Excel com o estoque para criar uma contagem prévia (opcional: adicione um título):</p>
                <div className="field">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleSystemFileChange}
                    className="file-input"
                  />
                  <input
                    type="text"
                    value={countTitle}
                    onChange={(e) => setCountTitle(e.target.value)}
                    placeholder="Título da contagem (opcional)"
                    className="text-input"
                  />
                  <button onClick={handleCreateCountFromExcel} className="btn primary">
                    Criar Contagem
                  </button>
                </div>
              </section>

              {/* Upload de Dados do Sistema (para contagens tradicionais) */}
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

              {/* Carregar ou Definir Título da Contagem */}
              <section className="card">
                <h2>Título da Contagem</h2>
                <p>Carregue uma contagem existente ou defina um novo título:</p>
                <div className="field">
                  <select
                    value={selectedCountId !== null ? selectedCountId : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setSelectedCountId(null);
                        setSystemSummary(null);
                        setCountTitle('');
                      } else {
                        handleLoadCount(parseInt(value));
                      }
                    }}
                    className="text-input"
                  >
                    <option value="">Selecione uma contagem existente</option>
                    {pastCounts.map((count, index) => (
                      <option key={index} value={index}>
                        {count.title} ({count.type === 'pre-created' ? 'Pré-criada' : count.type})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={countTitle}
                    onChange={(e) => setCountTitle(e.target.value)}
                    placeholder="Título da contagem"
                    className="text-input"
                  />
                  <button onClick={handleSetCountTitle} className="btn primary">
                    Definir Título
                  </button>
                </div>
              </section>

              {/* Contagem em Loja */}
              {systemSummary && (
                <section className="card">
                  <h2>Contagem em Loja</h2>
                  <p>Insira o código e a quantidade dos produtos contados na loja (deixe quantidade em branco para 1):</p>
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
                      placeholder="Quantidade (opcional)"
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

              {/* Salvar Contagem */}
              {systemSummary && (
                <section className="card">
                  <h2>Salvar Contagem</h2>
                  <div className="field">
                    <button onClick={handleSaveCount} className="btn secondary">
                      Salvar Contagem
                    </button>
                  </div>
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
                    <div className="report-final" ref={reportRef}>
                      <h3 className="no-print">
                        {reportType === 'synthetic' ? 'Relatório Sintético' : 'Relatório Detalhado'} - {finalReport.title}
                      </h3>
                      <h3 className="print-only">
                        {reportType === 'synthetic' ? 'Relatório Sintético' : 'Relatório Detalhado'} - {finalReport.title}
                        <br />
                        Data: {new Date(finalReport.timestamp).toLocaleString()}
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
                      <div className="report-actions no-print">
                        <button onClick={handlePrintReport} className="btn primary">
                          Imprimir
                        </button>
                        <button onClick={handleSaveReportAsText} className="btn secondary">
                          Salvar como Texto
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </Route>
            <Route path="/past-counts" component={PastCounts} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
