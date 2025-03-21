import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreatedCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts?status=created');
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
      <h2>Contagens Criadas</h2>
      {counts.length === 0 ? (
        <p>Nenhuma contagem criada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => {
            const timestamp = count.timestamp
              ? new Date(count.timestamp).toLocaleString()
              : 'Data inválida';
            const totalItems = count.system_data?.length || 0;
            return (
              <li key={count.id} className="past-count-item">
                <h3>
                  <a
                    href={`/count/${count.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/count/${count.id}`);
                    }}
                    className="count-link"
                  >
                    {count.title || 'Sem título'}
                  </a>
                </h3>
                <p>Data de Criação: {timestamp}</p>
                <p>Total de Itens no Sistema: {totalItems}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CreatedCounts;