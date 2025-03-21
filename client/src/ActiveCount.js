import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ActiveCount = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleCreateCount = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Por favor, selecione um arquivo.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    try {
      const response = await axios.post('/create-count-from-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      setTitle('');
      setFile(null);
    } catch (error) {
      setMessage('Erro ao criar contagem: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <>
      <div className="card">
        <h2>Criar Nova Contagem</h2>
        <form onSubmit={handleCreateCount}>
          <div className="field">
            <label>Título da Contagem:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título"
              className="text-input"
            />
          </div>
          <div className="field">
            <label>Arquivo Excel:</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>
          <button type="submit" className="btn primary">Criar Contagem</button>
        </form>
      </div>

      <div className="count-actions">
        <button onClick={() => navigate('/created-counts')} className="btn primary">
          Contagens Criadas
        </button>
        <button onClick={() => navigate('/past-counts')} className="btn secondary">
          Contagens Finalizadas
        </button>
      </div>

      {message && (
        <p className="count-info" style={{ color: message.includes('Erro') ? 'red' : '#34A853' }}>
          {message}
        </p>
      )}
    </>
  );
};

export default ActiveCount;