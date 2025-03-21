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

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await axios.get(`/past-counts?status=created`);
        const selectedCount = response.data.find((c) => c.id === parseInt(id));
        if (!selectedCount) {
          throw new Error('Contagem não encontrada ou não está no status "created".');
        }
        setCount(selectedCount);
        setIsCounting(selectedCount.store_data?.length > 0);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar contagem: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchCount();
  }, [id]);

  const handleStartCounting = () => {
    setIsCounting(true);
  };

  const handleCountStore = async () => {
    if (!code || !id) {
      setMessage('Por favor, informe um código.');
      return;
    }

    try {
      const response = await axios.post('/count-store', { code, quantity, countId: id });
      setMessage(response.data.message);
      setCount((prev) => ({
        ...prev,
        store_data: [...(prev.store_data || []), { code, quantity }],
      }));
      setCode('');
      setQuantity(1);
    } catch (error) {
      setMessage('Erro ao adicionar código: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleFinalizeCount = async () => {
    try {
      const response = await axios.post('/save-count', { countId: id });
      setMessage(response.data.message);
      // Atualizar o status para "finalized" no backend
      await axios.post('/finalize-count', { countId: id });
      navigate('/past-counts');
    } catch (error) {
      setMessage('Erro ao finalizar contagem: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div className="card">Carregando...</div>;
  }

  if (error) {
    return <div className="card" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="card">
      <h2>{count.title || 'Contagem sem título'}</h2>
      <p><strong>Data de Criação:</strong> {new Date(count.timestamp).toLocaleString()}</p>
      <p><strong>Total de Itens no Sistema:</strong> {count.system_data?.length || 0}</p>

      {count.system_data?.length > 0 && (
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
              {count.system_data.map((item, index) => (
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

      {!isCounting ? (
        <button onClick={handleStartCounting} className="btn primary">
          Iniciar Contagem
        </button>
      ) : (
        <>
          <div className="card">
            <h3>Inserir Dados da Loja</h3>
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
              <button onClick={handleCountStore} className="btn primary">
                Adicionar
              </button>
            </div>
          </div>

          {count.store_data?.length > 0 && (
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
                  {count.store_data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.code}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="count-actions">
            <button onClick={handleFinalizeCount} className="btn secondary">
              Finalizar Contagem
            </button>
          </div>
        </>
      )}

      {message && (
        <p className="count-info" style={{ color: message.includes('Erro') ? 'red' : '#34A853' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default CountDetail;