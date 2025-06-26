import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crown, Pizza } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      // Redirect based on role
      const roleRoutes = {
        admin: '/admin',
        admin_pizzaria: '/admin',
        cozinha: '/cozinha',
        motoboy: '/motoboy',
        atendente: '/atendente'
      };
      window.location.href = roleRoutes[user.role] || '/';
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  if (user) {
    const roleRoutes = {
      admin: '/admin',
      admin_pizzaria: '/admin',
      cozinha: '/cozinha',
      motoboy: '/motoboy',
      atendente: '/atendente'
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold-50 to-gold-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Crown className="h-12 w-12 text-gold-600" />
            <Pizza className="h-12 w-12 text-gold-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">GoldPizza</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Gestão de Pizzarias
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gold-500 focus:border-gold-500"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gold-500 focus:border-gold-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gold-600 hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        
        <div className="text-center text-xs text-gray-500">
          <p>Demo - Usuário Admin: admin@goldpizza.com / senha: 123456</p>
        </div>
      </div>
    </div>
  );
};

export default Login;