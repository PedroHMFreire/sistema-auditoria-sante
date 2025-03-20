import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ActiveCount from './ActiveCount'; // Corrigido: ActiveCounts -> ActiveCount
import PastCounts from './PastCounts';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ActiveCount />} /> {/* Corrigido: ActiveCounts -> ActiveCount */}
        <Route path="/past-counts" element={<PastCounts />} />
      </Routes>
    </Router>
  );
}

export default App;