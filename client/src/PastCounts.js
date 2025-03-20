import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PastCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        console.log('Fazendo requisição para /past-counts (sem filtro de status)...');
        const response = await axios.get('/past-counts');
        console.log('Resposta recebida do /past-counts:', response.data);

        if (!Array.isArray(response.data)) {
          throw new Error('Resposta do servidor não é um array');
        }

        setCounts(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar contagens:', err);
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
      {counts.length === 0 ? (
        <p>Nenhuma contagem encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => {
            try {
              console.log('Renderizando contagem:', count);
              const timestamp = count.timestamp ? new Date(count.timestamp).toLocaleString() : 'Data inválida';
              return (
                <li key={count.id} className="past-count-item">
                  <h3>{count.title || 'Sem título'}</h3>
                  <p>Data: {timestamp}</p>
                  <p>Status: {count.status || 'Desconhecido'}</p>
                </li>
              );
            } catch (err) {
              console.error('Erro ao renderizar contagem:', err, count);
              return <li key={count.id} className="past-count-item">Erro ao exibir contagem (ID: {count.id})</li>;
            }
          })}
        </ul>
      )}
    </div>
  );
};

export default PastCounts;