import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, { email, password });
      onLogin(response.data.token);
      navigate('/active-count');
    } catch (error) {
      setMessage(`Erro ao fazer login: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-input" />
        </div>
        <div className="field">
          <label>Senha:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="text-input" />
        </div>
        <button type="submit" className="btn primary">Entrar</button>
      </form>
      {message && <p className="count-info" style={{ color: 'red' }}>{message}</p>}
      <p>Não tem conta? <a href="/register">Registre-se</a></p>
    </div>
  );
};

export default Login;
