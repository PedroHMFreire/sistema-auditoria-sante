import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const PastCounts = () => {
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
        const response = await axios.get('/past-counts?status=finalized');
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

  const handleReset = async () => {
    try {
      await axios.post('/reset');
      setCounts([]);
      setFilteredCounts([]);
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
        <p>Nenhuma contagem finalizada encontrada.</p>
      ) : (
        <ul className="past-counts-list">
          {filteredCounts.map((count) => (
            <li key={count.id} className="past-count-item">
              <h3>{count.title || 'Contagem sem título'}</h3>
              <p><strong>Empresa:</strong> {count.company || 'Sem Empresa'}</p>
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
