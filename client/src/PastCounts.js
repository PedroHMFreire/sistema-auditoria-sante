import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function PastCounts() {
  const [pastCounts, setPastCounts] = useState([]);
  const [expandedReport, setExpandedReport] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    fetch('/past-counts')
      .then(res => res.json())
      .then(data => setPastCounts(data))
      .catch(err => console.error('Erro ao carregar contagens passadas:', err));
  }, []);

  const handleToggleReport = (index) => {
    setExpandedReport(expandedReport === index ? null : index);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Auditoria Sante</h1>
        <nav>
          <Link to="/" className="nav-link">Nova Contagem</Link>
          <Link to="/past-counts" className="nav-link">Contagens Passadas</Link>
        </nav>
      </header>

      <main className="App-main">
        <section className="card">
          <h2>Contagens Passadas</h2>
          {pastCounts.length === 0 ? (
            <p>Nenhuma contagem realizada ainda.</p>
          ) : (
            <ul className="past-counts-list">
              {pastCounts.map((count, index) => (
                <li key={index} className="past-count-item">
                  <h3>{count.title} - {new Date(count.timestamp).toLocaleString()} {count.type === 'pre-created' && <span style={{ color: '#34a853' }}>(Pré-criada)</span>}</h3>
                  <p>Total em Sobra: {count.summary.totalProductsInExcess}</p>
                  <p>Total Faltantes: {count.summary.totalProductsMissing}</p>
                  <p>Total Regulares: {count.summary.totalProductsRegular}</p>
                  <button
                    className="btn secondary"
                    onClick={() => handleToggleReport(index)}
                  >
                    {expandedReport === index ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                  </button>
                  {expandedReport === index && (
                    <div className="report-final" ref={reportRef}>
                      <h3 className="no-print">{count.title}</h3>
                      <h3 className="print-only">
                        {count.type === 'synthetic' ? 'Relatório Sintético' : count.type === 'detailed' ? 'Relatório Detalhado' : 'Contagem Pré-criada'} - {count.title}
                        <br />
                        Data: {new Date(count.timestamp).toLocaleString()}
                      </h3>
                      <p>Total de Produtos em Sobra: {count.summary.totalProductsInExcess}</p>
                      <p>Total de Produtos Faltantes: {count.summary.totalProductsMissing}</p>
                      <p>Total de Produtos Regulares: {count.summary.totalProductsRegular}</p>
                      <h4>Detalhes</h4>
                      {count.details.length > 0 ? (
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
                            {count.details.map((item, itemIndex) => (
                              <tr key={itemIndex}>
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
                        <p>{count.type === 'pre-created' ? 'Contagem ainda não iniciada.' : 'Nenhum produto com discrepâncias encontrado.'}</p>
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
