import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

const ActiveCount = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(response.data || []);
      } catch (err) {
        setError('Erro ao carregar empresas.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const filterCompanies = debounce((value) => {
    const filtered = companies.filter(c => c.toLowerCase().includes(value.toLowerCase()));
    setFilteredCompanies(filtered);
    setShowSuggestions(true);
  }, 300);

  useEffect(() => {
    if (company) filterCompanies(company);
    else setShowSuggestions(false);
  }, [company]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleCompanySelect = (selectedCompany) => {
    setCompany(selectedCompany);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!file || !title || !company) {
      setError('Todos os campos devem ser preenchidos.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('company', company);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/create-count-from-excel`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);
      setFile(null); setTitle(''); setCompany('');
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar contagem.');
    }
  };

  return (
    <div className="card">
      <h2>NOVA CONTAGEM</h2>

      {isLoading && <p>Carregando empresas...</p>}
      {message && <p style={{ color: '#34A853', fontWeight: 'bold' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Empresa:</label>
          <div className="autocomplete">
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onFocus={() => company && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Digite o nome da empresa"
              className="text-input"
            />
            {showSuggestions && (
              <ul className="suggestions-list">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((comp, index) => (
                    <li key={index} onClick={() => handleCompanySelect(comp)} className="suggestion-item">{comp}</li>
                  ))
                ) : (
                  <li className="suggestion-item">Nenhuma empresa encontrada</li>
                )}
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

        <button type="submit" className="btn primary">Criar Contagem</button>
      </form>

      <nav>
        <Link to="/created-counts" className="category-link">Criadas</Link>
        <Link to="/past-counts" className="category-link">Finalizadas</Link>
      </nav>
    </div>
  );
};

export default ActiveCount;
