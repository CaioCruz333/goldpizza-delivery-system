import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AlterarSenhaObrigatoria = ({ user, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const { logout } = useAuth();

  const isPrimeiroLogin = user?.primeiroLogin;
  const isForcarAlteracao = user?.forcarAlteracaoSenha;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações
    if (!isPrimeiroLogin && !isForcarAlteracao && !formData.currentPassword) {
      setError('Senha atual é obrigatória');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      await api.patch('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpar erro ao digitar
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleLogout = () => {
    logout();
  };

  const getTitulo = () => {
    if (isPrimeiroLogin) {
      return 'Bem-vindo! Defina sua senha';
    }
    if (isForcarAlteracao) {
      return 'Alteração de senha obrigatória';
    }
    return 'Alterar senha';
  };

  const getSubtitulo = () => {
    if (isPrimeiroLogin) {
      return 'Este é seu primeiro acesso. Por favor, defina uma nova senha para sua conta.';
    }
    if (isForcarAlteracao) {
      return 'Por razões de segurança, você deve alterar sua senha antes de continuar.';
    }
    return 'Altere sua senha atual por uma nova.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gold-100 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-gold-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getTitulo()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getSubtitulo()}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Senha atual - só mostrar se não for primeiro login */}
            {!isPrimeiroLogin && !isForcarAlteracao && (
              <div className="relative">
                <label htmlFor="currentPassword" className="sr-only">
                  Senha atual
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                  placeholder="Senha atual"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            )}

            {/* Nova senha */}
            <div className="relative">
              <label htmlFor="newPassword" className="sr-only">
                Nova senha
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                required
                minLength={6}
                className={`relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${
                  !isPrimeiroLogin && !isForcarAlteracao ? '' : 'rounded-t-md'
                } focus:outline-none focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm`}
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={formData.newPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            {/* Confirmar nova senha */}
            <div className="relative">
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                required
                minLength={6}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                placeholder="Confirmar nova senha"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Submit button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gold-600 hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="group relative flex-shrink-0 flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
            >
              Sair
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            <p>Sua nova senha deve ter pelo menos 6 caracteres</p>
            <p>Recomendamos usar uma combinação de letras, números e símbolos</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlterarSenhaObrigatoria;