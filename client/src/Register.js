import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:10000/register', { email, password, company });
      setMessage('Registro enviado. Aguarde aprovação.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao registrar');
    }
  };

  return (
    <div className="card">
      <h2>Registrar</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-input" />
        </div>
        <div className="field">
          <label>Senha:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="text-input" />
        </div>
        <div className="field">
          <label>Empresa:</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="text-input" />
        </div>
        <button type="submit" className="btn primary">Registrar</button>
      </form>
      {message && <p className="count-info" style={{ color: 'green' }}>{message}</p>}
      <p>Já tem conta? <a href="/login">Faça login</a></p>
    </div>
  );
};

export default Register;
