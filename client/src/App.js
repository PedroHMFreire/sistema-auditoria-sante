import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, Link, useHistory } from 'react-router-dom';
import PastCounts from './PastCounts';
import ActiveCount from './ActiveCount';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [pastCounts, setPastCounts] = useState([]);
  const [countTitle, setCountTitle] = useState('');
  const history = useHistory();

  useEffect(() => {
    fetch('/past-counts')
      .then(res => res.json())
      .then(data => setPastCounts(data))
      .catch(err => console.error('Erro ao carregar contagens:', err));
  }, []);

  const handleSystemFileChange = (e) => setSystemFile(e.target.files[0]);

  const handleCreateCount = async () => {
    if (!systemFile) {
      alert('Selecione um arquivo Excel.');
      return;
    }
    const formData = new FormData();
    formData.append('file', systemFile);
    formData.append('title', countTitle || '');
    try {
      const res = await fetch('/create-count-from-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.message) {
        setSystemFile(null);
        setCountTitle('');
        fetch('/past-counts').then(res => res.json()).then(data => setPastCounts(data));
        alert(data.message);
      } else {
        alert(data.error || 'Erro ao criar contagem.');
      }
    } catch (error) {
      console.error('Erro ao criar contagem:', error);
      alert('Erro ao criar contagem.');
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setSystemFile(null);
      setCountTitle('');
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
      alert('Erro ao reiniciar.');
    }
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1 className="app-title">AUDITÊ</h1>
        </header>
        <main className="App-main">
          <Switch>
            <Route path="/" exact>
              <section className="card">
                <div className="field">
                  <input type="file" accept=".xlsx, .xls" onChange={handleSystemFileChange} className="file-input" />
                  <input
                    type="text"
                    value={countTitle}
                    onChange={(e) => setCountTitle(e.target.value)}
                    placeholder="Título da Contagem (Produto, Loja, Data)"
                    className="text-input"
                  />
                  <button onClick={handleCreateCount} className="btn primary">
                    Iniciar Auditoria
                  </button>
                </div>
              </section>
              <section className="card">
                <div className="count-categories">
                  <Link to="/past-counts?status=created" className="category-link">
                    Contagens Salvas
                  </Link>
                  <Link to="/past-counts?status=finalized" className="category-link">
                    Contagens Finalizadas
                  </Link>
                </div>
              </section>
            </Route>
            <Route path="/past-counts" component={PastCounts} />
            <Route path="/count/:countId" component={ActiveCount} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;