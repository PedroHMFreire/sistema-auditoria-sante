import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const CreatedCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('https://sistema-audite.onrender.com/past-counts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const onlyActiveCounts = response.data.filter(count => !count.finalized);
      setCounts(onlyActiveCounts);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar contagens: ' + err.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="card">Carregando...</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="card">
      <h3>Contagens Criadas Recentemente</h3>
      {counts.length === 0 ? (
        <p>Nenhuma contagem criada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {counts.map((count) => (
            <li key={count.id} className="past-count-item">
              <Link to={`/count/${count.id}`} className="count-link">
                <h4>{count.title || 'Contagem sem título'}</h4>
              </Link>
              <p><strong>Empresa:</strong> {count.company || 'Sem Empresa'}</p>
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
