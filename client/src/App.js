import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import PastCounts from './PastCounts';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/past-counts" element={<PastCounts />} />
      </Routes>
    </Router>
  );
}

export default App;
