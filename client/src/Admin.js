import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:10000/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(response.data);
    } catch (error) {
      setMessage('Erro ao carregar usuários');
    }
  };

  const approveUser = async (id) => {
    try {
      await axios.post(`http://localhost:10000/approve-user/${id}`);
      fetchUsers();
      setMessage('Usuário aprovado');
    } catch (error) {
      setMessage('Erro ao aprovar usuário');
    }
  };

  return (
    <div className="card">
      <h2>Admin - Aprovar Usuários</h2>
      {message && <p className="count-info" style={{ color: 'green' }}>{message}</p>}
      <table className="report-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Empresa</th>
            <th>Aprovado</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.company}</td>
              <td>{user.approved ? 'Sim' : 'Não'}</td>
              <td><button onClick={() => approveUser(user.id)} className="btn primary">Aprovar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
