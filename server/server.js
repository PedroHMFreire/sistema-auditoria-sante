import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PastCounts = () => {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts');
        setCounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagens');
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Contagens Salvas</h1>
      {counts.length === 0 ? (
        <p>Nenhuma contagem encontrada.</p>
      ) : (
        <ul>
          {counts.map((count, index) => (
            <li key={index}>
              {count.title} - {new Date(count.timestamp).toLocaleString()} - {count.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PastCounts;
