import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PastCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts?status=finalized');
        if (!Array.isArray(response.data)) {
          throw new Error('Resposta do servidor não é um array');
        }
        setCounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagens: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  if (loading) {
    return <div className="card">Carregando...</div>;
  }

  if (error) {
    return <div className="card" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="card">
      <h2>Contagens Finalizadas</h2>
      {counts.length === 0 ? (
        <p>Nenhuma contagem finalizada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => {
            const timestamp = count.timestamp
              ? new Date(count.timestamp).toLocaleString()
              : 'Data inválida';
            return (
              <li key={count.id} className="past-count-item">
                <h3>{count.title || 'Sem título'}</h3>
                <p>Data de Finalização: {timestamp}</p>
                <p>Produtos em Excesso: {count.summary?.totalProductsInExcess || 0}</p>
                <p>Produtos Faltando: {count.summary?.totalProductsMissing || 0}</p>
                <p>Produtos Regulares: {count.summary?.totalProductsRegular || 0}</p>
                <div className="report-actions">
                  <a
                    href={`/report-detailed?countId=${count.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                  >
                    Relatório Detalhado
                  </a>
                  <a
                    href={`/report-synthetic?countId=${count.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn secondary"
                  >
                    Relatório Sintético
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PastCounts;