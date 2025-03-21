import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const CreatedCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts?status=created');
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
      <button onClick={() => navigate(-1)} className="btn-back">
        Voltar
      </button>
      <h2>Contagens Criadas</h2>
      {counts.length === 0 ? (
        <p>Nenhuma contagem criada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => (
            <li key={count.id} className="past-count-item">
              <Link to={`/count/${count.id}`} className="count-link">
                <h3>{count.title || 'Contagem sem título'}</h3>
              </Link>
              <p><strong>Data:</strong> {new Date(count.timestamp).toLocaleString()}</p>
              <p><strong>Total de Itens:</strong> {count.system_data?.length || 0}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CreatedCounts;
