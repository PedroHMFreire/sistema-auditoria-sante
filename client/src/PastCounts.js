import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const PastCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts?status=finalized');
        setCounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagens: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const handleReset = async () => {
    try {
      await axios.post('/reset');
      setCounts([]);
      alert('Dados reiniciados com sucesso!');
    } catch (err) {
      alert('Erro ao reiniciar: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="card">Carregando...</div>;
  }

  if (error) {
    return <div className="card" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="card">
      <button onClick={() => navigate(-1)} className="btn-back">
        Voltar
      </button>
      <h2>Contagens Finalizadas</h2>
      {counts.length === 0 ? (
        <p>Nenhuma contagem finalizada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => (
            <li key={count.id} className="past-count-item">
              <h3>{count.title || 'Contagem sem título'}</h3>
              <p><strong>Data:</strong> {new Date(count.timestamp).toLocaleString()}</p>
              <p><strong>Produtos em Excesso:</strong> {count.summary?.totalProductsInExcess || 0}</p>
              <p><strong>Produtos Faltando:</strong> {count.summary?.totalProductsMissing || 0}</p>
              <p><strong>Produtos Regulares:</strong> {count.summary?.totalProductsRegular || 0}</p>
              <div className="report-actions">
                <a href={`/report-detailed?countId=${count.id}`} target="_blank" className="btn primary">
                  Relatório Detalhado
                </a>
                <a href={`/report-synthetic?countId=${count.id}`} target="_blank" className="btn primary">
                  Relatório Sintético
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="count-actions">
        <button onClick={handleReset} className="btn primary">
          Reiniciar Dados
        </button>
      </div>
    </div>
  );
};

export default PastCounts;
