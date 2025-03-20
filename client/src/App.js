import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PastCounts from './PastCounts';
import ActiveCounts from './ActiveCounts'; // Verifique se o nome está correto
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/past-counts" element={<PastCounts />} />
          <Route path="/active-counts" element={ActiveCounts ? <ActiveCounts /> : <div>Componente ActiveCounts não encontrado</div>} />
          <Route path="/" element={<PastCounts />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
