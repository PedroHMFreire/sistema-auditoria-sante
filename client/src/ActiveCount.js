import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ActiveCount.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const ActiveCount = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [counts, setCounts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      }
    };

    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/counts/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCounts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erro ao carregar contagens:', err);
      }
    };

    fetchCompanies();
    fetchCounts();
  }, []);

  useEffect(() => {
    if (company) {
      if (typingTimeout) clearTimeout(typingTimeout);

      const timeout = setTimeout(() => {
        if (Array.isArray(companies)) {
          const filtered = companies.filter(c =>
            typeof c === 'string' && c.toLowerCase().includes(company.toLowerCase())
          );
          setFilteredCompanies(filtered);
        } else {
          setFilteredCompanies([]);
        }
        setShowSuggestions(true);
      }, 300);

      setTypingTimeout(timeout);
    } else {
      setFilteredCompanies([]);
      setShowSuggestions(false);
    }
  }, [company, companies]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleCompanySelect = (selectedCompany) => {
    setCompany(selectedCompany);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('company', company);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/create-count-from-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage(response.data.message);
      setFile(null);
      setTitle('');
      setCompany('');
      document.getElementById('file-input').value = '';
      const newCount = response.data.count;
      if (newCount) setCounts([newCount, ...counts]);
    } catch (err) {
      setError('Erro ao criar contagem: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (countId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/counts/${countId}/finalize`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounts(counts.filter(c => c.id !== countId));
    } catch (err) {
      console.error('Erro ao finalizar contagem:', err);
    }
  };

  return (
    <div className="card">
      <h2>NOVA CONTAGEM</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Empresa:</label>
          <div className="autocomplete">
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Digite o nome da empresa"
              className="text-input"
              onFocus={() => company && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && Array.isArray(filteredCompanies) && filteredCompanies.length > 0 && (
              <ul className="suggestions-list">
                {filteredCompanies.map((comp, index) => (
                  <li
                    key={index}
                    onClick={() => handleCompanySelect(comp)}
                    className="suggestion-item"
                  >
                    {comp}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="field">
          <label>Título da Contagem:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título da contagem"
            className="text-input"
          />
        </div>

        <div className="field">
          <label>Arquivo Excel:</label>
          <input
            type="file"
            id="file-input"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Enviando...' : 'Criar Contagem'}
        </button>
      </form>

      {message && <p className="count-info" style={{ color: '#34A853' }}>{message}</p>}
      {error && <p className="count-info" style={{ color: 'red' }}>{error}</p>}

      <h3>Contagens em andamento</h3>
      <ul className="count-list">
        {Array.isArray(counts) && counts.length > 0 && counts.map(count => (
          <li key={count.id} className="count-item">
            <div>
              <strong>{count.title}</strong> — {count.company}
            </div>
            <div>
              <button onClick={() => navigate(`/count/${count.id}`)} className="btn small">Abrir</button>
              <button onClick={() => handleFinalize(count.id)} className="btn small danger">Finalizar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActiveCount;
