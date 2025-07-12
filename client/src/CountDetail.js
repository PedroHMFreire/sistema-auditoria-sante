import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const CountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [count, setCount] = useState(null);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/count/${id}`);
        setCount(response.data);
        setLoading(false);
      } catch (err) {
        setMessage("Erro ao carregar contagem.");
        setLoading(false);
      }
    };
    fetchCount();
  }, [id]);

  const handleAddProduct = async () => {
    if (!code || !quantity) return;

    try {
      const res = await axios.post('http://localhost:10000/count-store', {
        code,
        quantity,
        countId: id,
      });
      setMessage(res.data.message || "Produto adicionado!");
      setCode('');
      setQuantity(1);
      // Atualizar a contagem após novo item
      const updated = await axios.get(`http://localhost:10000/count/${id}`);
      setCount(updated.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Erro ao adicionar produto.");
    }
  };

  const finalizeCount = async () => {
    try {
      await axios.put(`http://localhost:10000/count/${id}/finalize`);
      navigate('/');
    } catch (err) {
      setMessage("Erro ao finalizar contagem.");
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (!count) return <p>Contagem não encontrada.</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto' }}>
      <h2>{count.title}</h2>
      <p>Empresa: {count.company}</p>
      <p>Status: {count.status}</p>

      <div style={{ marginTop: '20px' }}>
        <input
          type="text"
          placeholder="Código do produto"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ marginRight: '10px' }}
        />
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{ marginRight: '10px', width: '60px' }}
        />
        <button onClick={handleAddProduct}>Adicionar</button>
      </div>

      {message && <p style={{ marginTop: '10px', color: 'blue' }}>{message}</p>}

      <div style={{ marginTop: '30px' }}>
        <h3>Produtos Contados</h3>
        {count.store_data.length === 0 ? (
          <p>Nenhum produto adicionado ainda.</p>
        ) : (
          <table width="100%" border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {count.store_data.map((item, i) => (
                <tr key={i}>
                  <td>{item.code}</td>
                  <td>{item.quantity}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        onClick={finalizeCount}
        style={{ marginTop: '20px', backgroundColor: 'green', color: 'white', padding: '10px' }}
      >
        Finalizar Contagem
      </button>
    </div>
  );
};

export default CountDetail;
