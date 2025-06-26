import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Crown, 
  Store, 
  Users, 
  BarChart3, 
  LogOut,
  Plus,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Edit,
  Utensils,
  X,
  ArrowLeft,
  TrendingUp,
  Activity,
  Settings,
  Pizza,
  ShoppingCart
} from 'lucide-react';
import api from '../services/api';
import CozinhaDashboard from './CozinhaDashboard';
import PedidosDashboard from './PedidosDashboard';
import FuncionariosDashboard from './FuncionariosDashboard';

// Componente para gerenciar ingredientes de sabores
const IngredientesManager = ({ itemId, ingredientes, onIngredientesChange }) => {
  const [novoIngrediente, setNovoIngrediente] = useState('');
  const [carregando, setCarregando] = useState(false);

  const adicionarIngrediente = async () => {
    if (!novoIngrediente.trim()) return;
    
    setCarregando(true);
    try {
      const response = await api.post(`/sabores/${itemId}/ingredientes`, {
        nome: novoIngrediente.trim()
      });
      
      // Atualizar lista local
      const novosIngredientes = [...ingredientes, response.data.ingrediente];
      onIngredientesChange(novosIngredientes);
      setNovoIngrediente('');
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      alert(error.response?.data?.message || 'Erro ao adicionar ingrediente');
    } finally {
      setCarregando(false);
    }
  };

  const removerIngrediente = async (ingredienteId) => {
    setCarregando(true);
    try {
      await api.delete(`/sabores/${itemId}/ingredientes/${ingredienteId}`);
      
      // Atualizar lista local
      const novosIngredientes = ingredientes.filter(ing => ing._id !== ingredienteId);
      onIngredientesChange(novosIngredientes);
    } catch (error) {
      console.error('Erro ao remover ingrediente:', error);
      alert(error.response?.data?.message || 'Erro ao remover ingrediente');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes do Sabor</label>
      
      {/* Lista de ingredientes existentes */}
      <div className="mb-3">
        {ingredientes.map((ingrediente) => (
          <div key={ingrediente._id} className="flex items-center justify-between bg-gray-50 p-2 rounded mb-1">
            <span className="text-sm">{ingrediente.nome}</span>
            <button
              type="button"
              onClick={() => removerIngrediente(ingrediente._id)}
              disabled={carregando}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              🗑️
            </button>
          </div>
        ))}
        {ingredientes.length === 0 && (
          <p className="text-sm text-gray-500 italic">Nenhum ingrediente adicionado</p>
        )}
      </div>

      {/* Adicionar novo ingrediente */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome do ingrediente"
          value={novoIngrediente}
          onChange={(e) => setNovoIngrediente(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && adicionarIngrediente()}
          disabled={carregando}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={adicionarIngrediente}
          disabled={carregando || !novoIngrediente.trim()}
          className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          {carregando ? '...' : '➕'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">Digite o nome do ingrediente e pressione Enter ou clique em ➕</p>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pizzarias, setPizzarias] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Recuperar aba ativa do localStorage ao inicializar
    return localStorage.getItem('adminActiveTab') || 'dashboard';
  });
  const [selectedPizzaria, setSelectedPizzaria] = useState(() => {
    // Recuperar pizzaria selecionada do localStorage ao inicializar
    const saved = localStorage.getItem('adminSelectedPizzaria');
    return saved ? JSON.parse(saved) : null;
  });
  const [editingPizzaria, setEditingPizzaria] = useState(null);
  const [stats, setStats] = useState({
    totalPizzarias: 0,
    pedidosHoje: 0,
    faturamentoMes: 0,
    usuariosAtivos: 0
  });

  // Função para selecionar pizzaria e salvar no localStorage
  const handlePizzariaSelection = (pizzaria) => {
    setSelectedPizzaria(pizzaria);
  };

  // Função para alterar aba e salvar no localStorage
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  useEffect(() => {
    // Carregar dados baseado no tipo de usuário
    if (user?.role === 'admin') {
      // Admin geral carrega todas as pizzarias e stats gerais
      loadPizzarias();
      loadStats();
    } else if (user?.role === 'admin_pizzaria') {
      // Admin da pizzaria carrega apenas sua pizzaria
      loadPizzarias();
    }
  }, [user]);

  useEffect(() => {
    // Se for admin_pizzaria, auto-selecionar sua pizzaria apenas se não houver uma já selecionada no localStorage
    if (user?.role === 'admin_pizzaria' && user?.pizzaria && pizzarias.length > 0 && !selectedPizzaria) {
      const pizzariaId = typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
      const userPizzaria = pizzarias.find(p => p._id === pizzariaId);
      if (userPizzaria) {
        handlePizzariaSelection(userPizzaria);
      }
    }
  }, [user, pizzarias]);

  const loadPizzarias = async () => {
    try {
      const response = await api.get('/pizzarias');
      setPizzarias(response.data);
      setStats(prev => ({ ...prev, totalPizzarias: response.data.length }));
    } catch (error) {
      console.error('Erro ao carregar pizzarias:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Salvar aba ativa no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  // Salvar pizzaria selecionada no localStorage sempre que mudar
  useEffect(() => {
    if (selectedPizzaria) {
      localStorage.setItem('adminSelectedPizzaria', JSON.stringify(selectedPizzaria));
    } else {
      localStorage.removeItem('adminSelectedPizzaria');
    }
  }, [selectedPizzaria]);


  const handleLogout = () => {
    // Limpar dados persistidos no logout
    localStorage.removeItem('adminActiveTab');
    localStorage.removeItem('adminSelectedPizzaria');
    
    // Limpar todas as abas de detalhe de pizzarias
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pizzariaDetailTab_')) {
        localStorage.removeItem(key);
      }
    });
    
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-gold-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">GoldPizza Admin</h1>
                <p className="text-sm text-gray-500">Painel Administrativo</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Olá, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Para admin da pizzaria, mostrar direto a tela da pizzaria */}
      {user?.role === 'admin_pizzaria' && selectedPizzaria ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PizzariaDetailView 
            pizzaria={selectedPizzaria} 
            onBack={null}
            isAdminPizzaria={true}
          />
        </div>
      ) : user?.role === 'admin_pizzaria' ? (
        // Carregando para admin da pizzaria
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p>Carregando dados da pizzaria...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Navigation Tabs para admin geral - só aparece quando não está dentro de uma pizzaria */}
          {!selectedPizzaria && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { key: 'pizzarias', label: 'Pizzarias', icon: Store },
                    ...(user?.role === 'admin' ? [{ key: 'usuarios', label: 'Usuários', icon: Users }] : []),
                    { key: 'relatorios', label: 'Relatórios', icon: BarChart3 }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`${
                        activeTab === tab.key
                          ? 'border-gold-500 text-gold-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {selectedPizzaria ? (
              <PizzariaDetailView 
                pizzaria={selectedPizzaria} 
                onBack={() => handlePizzariaSelection(null)}
                isAdminPizzaria={false}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && <AdminHome stats={stats} pizzarias={pizzarias} onSelectPizzaria={handlePizzariaSelection} />}
                {activeTab === 'pizzarias' && <PizzariasManager pizzarias={pizzarias} onUpdate={loadPizzarias} editingPizzaria={editingPizzaria} setEditingPizzaria={setEditingPizzaria} />}
                {activeTab === 'usuarios' && <UsuariosManager />}
                {activeTab === 'relatorios' && <Relatorios />}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal Editar Pizzaria */}
      {editingPizzaria && (
        <EditarPizzariaModal 
          pizzaria={editingPizzaria}
          onClose={() => setEditingPizzaria(null)}
          onSuccess={() => {
            setEditingPizzaria(null);
            loadPizzarias();
          }}
        />
      )}
    </div>
  );
};

const NovaPizzariaModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      cep: ''
    },
    contato: {
      telefone: '',
      email: '',
      whatsapp: ''
    },
    configuracoes: {
      horarioFuncionamento: {
        abertura: '18:00',
        fechamento: '23:00'
      },
      taxaEntrega: 5.00,
      tempoPreparoMedio: 30,
      comissaoMotoboy: 2.50
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pizzarias', formData);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar pizzaria:', error);
      alert('Erro ao criar pizzaria');
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Nova Pizzaria</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome da Pizzaria</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Endereço */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Endereço</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Rua"
                required
                value={formData.endereco.rua}
                onChange={(e) => updateField('endereco.rua', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="text"
                placeholder="Número"
                required
                value={formData.endereco.numero}
                onChange={(e) => updateField('endereco.numero', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="text"
                placeholder="Bairro"
                required
                value={formData.endereco.bairro}
                onChange={(e) => updateField('endereco.bairro', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="text"
                placeholder="Cidade"
                required
                value={formData.endereco.cidade}
                onChange={(e) => updateField('endereco.cidade', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="text"
                placeholder="CEP"
                required
                value={formData.endereco.cep}
                onChange={(e) => updateField('endereco.cep', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Contato</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="tel"
                placeholder="Telefone"
                required
                value={formData.contato.telefone}
                onChange={(e) => updateField('contato.telefone', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={formData.contato.email}
                onChange={(e) => updateField('contato.email', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={formData.contato.whatsapp}
                onChange={(e) => updateField('contato.whatsapp', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700"
            >
              Criar Pizzaria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminHome = ({ stats, pizzarias, onSelectPizzaria }) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Store className="h-8 w-8 text-gold-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pizzarias</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPizzarias}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Pizza className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pedidos Hoje</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pedidosHoje}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faturamento Mês</p>
              <p className="text-2xl font-semibold text-gray-900">R$ {stats.faturamentoMes?.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.usuariosAtivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pizzarias Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Suas Pizzarias</h3>
        </div>
        <div className="p-6">
          {pizzarias.length === 0 ? (
            <div className="text-center py-8">
              <Store className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma pizzaria cadastrada</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando sua primeira pizzaria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pizzarias.map((pizzaria) => (
                <PizzariaCard 
                  key={pizzaria._id} 
                  pizzaria={pizzaria} 
                  onClick={() => onSelectPizzaria(pizzaria)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PizzariaCard = ({ pizzaria, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-gold-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-medium text-gray-900">{pizzaria.nome}</h4>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              {pizzaria.endereco.bairro}, {pizzaria.endereco.cidade}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="h-4 w-4 mr-1" />
              {pizzaria.contato.telefone}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {pizzaria.configuracoes.horarioFuncionamento.abertura} - {pizzaria.configuracoes.horarioFuncionamento.fechamento}
            </div>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          pizzaria.ativa 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {pizzaria.ativa ? 'Ativa' : 'Inativa'}
        </div>
      </div>
    </div>
  );
};

const PizzariasManager = ({ pizzarias, onUpdate, editingPizzaria, setEditingPizzaria }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Pizzarias</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Pizzaria</span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endereço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pizzarias.map((pizzaria) => (
              <tr key={pizzaria._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pizzaria.nome}</div>
                  <div className="text-sm text-gray-500">{pizzaria.contato.telefone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {pizzaria.endereco.rua}, {pizzaria.endereco.numero}
                  </div>
                  <div className="text-sm text-gray-500">
                    {pizzaria.endereco.bairro}, {pizzaria.endereco.cidade}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pizzaria.ativa 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pizzaria.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => setEditingPizzaria(pizzaria)}
                    className="text-gold-600 hover:text-gold-900 mr-4"
                  >
                    Editar
                  </button>
                  <button className="text-red-600 hover:text-red-900">Desativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Pizzaria */}
      {showModal && (
        <NovaPizzariaModal 
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Modal Editar Pizzaria */}
      {editingPizzaria && (
        <EditarPizzariaModal 
          pizzaria={editingPizzaria}
          onClose={() => setEditingPizzaria(null)}
          onSuccess={() => {
            setEditingPizzaria(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

const AlterarSenhaModal = ({ usuario, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    forcarAlteracao: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      await api.patch(`/usuarios/${usuario._id}/reset-password`, {
        newPassword: formData.newPassword,
        forcarAlteracao: formData.forcarAlteracao
      });
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Alterar Senha - {usuario.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
              placeholder="Digite a senha novamente"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="forcarAlteracao"
              id="forcarAlteracao"
              checked={formData.forcarAlteracao}
              onChange={handleChange}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label htmlFor="forcarAlteracao" className="ml-2 block text-sm text-gray-900">
              Forçar alteração no próximo login
            </label>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium">ℹ️ Informações:</p>
            <ul className="mt-1 flex flex-col gap-1 text-xs">
              <li>• Se marcado, o usuário será obrigado a alterar a senha no próximo login</li>
              <li>• A senha atual será substituída imediatamente</li>
              <li>• O usuário receberá as novas credenciais para acesso</li>
            </ul>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 disabled:opacity-50"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsuariosManager = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [pizzarias, setPizzarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [changingPassword, setChangingPassword] = useState(null);

  useEffect(() => {
    loadUsuarios();
    loadPizzarias();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/usuarios');
      // Filtrar apenas admin_pizzaria para o admin master
      const adminPizzarias = response.data.filter(user => user.role === 'admin_pizzaria');
      setUsuarios(adminPizzarias);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPizzarias = async () => {
    try {
      const response = await api.get('/pizzarias');
      setPizzarias(response.data);
    } catch (error) {
      console.error('Erro ao carregar pizzarias:', error);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await api.patch(`/usuarios/${userId}/toggle-status`);
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const getPizzariaNome = (pizzariaId) => {
    const pizzaria = pizzarias.find(p => p._id === pizzariaId);
    return pizzaria ? pizzaria.nome : 'N/A';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Administradores de Pizzarias</h3>
          <p className="text-sm text-gray-600">
            Gerencie os administradores responsáveis por cada pizzaria
          </p>
        </div>
        <button
          onClick={() => setShowNovoUsuario(true)}
          className="flex items-center space-x-2 bg-gold-600 text-white px-4 py-2 rounded-md hover:bg-gold-700"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Administrador</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando usuários...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pizzaria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Criação
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map(usuario => (
                <tr key={usuario._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gold-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gold-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{usuario.name}</div>
                        <div className="text-sm text-gray-500">{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getPizzariaNome(usuario.pizzaria?._id || usuario.pizzaria)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(usuario.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setEditingUsuario(usuario)}
                        className="text-gold-600 hover:text-gold-900"
                        title="Editar usuário"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setChangingPassword(usuario)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Alterar senha"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(usuario._id)}
                        className={`${
                          usuario.ativo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                        title={usuario.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {usuario.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuarios.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum administrador</h3>
              <p className="mt-1 text-gray-500">Crie o primeiro administrador de pizzaria</p>
            </div>
          )}
        </div>
      )}

      {showNovoUsuario && (
        <NovoAdminModal 
          onClose={() => setShowNovoUsuario(false)}
          onSuccess={() => {
            setShowNovoUsuario(false);
            loadUsuarios();
          }}
          pizzarias={pizzarias}
        />
      )}

      {editingUsuario && (
        <EditarAdminModal 
          usuario={editingUsuario}
          onClose={() => setEditingUsuario(null)}
          onSuccess={() => {
            setEditingUsuario(null);
            loadUsuarios();
          }}
          pizzarias={pizzarias}
        />
      )}

      {changingPassword && (
        <AlterarSenhaModal 
          usuario={changingPassword}
          onClose={() => setChangingPassword(null)}
          onSuccess={() => {
            setChangingPassword(null);
            loadUsuarios();
          }}
        />
      )}
    </div>
  );
};


const Relatorios = () => {
  return (
    <div className="text-center py-8">
      <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-lg font-medium text-gray-900">Relatórios</h3>
      <p className="mt-1 text-gray-500">Em desenvolvimento...</p>
    </div>
  );
};

const EditarPizzariaModal = ({ pizzaria, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('dados');
  const [formData, setFormData] = useState({
    nome: pizzaria.nome || '',
    endereco: pizzaria.endereco || {},
    contato: pizzaria.contato || {},
    configuracoes: pizzaria.configuracoes || {}
  });

  const [cardapio, setCardapio] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);

  useEffect(() => {
    if (activeTab === 'cardapio') {
      loadCardapio();
    } else if (activeTab === 'funcionarios') {
      loadFuncionarios();
    }
  }, [activeTab, loadCardapio, loadFuncionarios]);

  const loadCardapio = async () => {
    try {
      const response = await api.get(`/cardapio/pizzaria/${pizzaria._id}`);
      setCardapio(response.data);
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
    }
  };

  const loadFuncionarios = async () => {
    try {
      const response = await api.get('/usuarios');
      setFuncionarios(response.data.filter(u => u.pizzaria?._id === pizzaria._id));
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSaveDados = async () => {
    try {
      await api.put(`/pizzarias/${pizzaria._id}`, formData);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar pizzaria:', error);
      alert('Erro ao atualizar pizzaria');
    }
  };

  const tabs = [
    { key: 'dados', label: 'Dados Gerais', icon: Edit },
    { key: 'cardapio', label: 'Cardápio', icon: Utensils },
    { key: 'funcionarios', label: 'Funcionários', icon: Users },
    { key: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div>
            <h3 className="text-xl font-medium text-gray-900">Editar Pizzaria</h3>
            <p className="text-sm text-gray-500">{pizzaria.nome}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${
                  activeTab === tab.key
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {activeTab === 'dados' && (
            <DadosGeraisTab 
              formData={formData} 
              updateField={updateField}
              onSave={handleSaveDados}
            />
          )}
          
          {activeTab === 'cardapio' && (
            <CardapioTab 
              pizzaria={pizzaria}
              cardapio={cardapio}
              onUpdate={loadCardapio}
            />
          )}
          
          {activeTab === 'funcionarios' && (
            <FuncionariosTab 
              pizzaria={pizzaria}
              funcionarios={funcionarios}
              onUpdate={loadFuncionarios}
            />
          )}
          
          {activeTab === 'configuracoes' && (
            <ConfiguracoesTab 
              formData={formData}
              pizzariaId={pizzaria._id}
              updateField={updateField}
              onSave={handleSaveDados}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const DadosGeraisTab = ({ formData, updateField, onSave }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome da Pizzaria</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => updateField('nome', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      {/* Endereço */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Endereço</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Rua"
            value={formData.endereco.rua || ''}
            onChange={(e) => updateField('endereco.rua', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="text"
            placeholder="Número"
            value={formData.endereco.numero || ''}
            onChange={(e) => updateField('endereco.numero', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="text"
            placeholder="Bairro"
            value={formData.endereco.bairro || ''}
            onChange={(e) => updateField('endereco.bairro', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="text"
            placeholder="Cidade"
            value={formData.endereco.cidade || ''}
            onChange={(e) => updateField('endereco.cidade', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="text"
            placeholder="CEP"
            value={formData.endereco.cep || ''}
            onChange={(e) => updateField('endereco.cep', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>

      {/* Contato */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Contato</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            placeholder="Telefone"
            value={formData.contato.telefone || ''}
            onChange={(e) => updateField('contato.telefone', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.contato.email || ''}
            onChange={(e) => updateField('contato.email', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="tel"
            placeholder="WhatsApp"
            value={formData.contato.whatsapp || ''}
            onChange={(e) => updateField('contato.whatsapp', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full bg-gold-600 text-white py-2 px-4 rounded-md hover:bg-gold-700"
      >
        Salvar Dados
      </button>
    </div>
  );
};

const CardapioTab = ({ pizzaria, cardapio, onUpdate }) => {
  const [showNovoItem, setShowNovoItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('pizza');

  const categorias = [
    { key: 'pizza', label: 'Pizzas', icon: '🍕' },
    { key: 'sabor', label: 'Sabores', icon: '🧄' },
    { key: 'bebida', label: 'Bebidas', icon: '🥤' },
    { key: 'borda', label: 'Bordas', icon: '🍞' },
    { key: 'combo', label: 'Combos', icon: '🎯' }
  ];

  const toggleDisponibilidade = async (itemId) => {
    try {
      await api.patch(`/cardapio/${itemId}/toggle-disponibilidade`);
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar disponibilidade:', error);
    }
  };

  const toggleVisibilidadeCardapio = async (itemId) => {
    try {
      await api.patch(`/cardapio/${itemId}/toggle-visibilidade-cardapio`);
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar visibilidade no cardápio:', error);
      alert('Erro ao alterar visibilidade no cardápio');
    }
  };

  const excluirItem = async (item) => {
    const confirmacao = window.confirm(`Tem certeza que deseja excluir "${item.nome}"?\n\nEsta ação não pode ser desfeita.`);
    
    if (confirmacao) {
      try {
        await api.delete(`/cardapio/${item._id}`);
        alert('Item excluído com sucesso!');
        onUpdate();
      } catch (error) {
        console.error('Erro ao excluir item:', error);
        alert('Erro ao excluir item. Tente novamente.');
      }
    }
  };

  const activeCategoryData = categorias.find(cat => cat.key === activeCategory);
  const itensAtivos = cardapio.filter(item => item.categoria === activeCategory);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-900">Cardápio</h4>
        <button
          onClick={() => setShowNovoItem(true)}
          className="flex items-center space-x-2 bg-gold-600 text-white px-3 py-2 rounded-md hover:bg-gold-700"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Item</span>
        </button>
      </div>

      {/* Abas das categorias */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {categorias.map((categoria) => {
            const itemCount = cardapio.filter(item => item.categoria === categoria.key).length;
            const isActive = categoria.key === activeCategory;
            
            return (
              <button
                key={categoria.key}
                onClick={() => setActiveCategory(categoria.key)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2 text-lg">{categoria.icon}</span>
                {categoria.label}
                {itemCount > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    isActive 
                      ? 'bg-gold-100 text-gold-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{activeCategoryData?.icon}</span>
            <h5 className="text-lg font-medium text-gray-900">{activeCategoryData?.label}</h5>
            <span className="text-sm text-gray-500">({itensAtivos.length} {itensAtivos.length === 1 ? 'item' : 'itens'})</span>
          </div>
        </div>

        {/* Lista de itens da categoria ativa */}
        {itensAtivos.length > 0 ? (
          <div className="grid gap-4">
            {itensAtivos.map(item => (
              <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h6 className="font-medium text-gray-900">{item.nome}</h6>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.disponivel 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.disponivel ? 'Disponível' : 'Indisponível'}
                      </span>
                      {item.categoria === 'pizza' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.visivelCardapio 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.visivelCardapio ? 'Visível no Cardápio' : 'Oculta do Cardápio'}
                        </span>
                      )}
                    </div>
                    {/* Para sabores, mostrar apenas ingredientes */}
                    {item.categoria === 'sabor' ? (
                      item.ingredientes && item.ingredientes.length > 0 && (
                        <p className="text-xs text-gray-600 italic mb-2">
                          {item.ingredientes.map(ing => ing.nome).join(', ')}
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-gray-600 mb-2">{item.descricao}</p>
                    )}
                    
                    {/* Mostrar itens do combo */}
                    {item.categoria === 'combo' && item.itensCombo && item.itensCombo.length > 0 && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-md border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-2 flex items-center">
                          <span className="mr-1">🎯</span>
                          Itens inclusos no combo:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.itensCombo.map((comboItem, index) => {
                            const getItemIcon = (tipo) => {
                              switch(tipo) {
                                case 'pizza': return '🍕';
                                case 'bebida': return '🥤';
                                case 'sabor': return '🧄';
                                default: return '📦';
                              }
                            };
                            
                            return (
                              <span 
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white border border-purple-300 text-purple-800 shadow-sm"
                              >
                                <span className="mr-1">{getItemIcon(comboItem.tipo)}</span>
                                <span className="font-medium">{comboItem.quantidade}x</span>
                                <span className="ml-1">{comboItem.item?.nome || comboItem.nome || `Item ${comboItem.tipo}`}</span>
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-xs text-purple-600 mt-2">
                          Total: {item.itensCombo.reduce((acc, item) => acc + item.quantidade, 0)} itens
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      {item.categoria !== 'sabor' && (
                        <p className="text-lg font-medium text-gold-600">
                          {typeof item.preco === 'number' && item.preco === 0 
                            ? 'Grátis' 
                            : `R$ ${typeof item.preco === 'number' ? item.preco.toFixed(2) : '0.00'}`
                          }
                        </p>
                      )}
                      {item.categoria === 'sabor' && item.valorEspecial > 0 && (
                        <p className="text-sm text-purple-600">
                          + R$ {item.valorEspecial.toFixed(2)} por sabor
                        </p>
                      )}
                      {item.categoria === 'bebida' && item.valorEspecial > 0 && (
                        <p className="text-sm text-cyan-600">
                          + R$ {item.valorEspecial.toFixed(2)} valor premium
                        </p>
                      )}
                      {item.categoria === 'borda' && item.valorEspecial > 0 && (
                        <p className="text-sm text-amber-600">
                          + R$ {item.valorEspecial.toFixed(2)} valor especial
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-gold-600 hover:text-gold-800 hover:bg-gold-50 rounded-md transition-colors"
                      title="Editar item"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {item.categoria === 'pizza' && (
                      <button
                        onClick={() => toggleVisibilidadeCardapio(item._id)}
                        className={`p-2 rounded-md transition-colors ${
                          item.visivelCardapio 
                            ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={item.visivelCardapio ? 'Ocultar do cardápio' : 'Mostrar no cardápio'}
                      >
                        {item.visivelCardapio ? '👁️' : '🚫'}
                      </button>
                    )}
                    <button
                      onClick={() => toggleDisponibilidade(item._id)}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                      title={item.disponivel ? 'Tornar indisponível' : 'Tornar disponível'}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => excluirItem(item)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      title="Excluir item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <span className="text-6xl mb-4 block">{activeCategoryData?.icon}</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item em {activeCategoryData?.label}</h3>
            <p className="text-sm mb-4">Adicione o primeiro item desta categoria</p>
            <button
              onClick={() => setShowNovoItem(true)}
              className="inline-flex items-center space-x-2 bg-gold-600 text-white px-4 py-2 rounded-md hover:bg-gold-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Novo {activeCategoryData?.label.slice(0, -1)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Novo Item */}
      {showNovoItem && (
        <NovoItemModal
          pizzaria={pizzaria}
          defaultCategory={activeCategory}
          onClose={() => setShowNovoItem(false)}
          onSuccess={(newItem) => {
            setShowNovoItem(false);
            if (newItem?.categoria) {
              setActiveCategory(newItem.categoria);
            }
            onUpdate();
          }}
        />
      )}

      {/* Modal Editar Item */}
      {editingItem && (
        <EditarItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

const FuncionariosTab = ({ pizzaria, funcionarios, onUpdate }) => {
  return (
    <FuncionariosDashboard pizzaria={pizzaria} onUpdate={onUpdate} />
  );
};


const ConfiguracoesTab = ({ formData, pizzariaId, updateField, onSave }) => {


  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium text-gray-900">Configurações da Pizzaria</h4>
      
      {/* Horário de Funcionamento */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Horário de Funcionamento</h5>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Abertura</label>
            <input
              type="time"
              value={formData.configuracoes?.horarioFuncionamento?.abertura || '18:00'}
              onChange={(e) => updateField('configuracoes.horarioFuncionamento.abertura', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Fechamento</label>
            <input
              type="time"
              value={formData.configuracoes?.horarioFuncionamento?.fechamento || '23:00'}
              onChange={(e) => updateField('configuracoes.horarioFuncionamento.fechamento', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </div>

      {/* Valores */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Valores e Tempos</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Taxa de Entrega (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.configuracoes?.taxaEntrega || 5.00}
              onChange={(e) => updateField('configuracoes.taxaEntrega', parseFloat(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Tempo Preparo (min)</label>
            <input
              type="number"
              value={formData.configuracoes?.tempoPreparoMedio || 30}
              onChange={(e) => updateField('configuracoes.tempoPreparoMedio', parseInt(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Comissão Motoboy (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.configuracoes?.comissaoMotoboy || 2.50}
              onChange={(e) => updateField('configuracoes.comissaoMotoboy', parseFloat(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>


      <button
        onClick={onSave}
        className="w-full bg-gold-600 text-white py-2 px-4 rounded-md hover:bg-gold-700"
      >
        Salvar Configurações
      </button>

    </div>
  );
};

const NovoItemModal = ({ pizzaria, defaultCategory = 'pizza', onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: defaultCategory,
    preco: '',
    valorEspecial: '',
    quantidadeFatias: '', // Para pizzas: número de fatias
    quantidadeSabores: '', // Para pizzas: máximo de sabores
    visivelCardapio: true, // Para pizzas: visibilidade no cardápio
    itensCombo: [],
    tamanhos: [{ nome: '', preco: '', descricao: '' }],
    tamanhosSelecionados: [],
    ingredientes: [], // Lista de ingredientes do sabor
    pizzaria: pizzaria._id
  });
  const [pizzasDisponiveis, setPizzasDisponiveis] = useState([]);
  const [bebidasDisponiveis, setBebidasDisponiveis] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Carregar pizzas disponíveis (para seleção em sabores e combos)
      const pizzasResponse = await api.get(`/cardapio/pizzaria/${pizzaria._id}`);
      const pizzas = pizzasResponse.data.filter(item => item.categoria === 'pizza');
      const bebidas = pizzasResponse.data.filter(item => item.categoria === 'bebida');
      
      setPizzasDisponiveis(pizzas);
      setBebidasDisponiveis(bebidas);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações básicas no frontend
    if (!formData.nome.trim()) {
      alert('Nome do item é obrigatório');
      return;
    }
    
    if (formData.categoria !== 'sabor' && !formData.descricao.trim()) {
      alert('Descrição é obrigatória');
      return;
    }
    
    if (formData.categoria === 'pizza') {
      if (!formData.quantidadeFatias || formData.quantidadeFatias === '' || parseInt(formData.quantidadeFatias) <= 0) {
        alert('Quantidade de fatias deve ser maior que zero');
        return;
      }
      if (!formData.quantidadeSabores || formData.quantidadeSabores === '' || parseInt(formData.quantidadeSabores) <= 0) {
        alert('Quantidade de sabores deve ser maior que zero');
        return;
      }
      if (!formData.preco || parseFloat(formData.preco) <= 0) {
        alert('Preço da pizza deve ser maior que zero');
        return;
      }
    }
    
    try {
      let dataToSend = { ...formData };
      
      if (formData.categoria === 'pizza') {
        // Para pizzas, usar propriedades diretas em vez de tipoPizza
        const fatias = parseInt(formData.quantidadeFatias);
        const sabores = parseInt(formData.quantidadeSabores);
        const preco = parseFloat(formData.preco);
        
        // Verificar se os valores são válidos
        if (isNaN(fatias) || fatias <= 0) {
          alert('Quantidade de fatias deve ser um número válido maior que zero');
          return;
        }
        if (isNaN(sabores) || sabores <= 0) {
          alert('Quantidade de sabores deve ser um número válido maior que zero');
          return;
        }
        if (isNaN(preco) || preco <= 0) {
          alert('Preço deve ser um número válido maior que zero');
          return;
        }
        
        dataToSend = {
          nome: formData.nome,
          descricao: formData.descricao,
          categoria: formData.categoria,
          quantidadeFatias: fatias,
          quantidadeSabores: sabores,
          preco: preco,
          valorEspecial: 0,
          visivelCardapio: formData.visivelCardapio,
          pizzaria: formData.pizzaria
        };
      } else if (formData.categoria === 'sabor') {
        // Para sabores, usar valorEspecial e gerar descrição automática
        dataToSend = {
          ...formData,
          preco: 0,
          tipoSabor: formData.tipoSabor || 'salgado',
          descricao: `Sabor ${formData.nome}`, // Descrição automática para sabores
          valorEspecial: parseFloat(formData.valorEspecial),
          tamanhos: undefined,
          itensCombo: undefined
        };
      } else if (formData.categoria === 'bebida') {
        // Para bebidas, validar se pelo menos um tamanho foi selecionado
        if (!formData.tamanhosSelecionados || formData.tamanhosSelecionados.length === 0) {
          alert('Selecione pelo menos um tamanho para a bebida');
          return;
        }

        // Criar um item separado para cada tamanho selecionado
        const itensParaCriar = formData.tamanhosSelecionados.map(tamanho => ({
          nome: `${formData.nome} ${tamanho}`,
          descricao: `${formData.descricao} - ${tamanho}`,
          categoria: 'bebida',
          preco: parseFloat(formData.preco),
          valorEspecial: parseFloat(formData.valorEspecial) || 0,
          tamanho: tamanho, // Guardar o tamanho para referência
          pizzaria: formData.pizzaria,
          tamanhos: undefined,
          itensCombo: undefined,
          tipoPizza: undefined
        }));

        // Criar todos os itens
        for (const itemData of itensParaCriar) {
          await api.post('/cardapio', itemData);
        }
        
        alert(`${itensParaCriar.length} ${itensParaCriar.length === 1 ? 'item criado' : 'itens criados'} com sucesso!`);
        
        // Recarregar dados para atualizar a interface
        await loadInitialData();
        
        onSuccess({ categoria: formData.categoria });
        return; // Sair da função aqui pois já criamos todos os itens
      } else if (formData.categoria === 'borda') {
        // Para bordas, usar preço base e valor especial
        dataToSend = {
          ...formData,
          preco: parseFloat(formData.preco),
          valorEspecial: parseFloat(formData.valorEspecial) || 0,
          tamanhos: undefined,
          itensCombo: undefined,
          tipoPizza: undefined
        };
      } else if (formData.categoria === 'combo') {
        // Para combos, usar itensCombo e preço fixo
        dataToSend = {
          ...formData,
          preco: parseFloat(formData.preco),
          itensCombo: formData.itensCombo,
          valorEspecial: 0,
          tamanhos: undefined,
          tipoPizza: undefined
        };
      }
      
      const response = await api.post('/cardapio', dataToSend);
      alert('Item criado com sucesso!');
      
      // Recarregar dados para atualizar a interface
      await loadInitialData();
      
      onSuccess(response.data);
    } catch (error) {
      console.error('Erro ao criar item:', error);
      
      // Mensagens de erro mais específicas
      const errorMessage = error.response?.data?.message;
      const errorStatus = error.response?.status;
      
      if (errorStatus === 401) {
        alert('Sessão expirada. Você será redirecionado para fazer login novamente.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (errorMessage) {
        if (errorMessage.includes('vinculado ao tipo de pizza selecionado')) {
          alert(`❌ ${errorMessage}`);
        } else if (errorMessage.includes('já existe') || errorMessage.includes('duplicate')) {
          alert(`Erro: Já existe um item com o nome "${formData.nome}". Por favor, use um nome diferente.`);
        } else if (errorMessage.includes('Acesso negado')) {
          alert('Erro: Você não tem permissão para criar itens do cardápio.');
        } else if (errorMessage.includes('TipoPizza')) {
          alert('Erro: Tipo de pizza inválido. Verifique se o tipo selecionado existe.');
        } else {
          alert(`Erro: ${errorMessage}`);
        }
      } else {
        alert('Erro ao criar item do cardápio. Verifique sua conexão e tente novamente.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Novo Item do Cardápio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Categoria - Primeiro campo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="pizza">Pizza</option>
              <option value="sabor">Sabor</option>
              <option value="bebida">Bebida</option>
              <option value="borda">Borda</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Campos básicos */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder={`Nome ${formData.categoria === 'pizza' ? 'da pizza' : formData.categoria === 'sabor' ? 'do sabor' : formData.categoria === 'bebida' ? 'da bebida' : 'do combo'}`}
              />
            </div>

            {formData.categoria !== 'sabor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  rows="3"
                  placeholder={`Descrição ${formData.categoria === 'pizza' ? 'da pizza' : formData.categoria === 'bebida' ? 'da bebida' : 'do combo'}`}
                />
              </div>
            )}
          </div>

          {/* Campos condicionais por categoria */}
          {formData.categoria === 'pizza' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Pizza</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Propriedades da Pizza */}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Fatias</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.quantidadeFatias}
                    onChange={(e) => setFormData({...formData, quantidadeFatias: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Ex: 8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Máximo de Sabores</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.quantidadeSabores}
                    onChange={(e) => setFormData({...formData, quantidadeSabores: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Ex: 2"
                  />
                </div>
                
                {/* Definição do preço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço da Pizza (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  
                  {formData.quantidadeFatias && formData.quantidadeSabores && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <h6 className="font-medium text-green-900 mb-1">✅ Configuração:</h6>
                      <div className="text-sm text-green-800">
                        <div>Fatias: <strong>{formData.quantidadeFatias}</strong></div>
                        <div>Max Sabores: <strong>{formData.quantidadeSabores}</strong></div>
                        {formData.preco && <div>Preço: <strong>R$ {parseFloat(formData.preco).toFixed(2)}</strong></div>}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Campo de visibilidade no cardápio */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.visivelCardapio}
                      onChange={(e) => setFormData({...formData, visivelCardapio: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">Visível no Cardápio</span>
                      <span className="text-xs text-gray-500">Se desmarcado, a pizza não aparecerá para os clientes</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h6 className="font-medium text-blue-900 mb-2">💡 Como funciona:</h6>
                <ul className="text-sm text-blue-800 flex flex-col gap-1">
                  <li>• Esta pizza herda apenas <strong>fatias</strong> e <strong>max sabores</strong> do tipo escolhido</li>
                  <li>• O <strong>preço é definido aqui</strong> no cardápio (não nas configurações)</li>
                  <li>• Cliente escolhe: Esta pizza + Sabores</li>
                  <li>• Preço final = Preço definido + (Valores especiais dos sabores × Qtd sabores)</li>
                </ul>
              </div>
            </div>
          )}

          {formData.categoria === 'sabor' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configurações do Sabor</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo do Sabor</label>
                  <select
                    value={formData.tipoSabor}
                    onChange={(e) => setFormData({...formData, tipoSabor: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="salgado">🧄 Salgado</option>
                    <option value="doce">🍰 Doce</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valorEspecial}
                    onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mb-4">Valor adicional que será multiplicado pela quantidade de sabores</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes do Sabor</label>
                <p className="text-xs text-gray-500 mb-3">Os ingredientes serão gerenciados após salvar o sabor</p>
                <div className="bg-gray-50 p-3 rounded-md border">
                  <p className="text-sm text-gray-600">💡 Após criar o sabor, você poderá adicionar ingredientes através do botão "Gerenciar Ingredientes"</p>
                </div>
              </div>

            </div>
          )}

          {formData.categoria === 'bebida' && (
            <div className="border border-cyan-200 rounded-lg p-4 bg-cyan-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Bebida</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preço base da bebida</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorEspecial || ''}
                    onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor adicional para bebidas especiais/premium (deixe 0 para bebidas normais)</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tamanhos Disponíveis</label>
                <p className="text-xs text-gray-500 mb-3">Selecione os tamanhos. Cada tamanho será criado como um item separado no cardápio.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['200ml', '350ml', '500ml', '600ml', '1L', '1.5L', '2L', '2.5L'].map(tamanho => (
                    <label key={tamanho} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.tamanhosSelecionados?.includes(tamanho) || false}
                        onChange={(e) => {
                          const tamanhosSelecionados = formData.tamanhosSelecionados || [];
                          const novosTamanhos = e.target.checked
                            ? [...tamanhosSelecionados, tamanho]
                            : tamanhosSelecionados.filter(t => t !== tamanho);
                          setFormData({...formData, tamanhosSelecionados: novosTamanhos});
                        }}
                        className="text-cyan-600"
                      />
                      <span className="text-sm">{tamanho}</span>
                    </label>
                  ))}
                </div>
                
                <div className="mt-3 p-2 bg-blue-50 rounded border">
                  <p className="text-xs text-blue-700">
                    <strong>Exemplo:</strong> Se você selecionar "Coca-Cola" como nome e os tamanhos "350ml" e "600ml", 
                    serão criados dois itens: "Coca-Cola 350ml" e "Coca-Cola 600ml"
                  </p>
                </div>
              </div>
            </div>
          )}

          {formData.categoria === 'borda' && (
            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Borda</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preço base da borda (digite 0 para bordas grátis)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorEspecial || ''}
                    onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor adicional para bordas especiais (ex: catupiry, cheddar)</p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-50 rounded border">
                <p className="text-xs text-yellow-700">
                  <strong>Dicas:</strong> Use preço base 0 para bordas grátis tradicionais. 
                  Valor especial para bordas premium como catupiry, cheddar, etc.
                </p>
              </div>
            </div>
          )}

          {formData.categoria === 'combo' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configurações do Combo</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Preço do Combo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.preco}
                  onChange={(e) => setFormData({...formData, preco: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Itens do Combo</label>
                
                {/* Pizzas no combo */}
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-600 mb-2">Pizzas</h5>
                  {pizzasDisponiveis.map(pizza => (
                    <label key={pizza._id} className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.itensCombo.some(item => item.item === pizza._id && item.tipo === 'pizza')}
                          onChange={(e) => {
                            let novosItens = [...formData.itensCombo];
                            if (e.target.checked) {
                              novosItens.push({ item: pizza._id, quantidade: 1, tipo: 'pizza' });
                            } else {
                              novosItens = novosItens.filter(item => !(item.item === pizza._id && item.tipo === 'pizza'));
                            }
                            setFormData({...formData, itensCombo: novosItens});
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{pizza.nome}</span>
                      </div>
                      {formData.itensCombo.some(item => item.item === pizza._id && item.tipo === 'pizza') && (
                        <input
                          type="number"
                          min="1"
                          value={formData.itensCombo.find(item => item.item === pizza._id && item.tipo === 'pizza')?.quantidade || 1}
                          onChange={(e) => {
                            const novosItens = formData.itensCombo.map(item => 
                              item.item === pizza._id && item.tipo === 'pizza'
                                ? { ...item, quantidade: parseInt(e.target.value) }
                                : item
                            );
                            setFormData({...formData, itensCombo: novosItens});
                          }}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      )}
                    </label>
                  ))}
                </div>

                {/* Bebidas no combo - Por tamanho */}
                <div>
                  <h5 className="text-sm font-medium text-gray-600 mb-2">Bebidas por Tamanho</h5>
                  <p className="text-xs text-gray-500 mb-3">
                    Especifique o tamanho e quantidade de bebidas. Os clientes poderão escolher qualquer bebida disponível no tamanho selecionado.
                  </p>
                  
                  {/* Tamanhos disponíveis baseados nas bebidas cadastradas */}
                  {(() => {
                    // Extrair tamanhos únicos das bebidas disponíveis
                    const tamanhosDisponiveis = [...new Set(bebidasDisponiveis.map(bebida => bebida.tamanho))].sort();
                    
                    return tamanhosDisponiveis.map(tamanho => {
                      // Encontrar uma bebida deste tamanho para usar como referência
                      const bebidaDoTamanho = bebidasDisponiveis.find(b => b.tamanho === tamanho);
                      const itemExistente = formData.itensCombo.find(item => item.tipo === 'bebida' && item.item === bebidaDoTamanho?._id);
                      
                      return (
                        <div key={tamanho} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!itemExistente}
                              onChange={(e) => {
                                let novosItens = [...formData.itensCombo];
                                if (e.target.checked && bebidaDoTamanho) {
                                  // Adicionar novo item de bebida por referência
                                  novosItens.push({ 
                                    item: bebidaDoTamanho._id,
                                    quantidade: 1, 
                                    tipo: 'bebida'
                                  });
                                } else if (bebidaDoTamanho) {
                                  // Remover item de bebida desta referência
                                  novosItens = novosItens.filter(item => !(item.tipo === 'bebida' && item.item === bebidaDoTamanho._id));
                                }
                                setFormData({...formData, itensCombo: novosItens});
                              }}
                              className="mr-3"
                            />
                            <div>
                              <span className="text-sm font-medium">{tamanho}</span>
                              <div className="text-xs text-gray-500">
                                Bebidas disponíveis: {bebidasDisponiveis.filter(b => b.tamanho === tamanho).length}
                              </div>
                            </div>
                          </div>
                          
                          {itemExistente && bebidaDoTamanho && (
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Quantidade:</label>
                              <input
                                type="number"
                                min="1"
                                value={itemExistente.quantidade || 1}
                                onChange={(e) => {
                                  const novosItens = formData.itensCombo.map(item => 
                                    item.tipo === 'bebida' && item.item === bebidaDoTamanho._id
                                      ? { ...item, quantidade: parseInt(e.target.value) || 1 }
                                      : item
                                  );
                                  setFormData({...formData, itensCombo: novosItens});
                                }}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  
                  {bebidasDisponiveis.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Nenhuma bebida cadastrada. Cadastre bebidas primeiro para configurar combos.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700"
            >
              Adicionar Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditarItemModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: item.nome || '',
    descricao: item.descricao || '',
    categoria: item.categoria || 'pizza',
    tipoSabor: item.tipoSabor || 'salgado',
    preco: item.preco || '',
    valorEspecial: item.valorEspecial || '',
    quantidadeFatias: item.quantidadeFatias || '',
    quantidadeSabores: item.quantidadeSabores || '',
    visivelCardapio: item.visivelCardapio !== undefined ? item.visivelCardapio : true,
    itensCombo: item.itensCombo?.map(comboItem => ({
      ...comboItem,
      item: comboItem.item?._id || comboItem.item // Extrair ID se for objeto populado, manter como está se já for ID
    })) || [],
    tamanhos: item.tamanhos && item.tamanhos.length > 0 ? item.tamanhos : [{ nome: '', preco: '', descricao: '' }],
  });
  
  const [ingredientes, setIngredientes] = useState([]);
  const [pizzasDisponiveis, setPizzasDisponiveis] = useState([]);
  const [bebidasDisponiveis, setBebidasDisponiveis] = useState([]);

  useEffect(() => {
    if (item.categoria === 'sabor') {
      loadIngredientes();
    } else {
      loadInitialData();
    }
  }, []);

  const loadIngredientes = async () => {
    // Para sabores, usar dados já disponíveis no item ao invés de fazer nova chamada
    setIngredientes(item.ingredientes || []);
  };

  const handleIngredientesChange = (novosIngredientes) => {
    setIngredientes(novosIngredientes);
  };

  const loadInitialData = async () => {
    try {
      // Carregar pizzas disponíveis (para seleção em combos)
      const pizzasResponse = await api.get(`/cardapio/pizzaria/${item.pizzaria}`);
      const pizzas = pizzasResponse.data.filter(i => i.categoria === 'pizza');
      const bebidas = pizzasResponse.data.filter(i => i.categoria === 'bebida');
      
      setPizzasDisponiveis(pizzas);
      setBebidasDisponiveis(bebidas);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações básicas no frontend
    if (!formData.nome.trim()) {
      alert('Nome do item é obrigatório');
      return;
    }
    
    if (formData.categoria !== 'sabor' && !formData.descricao.trim()) {
      alert('Descrição é obrigatória');
      return;
    }
    
    if (formData.categoria === 'pizza') {
      if (!formData.quantidadeFatias || formData.quantidadeFatias === '' || parseInt(formData.quantidadeFatias) <= 0) {
        alert('Quantidade de fatias deve ser maior que zero');
        return;
      }
      if (!formData.quantidadeSabores || formData.quantidadeSabores === '' || parseInt(formData.quantidadeSabores) <= 0) {
        alert('Quantidade de sabores deve ser maior que zero');
        return;
      }
      if (!formData.preco || parseFloat(formData.preco) <= 0) {
        alert('Preço da pizza deve ser maior que zero');
        return;
      }
    }
    
    try {
      let dataToSend = { ...formData };
      
      if (formData.categoria === 'pizza') {
        dataToSend = {
          ...formData,
          quantidadeFatias: parseInt(formData.quantidadeFatias) || 0,
          quantidadeSabores: parseInt(formData.quantidadeSabores) || 0,
          preco: parseFloat(formData.preco) || 0,
          valorEspecial: 0,
          tamanhos: undefined,
          itensCombo: undefined,
          pizzasCompativeis: undefined
        };
      } else if (formData.categoria === 'sabor') {
        // Usar endpoint específico de sabores
        await api.put(`/sabores/${item._id}`, {
          nome: formData.nome,
          descricao: `Sabor ${formData.nome}`, // Descrição automática para sabores
          tipoSabor: formData.tipoSabor,
          valorEspecial: parseFloat(formData.valorEspecial) || 0,
          ingredientes: ingredientes
        });
        alert('Sabor atualizado com sucesso!');
        onSuccess();
        return;
      } else if (formData.categoria === 'bebida') {
        dataToSend = {
          ...formData,
          preco: parseFloat(formData.preco),
          valorEspecial: parseFloat(formData.valorEspecial) || 0,
          tamanho: formData.tamanho,
          tamanhos: undefined,
          itensCombo: undefined,
          tipoPizza: undefined
        };
      } else if (formData.categoria === 'combo') {
        dataToSend = {
          ...formData,
          preco: parseFloat(formData.preco),
          itensCombo: formData.itensCombo,
          valorEspecial: 0,
          tamanhos: undefined,
          tipoPizza: undefined
        };
      }
      
      await api.put(`/cardapio/${item._id}`, dataToSend);
      alert('Item atualizado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      
      // Mensagens de erro mais específicas
      const errorMessage = error.response?.data?.message;
      const errorStatus = error.response?.status;
      
      if (errorStatus === 401) {
        alert('Sessão expirada. Você será redirecionado para fazer login novamente.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (errorMessage) {
        if (errorMessage.includes('vinculado ao tipo de pizza selecionado')) {
          alert(`❌ ${errorMessage}`);
        } else if (errorMessage.includes('já existe') || errorMessage.includes('duplicate')) {
          alert(`Erro: Já existe um item com o nome "${formData.nome}". Por favor, use um nome diferente.`);
        } else if (errorMessage.includes('Acesso negado')) {
          alert('Erro: Você não tem permissão para editar itens do cardápio.');
        } else if (errorMessage.includes('TipoPizza')) {
          alert('Erro: Tipo de pizza inválido. Verifique se o tipo selecionado existe.');
        } else {
          alert(`Erro: ${errorMessage}`);
        }
      } else {
        alert('Erro ao atualizar item do cardápio. Verifique sua conexão e tente novamente.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Editar Item do Cardápio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Categoria - DESABILITADA (não pode ser alterada) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            <p className="text-xs text-gray-500 mb-2">A categoria não pode ser alterada após a criação</p>
            <select
              value={formData.categoria}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            >
              <option value="pizza">Pizza</option>
              <option value="sabor">Sabor</option>
              <option value="bebida">Bebida</option>
              <option value="borda">Borda</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Campos básicos */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder={`Nome ${formData.categoria === 'pizza' ? 'da pizza' : formData.categoria === 'sabor' ? 'do sabor' : formData.categoria === 'bebida' ? 'da bebida' : 'do combo'}`}
              />
            </div>

            {formData.categoria !== 'sabor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  rows="3"
                  placeholder={`Descrição ${formData.categoria === 'pizza' ? 'da pizza' : formData.categoria === 'bebida' ? 'da bebida' : 'do combo'}`}
                />
              </div>
            )}
          </div>

          {/* Campos específicos por categoria */}
          {formData.categoria === 'pizza' && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Pizza</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Propriedades da Pizza */}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Fatias</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.quantidadeFatias}
                    onChange={(e) => setFormData({...formData, quantidadeFatias: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Ex: 8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Máximo de Sabores</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.quantidadeSabores}
                    onChange={(e) => setFormData({...formData, quantidadeSabores: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Ex: 2"
                  />
                </div>
                
                {/* Definição do preço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço da Pizza (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  
                  {formData.quantidadeFatias && formData.quantidadeSabores && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <h6 className="font-medium text-green-900 mb-1">✅ Configuração:</h6>
                      <div className="text-sm text-green-800">
                        <div>Fatias: <strong>{formData.quantidadeFatias}</strong></div>
                        <div>Max Sabores: <strong>{formData.quantidadeSabores}</strong></div>
                        {formData.preco && <div>Preço: <strong>R$ {parseFloat(formData.preco).toFixed(2)}</strong></div>}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Campo de visibilidade no cardápio */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.visivelCardapio}
                      onChange={(e) => setFormData({...formData, visivelCardapio: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">Visível no Cardápio</span>
                      <span className="text-xs text-gray-500">Se desmarcado, a pizza não aparecerá para os clientes</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {formData.categoria === 'sabor' && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações do Sabor</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo do Sabor</label>
                  <select
                    value={formData.tipoSabor}
                    onChange={(e) => setFormData({...formData, tipoSabor: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="salgado">🧄 Salgado</option>
                    <option value="doce">🍰 Doce</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Especial</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorEspecial}
                      onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mb-4">
                💡 Exemplo: Se valor = 5,00 e cliente escolhe 2 sabores, adiciona R$ 10,00 ao preço da pizza
              </p>

              <IngredientesManager 
                itemId={item._id} 
                ingredientes={ingredientes} 
                onIngredientesChange={handleIngredientesChange}
              />

            </div>
          )}

          {formData.categoria === 'bebida' && (
            <div className="border border-cyan-200 rounded-lg p-4 bg-cyan-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Bebida</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preço base da bebida</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorEspecial || ''}
                    onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor adicional para bebidas premium</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tamanho</label>
                  <input
                    type="text"
                    value={formData.tamanho}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tamanho não pode ser alterado</p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-blue-50 rounded border">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> Este é um item individual de bebida. Para criar novos tamanhos, 
                  use o botão "Novo Item" e selecione os tamanhos desejados.
                </p>
              </div>
            </div>
          )}

          {formData.categoria === 'borda' && (
            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
              <h4 className="font-medium text-gray-900 mb-3">Configurações da Borda</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preço base da borda (digite 0 para bordas grátis)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorEspecial || ''}
                    onChange={(e) => setFormData({...formData, valorEspecial: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor adicional para bordas especiais</p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-50 rounded border">
                <p className="text-xs text-yellow-700">
                  <strong>Dicas:</strong> Preço base 0 = "Grátis". Valor especial para bordas premium.
                </p>
              </div>
            </div>
          )}

          {formData.categoria === 'combo' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Configurações do Combo</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Preço do Combo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.preco}
                  onChange={(e) => setFormData({...formData, preco: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Itens do Combo</label>
                
                {/* Pizzas no combo */}
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-600 mb-2">Pizzas</h5>
                  {pizzasDisponiveis.map(pizza => (
                    <label key={pizza._id} className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.itensCombo.some(item => item.item === pizza._id && item.tipo === 'pizza')}
                          onChange={(e) => {
                            let novosItens = [...formData.itensCombo];
                            if (e.target.checked) {
                              novosItens.push({ item: pizza._id, quantidade: 1, tipo: 'pizza' });
                            } else {
                              novosItens = novosItens.filter(item => !(item.item === pizza._id && item.tipo === 'pizza'));
                            }
                            setFormData({...formData, itensCombo: novosItens});
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{pizza.nome}</span>
                      </div>
                      {formData.itensCombo.some(item => item.item === pizza._id && item.tipo === 'pizza') && (
                        <input
                          type="number"
                          min="1"
                          value={formData.itensCombo.find(item => item.item === pizza._id && item.tipo === 'pizza')?.quantidade || 1}
                          onChange={(e) => {
                            const novosItens = formData.itensCombo.map(item => 
                              item.item === pizza._id && item.tipo === 'pizza'
                                ? { ...item, quantidade: parseInt(e.target.value) }
                                : item
                            );
                            setFormData({...formData, itensCombo: novosItens});
                          }}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      )}
                    </label>
                  ))}
                </div>

                {/* Bebidas no combo - Por tamanho */}
                <div>
                  <h5 className="text-sm font-medium text-gray-600 mb-2">Bebidas por Tamanho</h5>
                  <p className="text-xs text-gray-500 mb-3">
                    Especifique o tamanho e quantidade de bebidas. Os clientes poderão escolher qualquer bebida disponível no tamanho selecionado.
                  </p>
                  
                  {/* Tamanhos disponíveis baseados nas bebidas cadastradas */}
                  {(() => {
                    // Extrair tamanhos únicos das bebidas disponíveis
                    const tamanhosDisponiveis = [...new Set(bebidasDisponiveis.map(bebida => bebida.tamanho))].sort();
                    
                    return tamanhosDisponiveis.map(tamanho => {
                      // Encontrar uma bebida deste tamanho para usar como referência
                      const bebidaDoTamanho = bebidasDisponiveis.find(b => b.tamanho === tamanho);
                      const itemExistente = formData.itensCombo.find(item => item.tipo === 'bebida' && item.item === bebidaDoTamanho?._id);
                      
                      return (
                        <div key={tamanho} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!itemExistente}
                              onChange={(e) => {
                                let novosItens = [...formData.itensCombo];
                                if (e.target.checked && bebidaDoTamanho) {
                                  // Adicionar novo item de bebida por referência
                                  novosItens.push({ 
                                    item: bebidaDoTamanho._id,
                                    quantidade: 1, 
                                    tipo: 'bebida'
                                  });
                                } else if (bebidaDoTamanho) {
                                  // Remover item de bebida desta referência
                                  novosItens = novosItens.filter(item => !(item.tipo === 'bebida' && item.item === bebidaDoTamanho._id));
                                }
                                setFormData({...formData, itensCombo: novosItens});
                              }}
                              className="mr-3"
                            />
                            <div>
                              <span className="text-sm font-medium">{tamanho}</span>
                              <div className="text-xs text-gray-500">
                                Bebidas disponíveis: {bebidasDisponiveis.filter(b => b.tamanho === tamanho).length}
                              </div>
                            </div>
                          </div>
                          
                          {itemExistente && bebidaDoTamanho && (
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Quantidade:</label>
                              <input
                                type="number"
                                min="1"
                                value={itemExistente.quantidade || 1}
                                onChange={(e) => {
                                  const novosItens = formData.itensCombo.map(item => 
                                    item.tipo === 'bebida' && item.item === bebidaDoTamanho._id
                                      ? { ...item, quantidade: parseInt(e.target.value) || 1 }
                                      : item
                                  );
                                  setFormData({...formData, itensCombo: novosItens});
                                }}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  
                  {bebidasDisponiveis.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Nenhuma bebida cadastrada. Cadastre bebidas primeiro para configurar combos.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}


          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PizzariaDetailView = ({ pizzaria, onBack, isAdminPizzaria }) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Recuperar aba ativa do localStorage para esta pizzaria
    return localStorage.getItem(`pizzariaDetailTab_${pizzaria._id}`) || 'dashboard';
  });
  const [pedidos, setPedidos] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [stats, setStats] = useState({
    pedidosHoje: 0,
    pedidosAndamento: 0,
    faturamentoDia: 0,
    itensCardapio: 0,
    totalFuncionarios: 0,
    totalMotoboys: 0
  });

  // Salvar aba ativa do detalhe da pizzaria no localStorage
  useEffect(() => {
    localStorage.setItem(`pizzariaDetailTab_${pizzaria._id}`, activeTab);
  }, [activeTab, pizzaria._id]);

  // Função para alterar aba na view de detalhes
  const handleDetailTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Carregar pedidos
      const pedidosResponse = await api.get(`/pedidos/pizzaria/${pizzaria._id}`);
      setPedidos(pedidosResponse.data.pedidos || []);

      // Carregar cardápio
      const cardapioResponse = await api.get(`/cardapio/pizzaria/${pizzaria._id}`);
      setCardapio(cardapioResponse.data);

      // Carregar funcionários
      const funcionariosResponse = await api.get('/usuarios');
      const funcionariosPizzaria = funcionariosResponse.data.filter(u => u.pizzaria?._id === pizzaria._id);
      setFuncionarios(funcionariosPizzaria);

      // Calcular estatísticas
      const hoje = new Date().toDateString();
      const pedidosHoje = pedidosResponse.data.pedidos?.filter(p => 
        new Date(p.createdAt).toDateString() === hoje
      ) || [];
      const pedidosAndamento = pedidosResponse.data.pedidos?.filter(p => 
        ['recebido', 'preparando', 'pronto', 'saiu_entrega'].includes(p.status)
      ) || [];
      const faturamentoDia = pedidosHoje
        .filter(p => p.status === 'entregue')
        .reduce((sum, p) => sum + p.valores.total, 0);

      setStats({
        pedidosHoje: pedidosHoje.length,
        pedidosAndamento: pedidosAndamento.length,
        faturamentoDia,
        itensCardapio: cardapioResponse.data.length,
        totalFuncionarios: funcionariosPizzaria.length,
        totalMotoboys: funcionariosPizzaria.filter(u => u.role === 'motoboy').length
      });
    } catch (error) {
      console.error('Erro ao carregar dados da pizzaria:', error);
    }
  };

  const loadCardapio = async () => {
    try {
      const response = await api.get(`/cardapio/pizzaria/${pizzaria._id}`);
      setCardapio(response.data);
      
      // Atualizar apenas estatística do cardápio
      setStats(prev => ({
        ...prev,
        itensCardapio: response.data.length
      }));
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
    }
  };

  const loadFuncionarios = async () => {
    try {
      const response = await api.get('/usuarios');
      const funcionariosPizzaria = response.data.filter(u => u.pizzaria?._id === pizzaria._id);
      setFuncionarios(funcionariosPizzaria);
      
      // Atualizar apenas estatísticas de funcionários
      setStats(prev => ({
        ...prev,
        totalFuncionarios: funcionariosPizzaria.length,
        totalMotoboys: funcionariosPizzaria.filter(u => u.role === 'motoboy').length
      }));
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  // Abas padrão para visualização da pizzaria (mesmo para admin geral e admin da pizzaria)
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
    { key: 'cozinha', label: 'Cozinha', icon: Pizza },
    { key: 'cardapio', label: 'Cardápio', icon: Utensils },
    { key: 'funcionarios', label: 'Funcionários', icon: Users },
    { key: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pizzaria.nome}</h1>
            <p className="text-sm text-gray-500">
              {pizzaria.endereco.bairro}, {pizzaria.endereco.cidade}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          pizzaria.ativa 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {pizzaria.ativa ? 'Ativa' : 'Inativa'}
        </div>
      </div>

      {/* Navegação por abas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleDetailTabChange(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das abas */}
      <div>
        {activeTab === 'dashboard' && (
          <PizzariaDashboardTab stats={stats} pizzaria={pizzaria} pedidos={pedidos} />
        )}
        {activeTab === 'pedidos' && (
          <PedidosDashboard />
        )}
        {activeTab === 'cozinha' && (
          <CozinhaDashboard />
        )}
        {activeTab === 'cardapio' && (
          <CardapioTab 
            pizzaria={pizzaria}
            cardapio={cardapio}
            onUpdate={loadCardapio}
          />
        )}
        {activeTab === 'funcionarios' && (
          <FuncionariosTab 
            pizzaria={pizzaria}
            funcionarios={funcionarios}
            onUpdate={loadFuncionarios}
          />
        )}
        {activeTab === 'configuracoes' && (
          <PizzariaConfigTab pizzaria={pizzaria} />
        )}
      </div>
    </div>
  );
};

const PizzariaDashboardTab = ({ stats, pizzaria, pedidos }) => {
  const pedidosArray = Array.isArray(pedidos) ? pedidos : [];
  const pedidosRecentes = pedidosArray.slice(0, 5);
  
  return (
    <div className="flex flex-col gap-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pedidos Hoje</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pedidosHoje}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Em Andamento</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pedidosAndamento}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faturamento Hoje</p>
              <p className="text-2xl font-semibold text-gray-900">R$ {stats.faturamentoDia.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Utensils className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Itens Cardápio</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.itensCardapio}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informações da pizzaria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Informações</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {pizzaria.endereco.rua}, {pizzaria.endereco.numero} - {pizzaria.endereco.bairro}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">{pizzaria.contato.telefone}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {pizzaria.configuracoes?.horarioFuncionamento?.abertura} às {pizzaria.configuracoes?.horarioFuncionamento?.fechamento}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Taxa entrega: R$ {pizzaria.configuracoes?.taxaEntrega?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pedidos Recentes</h3>
          {pedidosRecentes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {pedidosRecentes.map(pedido => (
                <div key={pedido._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{String(pedido.numero).padStart(3, '0')}</p>
                    <p className="text-xs text-gray-500">{pedido.cliente.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">R$ {pedido.valores.total.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pedido.status === 'entregue' ? 'bg-green-100 text-green-800' :
                      pedido.status === 'saiu_entrega' ? 'bg-orange-100 text-orange-800' :
                      pedido.status === 'pronto' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pedido.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum pedido recente</p>
          )}
        </div>
      </div>
    </div>
  );
};


const PizzariaConfigTab = ({ pizzaria, onUpdate }) => {
  const [formData, setFormData] = useState({
    configuracoes: pizzaria.configuracoes || {}
  });


  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSave = async () => {
    try {
      await api.put(`/pizzarias/${pizzaria._id}`, formData);
      onUpdate();
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações da Pizzaria</h3>
      
      <div className="flex flex-col gap-6">
        {/* Horário de Funcionamento */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Horário de Funcionamento</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700">Abertura</label>
              <input
                type="time"
                value={formData.configuracoes?.horarioFuncionamento?.abertura || '18:00'}
                onChange={(e) => updateField('configuracoes.horarioFuncionamento.abertura', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Fechamento</label>
              <input
                type="time"
                value={formData.configuracoes?.horarioFuncionamento?.fechamento || '23:00'}
                onChange={(e) => updateField('configuracoes.horarioFuncionamento.fechamento', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Valores */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Valores e Configurações</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700">Taxa de Entrega (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.configuracoes?.taxaEntrega || 5.00}
                onChange={(e) => updateField('configuracoes.taxaEntrega', parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Tempo Preparo Médio (min)</label>
              <input
                type="number"
                value={formData.configuracoes?.tempoPreparoMedio || 30}
                onChange={(e) => updateField('configuracoes.tempoPreparoMedio', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Comissão Motoboy (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.configuracoes?.comissaoMotoboy || 2.50}
                onChange={(e) => updateField('configuracoes.comissaoMotoboy', parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>


        <button
          onClick={handleSave}
          className="w-full bg-gold-600 text-white py-2 px-4 rounded-md hover:bg-gold-700"
        >
          Salvar Configurações
        </button>

      </div>
    </div>
  );
};

const NovoAdminModal = ({ onClose, onSuccess, pizzarias }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    pizzaria: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/usuarios', {
        ...formData,
        role: 'admin_pizzaria'
      });
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Novo Administrador</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pizzaria
            </label>
            <select
              name="pizzaria"
              value={formData.pizzaria}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="">Selecione uma pizzaria</option>
              {pizzarias.map(pizzaria => (
                <option key={pizzaria._id} value={pizzaria._id}>
                  {pizzaria.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Administrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditarAdminModal = ({ usuario, onClose, onSuccess, pizzarias }) => {
  const [formData, setFormData] = useState({
    name: usuario.name || '',
    email: usuario.email || '',
    pizzaria: usuario.pizzaria?._id || usuario.pizzaria || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.put(`/usuarios/${usuario._id}`, formData);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao atualizar administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Editar Administrador</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pizzaria
            </label>
            <select
              name="pizzaria"
              value={formData.pizzaria}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="">Selecione uma pizzaria</option>
              {pizzarias.map(pizzaria => (
                <option key={pizzaria._id} value={pizzaria._id}>
                  {pizzaria.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;