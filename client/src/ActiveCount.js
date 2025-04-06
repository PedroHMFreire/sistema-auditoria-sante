import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ActiveCount = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(''); // Novo campo para empresa
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
    formData.append('company', company); // Adicionando empresa ao formData

    try {
      const response = await axios.post('/create-count-from-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      setError('');
      setFile(null);
      setTitle('');
      setCompany(''); // Limpar o campo empresa
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError('Erro ao criar contagem: ' + (err.response?.data?.error || err.message));
      setMessage('');
    }
  };

  return (
    <div className="card">
      <h2>NOVA CONTAGEM</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Empresa:</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Digite o nome da empresa"
            className="text-input"
          />
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
        <button type="submit" className="btn primary">
          Criar Contagem
        </button>
      </form>

      <nav>
        <Link to="/created-counts" className="category-link">Criadas</Link>
        <Link to="/past-counts" className="category-link">Finalizadas</Link>
      </nav>

      {message && <p className="count-info" style={{ color: '#34A853' }}>{message}</p>}
      {error && <p className="count-info" style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ActiveCount;
