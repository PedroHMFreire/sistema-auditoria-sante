import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './App.css';

const ActiveCount = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(response.data || []);
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (company) {
      const filtered = companies.filter(c => c.toLowerCase().includes(company.toLowerCase()));
      setFilteredCompanies(filtered);
      setShowSuggestions(true);
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('company', company);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/create-count-from-excel`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });
      setMessage(response.data.message);
      setError('');
      setFile(null);
      setTitle('');
      setCompany('');
      document.getElementById('file-input').value = '';
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);
    } catch (err) {
      setError('Erro ao criar contagem: ' + (err.response?.data?.error || 'Erro desconhecido'));
      setMessage('');
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
            {showSuggestions && filteredCompanies.length > 0 && (
              <ul className="suggestions-list">
                {filteredCompanies.map((comp, index) => (
                  <li key={index} onClick={() => handleCompanySelect(comp)} className="suggestion-item">{comp}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="field">
          <label>Título da Contagem:</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Digite o título da contagem" className="text-input" />
        </div>
        <div className="field">
          <label>Arquivo Excel:</label>
          <input type="file" id="file-input" accept=".xlsx, .xls" onChange={handleFileChange} className="file-input" />
        </div>
        <button type="submit" className="btn primary">Criar Contagem</button>
      </form>
      <nav>
        <Link to="/created-counts" className="category-link">Criadas</Link>
        <Link to="/past-counts" className="category-link">Finalizadas</Link>
      </nav>
      {message && <p className="count-info" style={{ color: '#34A853' }}>{message}</p>}
      {error && <p className="count-info" style={{ color: 'red' }}>{error}</p>}
      {showSuccessAnimation && <div className="success-animation">✔ Contagem criada com sucesso!</div>}
    </div>
  );
};

export default ActiveCount;
