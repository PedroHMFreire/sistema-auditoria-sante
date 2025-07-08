import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const CountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCounting, setIsCounting] = useState(false);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [lastAddedProduct, setLastAddedProduct] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/past-counts`);
        const selectedCount = response.data.find(c => c.id === parseInt(id));
        if (!selectedCount) throw new Error('Contagem não encontrada');
        const updatedStoreData = selectedCount.store_data.map(item => {
          const systemItem = selectedCount.system_data.find(sys => sys.code === item.code);
          const balance = systemItem ? systemItem.balance : 0;
          const difference = item.quantity - balance;
          let status = 'Regular';
          if (difference > 0) status = 'Excesso';
          else if (difference < 0) status = 'Falta';
          return { ...item, status };
        });
        setCount({ ...selectedCount, store_data: updatedStoreData });
        setIsCounting(selectedCount.store_data?.length > 0);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagem: ' + err.message);
        setLoading(false);
      }
    };
    fetchCount();
  }, [id]);

  const handleStartCounting = () => setIsCounting(true);

  const handleCountStore = async () => {
    if (!code || !id) {
      setMessage('Por favor, informe um código.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:10000/count-store', { code, quantity, countId: id });
      setMessage(response.data.message);
      setLastAddedProduct({ code, productName: response.data.productName });
      setCount(prev => ({
        ...prev,
        store_data: [...(prev.store_data || []), { code, quantity, timestamp: new Date().toISOString(), status: response.data.status }],
      }));
      setCode(''); setQuantity(1);
      setTimeout(() => setLastAddedProduct(null), 5000);
    } catch (error) {
      setMessage('Erro ao adicionar código: ' + error.response?.data?.error);
    }
  };

  const handleRemoveItem = async (index) => {
    try {
      const response = await axios.post('http://localhost:10000/remove-store-item', { countId: id, index });
      setMessage(response.data.message);
      setCount(prev => ({
        ...prev,
        store_data: prev.store_data.filter((_, i) => i !== index),
      }));
    } catch (error) {
      setMessage('Erro ao remover item: ' + error.response?.data?.error);
    }
  };

  const handleEditItem = (index) => {
    const item = count.store_data[index];
    setEditIndex(index); setEditCode(item.code); setEditQuantity(item.quantity);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axios.post('http://localhost:10000/edit-store-item', { countId: id, index: editIndex, code: editCode, quantity: editQuantity });
      setMessage(response.data.message);
      setLastAddedProduct({ code: editCode, productName: response.data.productName });
      setCount(prev => {
        const updatedStoreData = [...prev.store_data];
        updatedStoreData[editIndex] = { ...updatedStoreData[editIndex], code: editCode, quantity: editQuantity, status: response.data.status };
        return { ...prev, store_data: updatedStoreData };
      });
      setEditIndex(null); setEditCode(''); setEditQuantity(1);
      setTimeout(() => setLastAddedProduct(null), 5000);
    } catch (error) {
      setMessage('Erro ao editar item: ' + error.response?.data?.error);
    }
  };

  const handleCancelEdit = () => { setEditIndex(null); setEditCode(''); setEditQuantity(1); };

  const handleFinalizeCount = async () => {
    try {
      await axios.post('http://localhost:10000/save-count', { countId: id });
      await axios.post('http://localhost:10000/finalize-count', { countId: id });
      navigate('/past-counts');
    } catch (error) {
      setMessage('Erro ao finalizar contagem: ' + error.response?.data?.error);
    }
  };

  if (loading) return <div className="card">Carregando...</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;

  const sortedStoreData = [...(count.store_data || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="card">
      <button onClick={() => navigate(-1)} className="btn-back">Voltar</button>
      <p><strong>Empresa:</strong> {count.company || 'Sem Empresa'}</p>
      <h2>{count.title || 'Contagem sem título'}</h2>
      <p><strong>Data de Criação:</strong> {new Date(count.timestamp).toLocaleString()}</p>
      {count.system_data?.length > 0 && (
        <div className="card">
          <h3>Resumo dos Dados do Sistema</h3>
          <p><strong>Total de Itens:</strong> {count.system_data.length}</p>
          <p><strong>Produtos Únicos:</strong> {new Set(count.system_data.map(item => item.product)).size}</p>
        </div>
      )}
      {!isCounting ? (
        <button onClick={handleStartCounting} className="btn primary">Iniciar Contagem</button>
      ) : (
        <>
          <div className="card">
            <h3>Inserir Dados da Loja</h3>
            {editIndex === null ? (
              <div className="field">
                <label>Código:</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digite o código" className="text-input" />
                <label>Quantidade:</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="text-input" />
                <button onClick={handleCountStore} className="btn primary">Adicionar</button>
              </div>
            ) : (
              <div className="field">
                <label>Código:</label>
                <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Digite o código" className="text-input" />
                <label>Quantidade:</label>
                <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} min="1" className="text-input" />
                <button onClick={handleSaveEdit} className="btn primary">Salvar</button>
                <button onClick={handleCancelEdit} className="btn secondary">Cancelar</button>
              </div>
            )}
            {lastAddedProduct && <p className="transient-message">Último produto adicionado: {lastAddedProduct.code} - {lastAddedProduct.productName}</p>}
          </div>
          {sortedStoreData.length > 0 && (
            <div className="card">
              <h3>Dados da Loja</h3>
              <table className="report-table">
                <thead><tr><th>Código</th><th>Quantidade</th><th>Status</th><th>Ação</th></tr></thead>
                <tbody>
                  {sortedStoreData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.code}</td>
                      <td>{item.quantity}</td>
                      <td className={`status-${item.status.toLowerCase()}`}>{item.status}</td>
                      <td>
                        <button onClick={() => handleEditItem(index)} className="action-icon edit" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button onClick={() => handleRemoveItem(index)} className="action-icon remove" title="Remover">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="count-actions">
            <button onClick={handleFinalizeCount} className="btn primary">Finalizar Contagem</button>
          </div>
        </>
      )}
      {message && <p className="count-info" style={{ color: message.includes('Erro') ? 'red' : '#34A853' }}>{message}</p>}
    </div>
  );
};

export default CountDetail;
