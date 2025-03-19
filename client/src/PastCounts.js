import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import './App.css';

function PastCounts() {
  const [counts, setCounts] = useState([]);
  const [expandedReport, setExpandedReport] = useState(null);
  const reportRef = useRef(null);
  const location = useLocation();
  const history = useHistory();
  const status = new URLSearchParams(location.search).get('status') || '';

  useEffect(() => {
    fetch(`/past-counts?status=${status}`)
      .then(res => res.json())
      .then(data => setCounts(data))
      .catch(err => console.error('Erro ao carregar contagens:', err));
  }, [status]);

  const handleToggleReport = (index) => setExpandedReport(expandedReport === index ? null : index);

  const handlePrintReport = () => window.print();

  const handleStartCount = async (countId) => {
    try {
      const res = await fetch('/load-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countId }),
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        history.push(`/count/${countId}`); // Redireciona para a página da contagem
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao iniciar contagem:', error);
      alert('Erro ao iniciar contagem.');
    }
  };

  const getSectionTitle = () => {
    switch (status) {
      case 'created': return 'CONTAGENS CRIADAS';
      case 'in-progress': return 'CONTAGENS EM ANDAMENTO';
      case 'finalized': return 'CONTAGENS FINALIZADAS';
      default: return 'TODAS AS CONTAGENS';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">Auditê</h1>
        <Link to="/" className="nav-link">Voltar</Link>
      </header>
      <main className="App-main">
        <section className="card">
          <h2>{getSectionTitle()}</h2>
          {counts.length === 0 ? (
            <p>Nenhuma contagem encontrada.</p>
          ) : (
            <ul className="past-counts-list">
              {counts.map((count, index) => (
                <li key={index} className="past-count-item">
                  <h3>
                    {count.title} - {new Date(count.timestamp).toLocaleString()}
                    {count.status === 'created' && <span style={{ color: '#ff6200' }}>(Pré-criada)</span>}
                  </h3>
                  <p>Total de Produtos: {count.systemData.length}</p>
                  <p>Total de Unidades: {count.systemData.reduce((sum, item) => sum + (item.balance || 0), 0)}</p>
                  <p>Total em Sobra: {count.summary.totalProductsInExcess}</p>
                  <p>Total Faltantes: {count.summary.totalProductsMissing}</p>
                  <p>Total Regulares: {count.summary.totalProductsRegular}</p>
                  <div className="count-actions">
                    {count.status === 'created' && (
                      <button
                        className="btn primary"
                        onClick={() => handleStartCount(index)}
                      >
                        Iniciar Contagem
                      </button>
                    )}
                    <button className="btn secondary" onClick={() => handleToggleReport(index)}>
                      {expandedReport === index ? 'Ocultar' : 'Ver Detalhes'}
                    </button>
                  </div>
                  {expandedReport === index && (
                    <div className="report-final" ref={reportRef}>
                      <h3 className="no-print">{count.title}</h3>
                      <h3 className="print-only">
                        {count.type === 'synthetic' ? 'Sintético' : count.type === 'detailed' ? 'Detalhado' : 'Pré-criada'} - {count.title}
                        <br />Data: {new Date(count.timestamp).toLocaleString()}
                      </h3>
                      <p>Total de Produtos: {count.systemData.length}</p>
                      <p>Total de Unidades: {count.systemData.reduce((sum, item) => sum + (item.balance || 0), 0)}</p>
                      <p>Total em Sobra: {count.summary.totalProductsInExcess}</p>
                      <p>Total Faltantes: {count.summary.totalProductsMissing}</p>
                      <p>Total Regulares: {count.summary.totalProductsRegular}</p>
                      <h4>Detalhes</h4>
                      {count.details.length > 0 ? (
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
                            {count.details.map((item, i) => (
                              <tr key={i}>
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
                        <p>{count.status === 'created' ? 'Contagem não iniciada.' : 'Sem discrepâncias.'}</p>
                      )}
                      <div className="report-actions no-print">
                        <button onClick={handlePrintReport} className="btn primary">
                          Imprimir
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default PastCounts;
