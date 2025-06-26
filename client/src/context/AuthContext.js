import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🏍️ [MOTOBOY DEBUG] Token:', !!token ? 'Encontrado' : 'Não encontrado');
    
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      console.log('🏍️ [MOTOBOY DEBUG] Usuário carregado:', userData.name, userData.role);
      setUser(userData);
      
      // Verificar se precisa alterar senha
      if (userData.primeiroLogin || userData.forcarAlteracaoSenha) {
        setNeedsPasswordChange(true);
      }
    } catch (error) {
      console.error('🏍️ [MOTOBOY DEBUG] ERRO ao carregar usuário:', error.response?.data?.message || error.message);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      // Verificar se precisa alterar senha
      if (user.primeiroLogin || user.forcarAlteracaoSenha) {
        setNeedsPasswordChange(true);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setNeedsPasswordChange(false);
  };

  const completePasswordChange = () => {
    setNeedsPasswordChange(false);
    // Recarregar dados do usuário
    loadUser();
  };

  const value = {
    user,
    login,
    logout,
    loading,
    needsPasswordChange,
    completePasswordChange
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};