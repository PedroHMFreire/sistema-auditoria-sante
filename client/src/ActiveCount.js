import React, { useState } from 'react';
import axios from 'axios';

const ActiveCount = () => { // Correto: ActiveCount (sem "S")
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [countId, setCountId] = useState(null);
  const [systemData, setSystemData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(1);

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
      setCountId(response.data.countId);
      setSystemData(response.data.systemData);
    } catch (error) {
      setMessage('Erro ao criar contagem: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleLoadCount = async () => {
    if (!countId) {
      setMessage('Por favor, crie ou informe um ID de contagem.');
      return;
    }

    try {
      const response = await axios.post('/load-count', { countId });
      setMessage(response.data.message);
      setSystemData(response.data.systemData);
      setStoreData(response.data.storeData);
      setTitle(response.data.countTitle);
    } catch (error) {
      setMessage('Erro ao carregar contagem: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCountStore = async () => {
    if (!code || !countId) {
      setMessage('Por favor, informe um código e um ID de contagem.');
      return;
    }

    try {
      const response = await axios.post('/count-store', { code, quantity, countId });
      setMessage(response.data.message);
      setStoreData([...storeData, { code, quantity }]);
      setCode('');
      setQuantity(1);
    } catch (error) {
      setMessage('Erro ao adicionar código: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSaveCount = async () => {
    if (!countId) {
      setMessage('Por favor, informe um ID de contagem.');
      return;
    }

    try {
      const response = await axios.post('/save-count', { countId });
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Erro ao salvar contagem: ' + (error.response?.data?.error || error.message));
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

      <div className="card">
        <h2>Carregar Contagem</h2>
        <div className="field">
          <label>ID da Contagem:</label>
          <input
            type="number"
            value={countId || ''}
            onChange={(e) => setCountId(e.target.value)}
            placeholder="Digite o ID"
            className="text-input"
          />
          <button onClick={handleLoadCount} className="btn secondary">Carregar</button>
        </div>
      </div>

      <div className="card">
        <h2>Contagem da Loja</h2>
        <div className="field">
          <label>Código:</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Digite o código"
            className="text-input"
          />
          <label>Quantidade:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="text-input"
          />
          <button onClick={handleCountStore} className="btn primary">Adicionar</button>
        </div>
      </div>

      <div className="count-actions">
        <button onClick={handleSaveCount} className="btn secondary">Salvar Contagem</button>
      </div>

      {message && (
        <p className="count-info" style={{ color: message.includes('Erro') ? 'red' : '#34A853' }}>
          {message}
        </p>
      )}

      {systemData.length > 0 && (
        <div className="card">
          <h3>Dados do Sistema</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {systemData.map((item, index) => (
                <tr key={index}>
                  <td>{item.code}</td>
                  <td>{item.product}</td>
                  <td>{item.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {storeData.length > 0 && (
        <div className="card">
          <h3>Dados da Loja</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {storeData.map((item, index) => (
                <tr key={index}>
                  <td>{item.code}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {countId && (
        <div className="report-actions">
          <a
            href={`/report-detailed?countId=${countId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary"
          >
            Relatório Detalhado
          </a>
          <a
            href={`/report-synthetic?countId=${countId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn secondary"
          >
            Relatório Sintético
          </a>
        </div>
      )}
    </>
  );
};

export default ActiveCount; // Correto: ActiveCount (sem "S")