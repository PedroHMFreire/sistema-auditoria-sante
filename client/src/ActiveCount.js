import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ActiveCount = () => { // Corrigido: ActiveCounts -> ActiveCount
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

  const handleReset = async () => {
    try {
      const response = await axios.post('/reset');
      setMessage(response.data.message);
      setFile(null);
      setTitle('');
      setCountId(null);
      setSystemData([]);
      setStoreData([]);
      setCode('');
      setQuantity(1);
    } catch (error) {
      setMessage('Erro ao reiniciar: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ color: 'black', background: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1>Sistema de Auditoria Sante</h1>
      <Link to="/past-counts">Ver Contagens Salvas</Link>
      <h2>Criar Nova Contagem</h2>
      <form onSubmit={handleCreateCount}>
        <div>
          <label>Título da Contagem:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título"
          />
        </div>
        <div>
          <label>Arquivo Excel:</label>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        </div>
        <button type="submit">Criar Contagem</button>
      </form>

      <h2>Carregar Contagem</h2>
      <div>
        <label>ID da Contagem:</label>
        <input
          type="number"
          value={countId || ''}
          onChange={(e) => setCountId(e.target.value)}
          placeholder="Digite o ID"
        />
        <button onClick={handleLoadCount}>Carregar</button>
      </div>

      <h2>Contagem da Loja</h2>
      <div>
        <label>Código:</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código"
        />
        <label>Quantidade:</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
        />
        <button onClick={handleCountStore}>Adicionar</button>
      </div>

      <button onClick={handleSaveCount}>Salvar Contagem</button>
      <button onClick={handleReset}>Reiniciar</button>

      {message && <p style={{ color: message.includes('Erro') ? 'red' : 'green' }}>{message}</p>}

      {systemData.length > 0 && (
        <div>
          <h3>Dados do Sistema</h3>
          <ul>
            {systemData.map((item, index) => (
              <li key={index}>
                Código: {item.code}, Produto: {item.product}, Saldo: {item.balance}
              </li>
            ))}
          </ul>
        </div>
      )}

      {storeData.length > 0 && (
        <div>
          <h3>Dados da Loja</h3>
          <ul>
            {storeData.map((item, index) => (
              <li key={index}>
                Código: {item.code}, Quantidade: {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}

      {countId && (
        <div>
          <h3>Relatórios</h3>
          <a href={`/report-detailed?countId=${countId}`} target="_blank" rel="noopener noreferrer">
            Relatório Detalhado
          </a>
          <br />
          <a href={`/report-synthetic?countId=${countId}`} target="_blank" rel="noopener noreferrer">
            Relatório Sintético
          </a>
        </div>
      )}
    </div>
  );
};

export default ActiveCount; // Corrigido: ActiveCounts -> ActiveCount