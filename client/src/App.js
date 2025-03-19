import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, Link, useLocation } from 'react-router-dom';
import PastCounts from './PastCounts';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [countTitle, setCountTitle] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [theme, setTheme] = useState('light');
  const [pastCounts, setPastCounts] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [reportType, setReportType] = useState(null);
  const [selectedCountId, setSelectedCountId] = useState(null);
  const [storeData, setStoreData] = useState([]); // Adicionando storeData ao estado
  const reportRef = useRef(null);

  useEffect(() => {
    fetch('/past-counts')
      .then(res => res.json())
      .then(data => setPastCounts(data))
      .catch(err => console.error('Erro ao carregar contagens:', err));
  }, []);

  const handleSystemFileChange = (e) => setSystemFile(e.target.files[0]);

  const handleCreateCount = async () => {
    if (!systemFile) {
      alert('Selecione um arquivo Excel.');
      return;
    }
    const formData = new FormData();
    formData.append('file', systemFile);
    formData.append('title', countTitle || '');
    try {
      const res = await fetch('/create-count-from-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        setSystemFile(null);
        setCountTitle('');
        setSystemSummary({ totalItems: data.systemData.length, totalUnits: data.systemData.reduce((sum, item) => sum + item.balance, 0) });
        setStoreData([]); // Resetando storeData ao criar nova contagem
        fetch('/past-counts').then(res => res.json()).then(data => setPastCounts(data));
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao criar contagem:', error);
      alert('Erro ao criar contagem.');
    }
  };

  const handleUploadSystemExcel = async () => {
    if (!systemFile) {
      alert('Selecione um arquivo Excel.');
      return;
    }
    const formData = new FormData();
    formData.append('file', systemFile);
    try {
      const res = await fetch('/upload-system-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.message) {
        setSystemSummary(data.summary);
        alert(data.message);
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao carregar Excel:', error);
      alert('Erro ao carregar Excel.');
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
        setStoreData(data.storeData || []); // Carregando storeData do backend
        setSelectedCountId(countId);
        alert(data.message);
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
      alert('Erro ao carregar contagem.');
    }
  };

  const handleSetCountTitle = async () => {
    if (!countTitle.trim()) {
      alert('Insira um título.');
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
          fetch('/past-counts').then(res => res.json()).then(data => setPastCounts(data));
        }
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao definir título:', error);
      alert('Erro ao definir título.');
    }
  };

  const handleCountStore = async () => {
    if (!storeCode.trim()) {
      alert('Insira um código.');
      return;
    }
    const qty = storeQuantity.trim() ? parseInt(storeQuantity, 10) : 1;
    if (qty <= 0) {
      alert('Quantidade inválida.');
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
        setStoreData(prev => [...prev, { code: storeCode, quantity: qty }]); // Atualizando storeData localmente
        setStoreCode('');
        setStoreQuantity('');
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao contar:', error);
      alert('Erro ao contar.');
    }
  };

  const handleSaveCount = async () => {
    try {
      const res = await fetch('/save-count', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar.');
    }
  };

  const handleFinalize = () => {
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
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao gerar sintético:', error);
      alert('Erro ao gerar sintético.');
    }
  };

  const handleShowDetailedReport = async () => {
    try {
      const res = await fetch('/report-detailed');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
        setReportType('detailed');
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao gerar detalhado:', error);
      alert('Erro ao gerar detalhado.');
    }
  };

  const handlePrintReport = () => window.print();
  const handleSaveReportAsText = () => {
    if (!finalReport) return;
    const reportText = `
Relatório ${reportType === 'synthetic' ? 'Sintético' : 'Detalhado'} - ${finalReport.title}
Data: ${new Date(finalReport.timestamp).toLocaleString()}

Resumo:
- Total em Sobra: ${finalReport.summary.totalProductsInExcess}
- Total Faltantes: ${finalReport.summary.totalProductsMissing}
- Total Regulares: ${finalReport.summary.totalProductsRegular}

Detalhes:
${finalReport.details.length ? finalReport.details.map(item => `
Código: ${item.Código}
Produto: ${item.Produto}
Saldo: ${item.Saldo_Estoque}
Contado: ${item.Contado}
Diferença: ${item.Diferença}`).join('\n') : 'Sem discrepâncias.'}
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
      setFinalReport(null);
      setReportType(null);
      setSelectedCountId(null);
      setStoreData([]); // Resetando storeData ao reiniciar
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
      alert('Erro ao reiniciar.');
    }
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <Router>
      <div className={`App ${theme}`}>
        <header className="App-header">
          <h1 className="app-title">Auditê</h1>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </header>
        <main className="App-main">
          <Switch>
            <Route path="/" exact>
              <section className="card">
                <h2>COMECE A AUDITAR</h2>
                <p>Carregue aqui o inventário do sistema</p>
                <div className="field">
                  <input type="file" accept=".xlsx, .xls" onChange={handleSystemFileChange} className="file-input" />
                  <input
                    type="text"
                    value={countTitle}
                    onChange={(e) => setCountTitle(e.target.value)}
                    placeholder="TÍTULO DA CONTAGEM (Produto, Loja, Data)"
                    className="text-input"
                  />
                  <button onClick={handleCreateCount} className="btn primary">
                    Iniciar Auditoria
                  </button>
                </div>
                {systemSummary && (
                  <>
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
                    <p className="count-info">
                      Último produto cadastrado: {storeMessage.split(' ')[1] || 'Nenhum'}. Total cadastrado: {storeData.length}
                    </p>
                    <div className="field">
                      <button onClick={handleSaveCount} className="btn secondary">
                        Salvar
                      </button>
                      <button onClick={handleFinalize} className="btn primary">
                        Finalizar
                      </button>
                    </div>
                  </>
                )}
              </section>
              <section className="card">
                <h2>ÚLTIMAS CONTAGENS</h2>
                <div className="count-categories">
                  <Link to="/past-counts?status=created" className="category-link">
                    CONTAGENS CRIADAS
                  </Link>
                  <Link to="/past-counts?status=in-progress" className="category-link">
                    CONTAGENS EM ANDAMENTO
                  </Link>
                  <Link to="/past-counts?status=finalized" className="category-link">
                    CONTAGENS FINALIZADAS
                  </Link>
                </div>
              </section>
              {finalReport && (
                <section className="card report-final" ref={reportRef}>
                  <h3 className="no-print">
                    {reportType === 'synthetic' ? 'Relatório Sintético' : 'Relatório Detalhado'} - {finalReport.title}
                  </h3>
                  <h3 className="print-only">
                    {reportType === 'synthetic' ? 'Relatório Sintético' : 'Relatório Detalhado'} - {finalReport.title}
                    <br />Data: {new Date(finalReport.timestamp).toLocaleString()}
                  </h3>
                  <p>Total em Sobra: {finalReport.summary.totalProductsInExcess}</p>
                  <p>Total Faltantes: {finalReport.summary.totalProductsMissing}</p>
                  <p>Total Regulares: {finalReport.summary.totalProductsRegular}</p>
                  <h4>Detalhes</h4>
                  {finalReport.details.length > 0 ? (
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Produto</th>
                          <th>Saldo</th>
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
                    <p>Sem discrepâncias.</p>
                  )}
                  <div className="report-actions no-print">
                    <button onClick={handlePrintReport} className="btn primary">
                      Imprimir
                    </button>
                    <button onClick={handleSaveReportAsText} className="btn secondary">
                      Salvar como Texto
                    </button>
                  </div>
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
