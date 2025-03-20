import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ActiveCounts from './ActiveCounts';
import PastCounts from './PastCounts';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">AUDITÊ</h1>
        <nav>
          <a href="/past-counts" className="nav-link">Ver Contagens Salvas</a>
        </nav>
      </header>
      <main className="App-main">
        <Router>
          <Routes>
            <Route path="/" element={<ActiveCounts />} />
            <Route path="/past-counts" element={<PastCounts />} />
          </Routes>
        </Router>
      </main>
    </div>
  );
}

export default App;