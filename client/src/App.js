import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, Link, useHistory } from 'react-router-dom';
import PastCounts from './PastCounts';
import ActiveCount from './ActiveCount';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [theme, setTheme] = useState('light');
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
      if (data.message) {
        alert(data.message);
        setSystemFile(null);
        setCountTitle('');
        fetch('/past-counts').then(res => res.json()).then(data => setPastCounts(data));
        history.push(`/count/${data.countId}`); // Redireciona para a página da contagem
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

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <Router>
      <div className={`App ${theme}`}>
        <header className="App-header">
          <h1 className="app-title">Auditê</h1>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </header>
        <main className="App-main">
          <Switch>
            <Route path="/" exact>
              <section className="card">
                <h2>COMECE A AUDITAR</h2>
                <p>Carregue aqui o inventário do sistema</p>
                <div className="field">
                  <input type="file" accept=".xlsx, .xls" onChange={handleSystemFileChange} className="file-input" />
                  <input
                    type="text"
                    value={countTitle}
                    onChange={(e) => setCountTitle(e.target.value)}
                    placeholder="TÍTULO DA CONTAGEM (Produto, Loja, Data)"
                    className="text-input"
                  />
                  <button onClick={handleCreateCount} className="btn primary">
                    Iniciar Auditoria
                  </button>
                </div>
              </section>
              <section className="card">
                <h2>ÚLTIMAS CONTAGENS</h2>
                <div className="count-categories">
                  <Link to="/past-counts?status=created" className="category-link">
                    CONTAGENS CRIADAS
                  </Link>
                  <Link to="/past-counts?status=in-progress" className="category-link">
                    CONTAGENS EM ANDAMENTO
                  </Link>
                  <Link to="/past-counts?status=finalized" className="category-link">
                    CONTAGENS FINALIZADAS
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
