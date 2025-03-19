import React, { useState, useEffect } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import './App.css';

function ActiveCount() {
  const { countId } = useParams();
  const history = useHistory();
  const [systemSummary, setSystemSummary] = useState(null);
  const [countTitle, setCountTitle] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [storeData, setStoreData] = useState([]);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await fetch('/load-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countId: parseInt(countId) }),
        });
        const data = await res.json();
        if (data.message) {
          setSystemSummary({
            totalItems: data.systemData.length,
            totalUnits: data.systemData.reduce((sum, item) => sum + (item.balance || 0), 0),
          });
          setCountTitle(data.countTitle);
          setStoreData(data.storeData || []);
        } else {
          alert(data.error);
          history.push('/past-counts?status=created');
        }
      } catch (error) {
        console.error('Erro ao carregar contagem:', error);
        alert('Erro ao carregar contagem.');
        history.push('/past-counts?status=created');
      }
    };
    loadCount();
  }, [countId, history]);

  const handleCountStore = async () => {
    if (!storeCode.trim()) {
      alert('Insira um código.');
      return;
    }
    const qty = storeQuantity.trim() ? parseInt(storeQuantity, 10) : 1;
    if (qty <= 0) {
      alert('Quantidade inválida.');
      return;
    }
    try {
      const res = await fetch('/count-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: storeCode, quantity: qty }),
      });
      const data = await res.json();
      if (data.message) {
        setStoreMessage(data.message);
        setStoreData(prev => [...prev, { code: storeCode, quantity: qty }]);
        setStoreCode('');
        setStoreQuantity('');
      } else alert(data.error);
    } catch (error) {
      console.error('Erro ao contar:', error);
      alert('Erro ao contar.');
    }
  };

  const handleSaveCount = async () => {
    try {
      const res = await fetch('/save-count', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar.');
    }
  };

  const handleFinalize = async () => {
    try {
      const res = await fetch('/report-detailed');
      const data = await res.json();
      if (data.summary) {
        alert('Contagem finalizada com sucesso!');
        history.push('/past-counts?status=finalized');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao finalizar contagem:', error);
      alert('Erro ao finalizar contagem.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">Auditê</h1>
        <Link to="/past-counts?status=in-progress" className="nav-link">Voltar</Link>
      </header>
      <main className="App-main">
        <section className="card">
          <h2>Contagem Ativa: {countTitle}</h2>
          {systemSummary ? (
            <>
              <p>Total de Produtos: {systemSummary.totalItems}</p>
              <p>Total de Unidades: {systemSummary.totalUnits}</p>
              <div className="field">
                <input
                  type="text"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  placeholder="Código do produto"
                  className="text-input"
                />
                <input
                  type="number"
                  value={storeQuantity}
                  onChange={(e) => setStoreQuantity(e.target.value)}
                  placeholder="Quantidade (opcional)"
                  className="text-input"
                  min="1"
                />
                <button onClick={handleCountStore} className="btn primary">
                  Adicionar
                </button>
              </div>
              <p className="count-info">
                Último produto cadastrado: {storeMessage.split(' ')[1] || 'Nenhum'}. Total cadastrado: {storeData.length}
              </p>
              <div className="field">
                <button onClick={handleSaveCount} className="btn secondary">
                  Salvar
                </button>
                <button onClick={handleFinalize} className="btn primary">
                  Finalizar
                </button>
              </div>
            </>
          ) : (
            <p>Carregando contagem...</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default ActiveCount;
