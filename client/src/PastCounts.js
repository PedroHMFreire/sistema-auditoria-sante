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

  if (loading) return <div style={{ color: 'black', background: 'white' }}>Carregando...</div>;
  if (error) return <div style={{ color: 'red', background: 'white' }}>{error}</div>;

  return (
    <div style={{ color: 'black', background: 'white', minHeight: '100vh' }}>
      <h1>Contagens Salvas</h1>
      {counts.length === 0 ? (
        <p>Nenhuma contagem encontrada.</p>
      ) : (
        <ul>
          {counts.map((count) => {
            console.log('Renderizando contagem:', count);
            return (
              <li key={count.id}>
                {count.title} - {new Date(count.timestamp).toLocaleString()} - Status: {count.status}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PastCounts;
