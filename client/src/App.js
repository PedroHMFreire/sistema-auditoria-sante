import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ActiveCounts from './ActiveCounts';
import PastCounts from './PastCounts';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ActiveCounts />} />
        <Route path="/past-counts" element={<PastCounts />} />
      </Routes>
    </Router>
  );
}

export default App;