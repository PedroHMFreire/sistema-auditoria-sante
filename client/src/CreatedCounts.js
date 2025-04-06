import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const CreatedCounts = () => {
  const [counts, setCounts] = useState([]);
  const [filteredCounts, setFilteredCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get('/past-counts?status=created');
        setCounts(response.data);
        setFilteredCounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagens: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    let filtered = counts;

    if (companyFilter) {
      filtered = filtered.filter(count =>
        count.company && count.company.toLowerCase().includes(companyFilter.toLowerCase())
      );
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(count => {
        const countDate = new Date(count.timestamp);
        return countDate >= start && countDate <= end;
      });
    }

    setFilteredCounts(filtered);
  }, [companyFilter, startDate, endDate, counts]);

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
      <div className="filter-section">
        <div className="field">
          <label>Filtrar por Empresa:</label>
          <input
            type="text"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Digite o nome da empresa"
            className="text-input"
          />
        </div>
        <div className="field">
          <label>Data Inicial:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="field">
          <label>Data Final:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-input"
          />
        </div>
      </div>
      {filteredCounts.length === 0 ? (
        <p>Nenhuma contagem criada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {filteredCounts.map((count) => (
            <li key={count.id} className="past-count-item">
              <Link to={`/count/${count.id}`} className="count-link">
                <h3>{count.title || 'Contagem sem título'}</h3>
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
