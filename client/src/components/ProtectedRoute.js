import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlterarSenhaObrigatoria from './AlterarSenhaObrigatoria';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, needsPasswordChange, completePasswordChange } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
  }

  // Se precisa alterar senha, mostrar tela de alteração obrigatória
  if (needsPasswordChange) {
    return (
      <AlterarSenhaObrigatoria 
        user={user}
        onSuccess={completePasswordChange}
      />
    );
  }

  return children;
};

export default ProtectedRoute;