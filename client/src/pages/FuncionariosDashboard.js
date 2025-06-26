import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Eye, 
  EyeOff,
  Key,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Shield,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const FuncionariosDashboard = ({ pizzaria, onUpdate }) => {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [pizzarias, setPizzarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPizzaria, setSelectedPizzaria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    telefone: '',
    salario: '',
    dataAdmissao: '',
    permissoesCozinha: {
      preparo: false,
      finalizacao: false,
      expedicao: false
    },
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      cep: ''
    },
    dadosMotoboy: {
      veiculo: '',
      placa: '',
      cnh: ''
    },
    ativo: true
  });

  const roles = [
    { value: 'admin_pizzaria', label: 'Admin da Pizzaria' },
    { value: 'atendente', label: 'Atendente' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'motoboy', label: 'Motoboy' }
  ];

  useEffect(() => {
    loadFuncionarios();
    if (!pizzaria && user?.role === 'admin') {
      loadPizzarias();
    }
  }, [selectedPizzaria, pizzaria]);

  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      // Se recebeu pizzaria como prop, usar o ID dela
      const pizzariaId = pizzaria?._id || selectedPizzaria;
      const params = pizzariaId ? { pizzaria_id: pizzariaId } : {};
      const response = await api.get('/funcionarios', { params });
      setFuncionarios(response.data || []);
      console.log('Funcionários carregados:', response.data);
      
      // Chamar callback de atualização se fornecido
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      setFuncionarios([]);
      showAlert('Erro ao carregar funcionários: ' + (error.response?.data?.message || error.message), 'error');
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

  const showAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      telefone: '',
      salario: '',
      dataAdmissao: '',
      permissoesCozinha: {
        preparo: false,
        finalizacao: false,
        expedicao: false
      },
      endereco: {
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        cep: ''
      },
      dadosMotoboy: {
        veiculo: '',
        placa: '',
        cnh: ''
      },
      ativo: true
    });
    setEditingFuncionario(null);
    setShowPassword(false);
  };

  const openModal = (type, funcionario = null) => {
    setModalType(type);
    if (funcionario) {
      setEditingFuncionario(funcionario);
      setFormData({
        name: funcionario.name || '',
        email: funcionario.email || '',
        password: '',
        role: funcionario.role || '',
        telefone: funcionario.telefone || '',
        salario: funcionario.salario || '',
        dataAdmissao: funcionario.dataAdmissao ? funcionario.dataAdmissao.split('T')[0] : '',
        permissoesCozinha: funcionario.permissoesCozinha || {
          preparo: false,
          finalizacao: false,
          expedicao: false
        },
        endereco: funcionario.endereco || {
          rua: '',
          numero: '',
          bairro: '',
          cidade: '',
          cep: ''
        },
        dadosMotoboy: funcionario.dadosMotoboy || {
          veiculo: '',
          placa: '',
          cnh: ''
        },
        ativo: funcionario.ativo !== undefined ? funcionario.ativo : true
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSend = { ...formData };
      
      if (dataToSend.salario) {
        dataToSend.salario = parseFloat(dataToSend.salario);
      }
      
      // Se estiver dentro de uma pizzaria específica, definir a pizzaria automaticamente
      if (pizzaria && modalType === 'create') {
        dataToSend.pizzaria = pizzaria._id;
      }
      
      if (modalType === 'create') {
        await api.post('/funcionarios', dataToSend);
        showAlert('Funcionário criado com sucesso!', 'success');
      } else if (modalType === 'edit') {
        await api.put(`/funcionarios/${editingFuncionario._id}`, dataToSend);
        showAlert('Funcionário atualizado com sucesso!', 'success');
      }
      
      closeModal();
      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      showAlert(
        error.response?.data?.message || 'Erro ao salvar funcionário', 
        'error'
      );
    }
  };

  const handleDelete = async (funcionario) => {
    if (window.confirm(`Tem certeza que deseja excluir o funcionário ${funcionario.name}?`)) {
      try {
        await api.delete(`/funcionarios/${funcionario._id}`);
        showAlert('Funcionário excluído com sucesso!', 'success');
        loadFuncionarios();
      } catch (error) {
        showAlert(
          error.response?.data?.message || 'Erro ao excluir funcionário', 
          'error'
        );
      }
    }
  };

  const handleResetPassword = async (funcionario) => {
    const novaSenha = prompt(`Digite a nova senha para ${funcionario.name}:`);
    if (novaSenha && novaSenha.length >= 6) {
      try {
        await api.patch(`/funcionarios/${funcionario._id}/resetar-senha`, {
          novaSenha
        });
        showAlert('Senha resetada com sucesso!', 'success');
      } catch (error) {
        showAlert(
          error.response?.data?.message || 'Erro ao resetar senha', 
          'error'
        );
      }
    } else if (novaSenha) {
      showAlert('A senha deve ter pelo menos 6 caracteres', 'error');
    }
  };

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin_pizzaria: 'bg-purple-100 text-purple-800',
      atendente: 'bg-blue-100 text-blue-800',
      cozinha: 'bg-orange-100 text-orange-800',
      motoboy: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-3 text-orange-500" size={28} />
            Funcionários{pizzaria ? ` - ${pizzaria.nome}` : ''}
          </h1>
          <p className="text-gray-600 mt-1">
            {pizzaria ? `Gerencie os funcionários da ${pizzaria.nome}` : 'Gerencie os funcionários da pizzaria'}
          </p>
        </div>
        
        <button
          onClick={() => openModal('create')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Novo Funcionário
        </button>
      </div>

      {/* Alert */}
      {alert.show && (
        <div className={`p-4 rounded-lg flex items-center ${
          alert.type === 'success' ? 'bg-green-100 text-green-700' :
          alert.type === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          <AlertCircle size={20} className="mr-2" />
          {alert.message}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {!pizzaria && user?.role === 'admin' && (
            <div className="w-full md:w-64">
              <select
                value={selectedPizzaria}
                onChange={(e) => setSelectedPizzaria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todas as pizzarias</option>
                {pizzarias.map(pizzariaItem => (
                  <option key={pizzariaItem._id} value={pizzariaItem._id}>
                    {pizzariaItem.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Funcionários */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {filteredFuncionarios.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum funcionário encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando um novo funcionário.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funcionário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salário
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFuncionarios.map((funcionario) => (
                  <tr key={funcionario._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-orange-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {funcionario.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {funcionario.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(funcionario.role)}`}>
                        {getRoleLabel(funcionario.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Phone size={16} className="mr-1 text-gray-400" />
                        {funcionario.telefone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        funcionario.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {funcionario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {funcionario.salario ? (
                        <div className="flex items-center">
                          <DollarSign size={16} className="mr-1 text-gray-400" />
                          R$ {funcionario.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal('view', funcionario)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openModal('edit', funcionario)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(funcionario)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Resetar Senha"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(funcionario)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal simplificado para teste */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'create' ? 'Novo Funcionário' :
                 modalType === 'edit' ? 'Editar Funcionário' :
                 'Detalhes do Funcionário'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {modalType === 'view' ? (
              <div className="space-y-4">
                <p><strong>Nome:</strong> {editingFuncionario?.name}</p>
                <p><strong>Email:</strong> {editingFuncionario?.email}</p>
                <p><strong>Função:</strong> {getRoleLabel(editingFuncionario?.role)}</p>
                <p><strong>Telefone:</strong> {editingFuncionario?.telefone}</p>
                
                {/* Exibir permissões da cozinha se aplicável */}
                {editingFuncionario?.role === 'cozinha' && editingFuncionario?.permissoesCozinha && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-700 mb-2">Permissões da Cozinha:</p>
                    <div className="space-y-1">
                      {editingFuncionario.permissoesCozinha.preparo && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                          ✓ Preparo
                        </span>
                      )}
                      {editingFuncionario.permissoesCozinha.finalizacao && (
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
                          ✓ Finalização
                        </span>
                      )}
                      {editingFuncionario.permissoesCozinha.expedicao && (
                        <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-2">
                          ✓ Expedição
                        </span>
                      )}
                      {!editingFuncionario.permissoesCozinha.preparo && 
                       !editingFuncionario.permissoesCozinha.finalizacao && 
                       !editingFuncionario.permissoesCozinha.expedicao && (
                        <span className="text-gray-500 text-sm">Nenhuma permissão específica configurada</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                {modalType === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Função *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma função</option>
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Permissões específicas da cozinha */}
                {formData.role === 'cozinha' && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700">Permissões da Cozinha</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissoesCozinha.preparo}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            permissoesCozinha: {
                              ...prev.permissoesCozinha,
                              preparo: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <strong>Preparo</strong> - Assumir e preparar pedidos
                        </span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissoesCozinha.finalizacao}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            permissoesCozinha: {
                              ...prev.permissoesCozinha,
                              finalizacao: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <strong>Finalização</strong> - Embalar e organizar pedidos
                        </span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissoesCozinha.expedicao}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            permissoesCozinha: {
                              ...prev.permissoesCozinha,
                              expedicao: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <strong>Expedição</strong> - Despachar para entrega
                        </span>
                      </label>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    {modalType === 'create' ? 'Criar' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FuncionariosDashboard;