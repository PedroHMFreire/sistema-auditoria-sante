import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './ActiveCount.css';
import Lottie from 'lottie-react';
import successAnimation from './animations/success.json';

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
  const [success, setSuccess] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/companies`, {
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
      if (typingTimeout) clearTimeout(typingTimeout);
      const timeout = setTimeout(() => {
        const filtered = companies.filter(c => c.toLowerCase().includes(company.toLowerCase()));
        setFilteredCompanies(filtered);
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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Erro ao criar contagem: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
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
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Enviando...' : 'Criar Contagem'}
        </button>
      </form>
      <nav>
        <Link to="/created-counts" className="category-link">Criadas</Link>
        <Link to="/past-counts" className="category-link">Finalizadas</Link>
      </nav>
      {message && <p className="count-info" style={{ color: '#34A853' }}>{message}</p>}
      {error && <p className="count-info" style={{ color: 'red' }}>{error}</p>}
      {success && <Lottie animationData={successAnimation} loop={false} style={{ width: 200, margin: '0 auto' }} />}
    </div>
  );
};

export default ActiveCount;
