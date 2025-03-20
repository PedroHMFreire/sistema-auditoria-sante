import React, { useState, useEffect, useRef } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import './App.css';

function ActiveCount() {
  const { countId } = useParams();
  const history = useHistory();
  const [systemSummary, setSystemSummary] = useState(null);
  const [countTitle, setCountTitle] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [storeData, setStoreData] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await fetch('/load-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countId: parseInt(countId) }),
        });
        const data = await res.json();
        if (data.message) {
          setSystemSummary({
            totalItems: data.systemData.length,
            totalUnits: data.systemData.reduce((sum, item) => sum + (item.balance || 0), 0),
          });
          setCountTitle(data.countTitle);
          setStoreData(data.storeData || []);
        } else {
          alert(data.error);
          history.push('/past-counts?status=created');
        }
      } catch (error) {
        console.error('Erro ao carregar contagem:', error);
        alert('Erro ao carregar contagem.');
        history.push('/past-counts?status=created');
      }
    };
    loadCount();
  }, [countId, history]);

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
        setStoreData(prev => [...prev, { code: storeCode, quantity: qty }]);
        setStoreCode('');
        setStoreQuantity('');
        // Salvamento automático
        await fetch('/save-count', { method: 'POST' });
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao contar:', error);
      alert('Erro ao contar.');
    }
  };

  const handleFinalize = async () => {
    try {
      const res = await fetch('/report-detailed');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao finalizar contagem:', error);
      alert('Erro ao finalizar contagem.');
    }
  };

  const handlePrintReport = () => window.print();

  const handleSaveReportAsText = () => {
    if (!finalReport) return;
    const reportText = `
Relatório Detalhado - ${finalReport.title}
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
    a.download = `relatorio-detalhado-${finalReport.title}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCloseReport = () => {
    setFinalReport(null);
    history.push('/past-counts?status=finalized');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">AUDITÊ</h1>
        <Link to="/past-counts?status=created" className="nav-link">Voltar</Link>
      </header>
      <main className="App-main">
        <section className="card">
          {!finalReport ? (
            <>
              <h2>Contagem Ativa: {countTitle}</h2>
              {systemSummary ? (
                <>
                  <p>Total de Produtos: {systemSummary.totalItems}</p>
                  <p>Total de Unidades: {systemSummary.totalUnits}</p>
                  <div className="field">
                    <input
                      type="text"
                      value={storeCode}
                      onChange={(e) => setStoreCode(e.target.value)}
                      placeholder="Código do Produto"
                      className="text-input"
                    />
                    <input
                      type="number"
                      value={storeQuantity}
                      onChange={(e) => setStoreQuantity(e.target.value)}
                      placeholder="Quantidade (Opcional)"
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
                    <button onClick={handleFinalize} className="btn primary">
                      Finalizar
                    </button>
                  </div>
                </>
              ) : (
                <p>Carregando contagem...</p>
              )}
            </>
          ) : (
            <div className="report-final" ref={reportRef}>
              <h3 className="no-print">Relatório Detalhado - {finalReport.title}</h3>
              <h3 className="print-only">
                Relatório Detalhado - {finalReport.title}
                <br />Data: ${new Date(finalReport.timestamp).toLocaleString()}
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
                <button onClick={handleCloseReport} className="btn primary">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ActiveCount;