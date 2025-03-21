import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ActiveCount from './ActiveCount';
import CreatedCounts from './CreatedCounts';
import CountDetail from './CountDetail';
import PastCounts from './PastCounts';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">AUDITÊ</h1>
        <nav>
          <a href="/" className="nav-link">Criar Contagem</a>
          <a href="/created-counts" className="nav-link">Contagens Criadas</a>
          <a href="/past-counts" className="nav-link">Contagens Finalizadas</a>
        </nav>
      </header>
      <main className="App-main">
        <Router>
          <Routes>
            <Route path="/" element={<ActiveCount />} />
            <Route path="/created-counts" element={<CreatedCounts />} />
            <Route path="/count/:id" element={<CountDetail />} />
            <Route path="/past-counts" element={<PastCounts />} />
          </Routes>
        </Router>
      </main>
    </div>
  );
}

export default App;