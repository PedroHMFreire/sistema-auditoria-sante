import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
    return <div style={{ color: 'black', background: 'white', minHeight: '100vh' }}>Carregando...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', background: 'white', minHeight: '100vh' }}>{error}</div>;
  }

  return (
    <div style={{ color: 'black', background: 'white', minHeight: '100vh' }}>
      <h1>Contagens Salvas</h1>
      <Link to="/">Voltar para a página inicial</Link>
      {counts.length === 0 ? (
        <p>Nenhuma contagem encontrada.</p>
      ) : (
        <ul>
          {counts.map((count) => {
            try {
              console.log('Renderizando contagem:', count);
              const timestamp = count.timestamp ? new Date(count.timestamp).toLocaleString() : 'Data inválida';
              return (
                <li key={count.id}>
                  {count.title || 'Sem título'} - {timestamp} - Status: {count.status || 'Desconhecido'}
                </li>
              );
            } catch (err) {
              console.error('Erro ao renderizar contagem:', err, count);
              return <li key={count.id}>Erro ao exibir contagem (ID: {count.id})</li>;
            }
          })}
        </ul>
      )}
    </div>
  );
};

export default PastCounts;
