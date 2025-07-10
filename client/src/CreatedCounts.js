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
  const [isFiltered, setIsFiltered] = useState(false);
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

      setCounts(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar contagens: ' + err.message);
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!companyFilter) {
      alert('Por favor, informe o nome da empresa para filtrar.');
      return;
    }

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
        const timestamp = new Date(count.timestamp);
        return timestamp >= start && timestamp <= end;
      });
    }

    setFilteredCounts(filtered);
    setIsFiltered(true);
  };

  if (loading) return <div className="card">Carregando...</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;

  const displayedCounts = isFiltered ? filteredCounts : [];

  return (
    <div className="card">
      <button onClick={() => navigate(-1)} className="btn-back">Voltar</button>
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
        <button onClick={handleFilter} className="btn primary">Buscar</button>
      </div>

      {isFiltered ? (
        displayedCounts.length === 0 ? (
          <p>Nenhuma contagem criada encontrada para os filtros selecionados.</p>
        ) : (
          <ul className="past-counts-list">
            {displayedCounts.map((count) => (
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
        )
      ) : (
        <p>Por favor, utilize os filtros para buscar contagens criadas.</p>
      )}
    </div>
  );
};

export default CreatedCounts;
