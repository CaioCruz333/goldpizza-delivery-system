import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Headphones, 
  Plus, 
  Search, 
  Phone, 
  User, 
  MapPin,
  ShoppingCart,
  Clock,
  LogOut
} from 'lucide-react';
import api from '../services/api';

const AtendenteDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, connected, on } = useSocket();
  const [pedidos, setPedidos] = useState([]);
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  useEffect(() => {
    loadPedidos();
    
    // WebSocket real-time updates
    if (socket && connected) {
      console.log('🎧 AtendenteDashboard: Conectando ao WebSocket');
      
      const cleanup = [];
      
      // Escutar eventos de tempo real
      cleanup.push(on('novo_pedido', (data) => {
        console.log('🔔 Novo pedido recebido:', data);
        loadPedidos();
      }));
      
      cleanup.push(on('pedido_atualizado', (data) => {
        console.log('🔄 Pedido atualizado:', data);
        loadPedidos();
      }));
      
      cleanup.push(on('pedido_cancelado', (data) => {
        console.log('❌ Pedido cancelado:', data);
        loadPedidos();
      }));
      
      cleanup.push(on('pedido_aceito_entrega', (data) => {
        console.log('🏍️ Pedido aceito para entrega:', data);
        loadPedidos();
      }));
      
      cleanup.push(on('pedido_entregue', (data) => {
        console.log('✅ Pedido entregue:', data);
        loadPedidos();
      }));
      
      // Fallback polling com interval maior (60s)
      const interval = setInterval(loadPedidos, 60000);
      
      return () => {
        cleanup.forEach(fn => fn());
        clearInterval(interval);
      };
    } else {
      // Se não há WebSocket, usar polling normal (30s)
      console.log('⚠️ AtendenteDashboard: WebSocket não disponível, usando polling');
      const interval = setInterval(loadPedidos, 30000);
      return () => clearInterval(interval);
    }
  }, [socket, connected, on]);

  const loadPedidos = async () => {
    try {
      const pizzariaId = user.pizzaria?._id || user.pizzaria;
      const response = await api.get(`/pedidos/pizzaria/${pizzariaId}`);
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const updateStatus = async (pedidoId, novoStatus) => {
    try {
      console.log('🔄 Atualizando status:', { pedidoId, novoStatus });
      const response = await api.patch(`/pedidos/${pedidoId}/status`, { status: novoStatus });
      console.log('✅ Status atualizado:', response.data);
      loadPedidos();
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error.response?.data || error.message);
      alert(`Erro ao atualizar status: ${error.response?.data?.message || error.message}`);
    }
  };

  const finalizarPedido = async (pedidoId) => {
    try {
      await updateStatus(pedidoId, 'finalizado_pago');
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await updateStatus(pedidoId, 'cancelado');
      } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
      }
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtroStatus === 'todos') return true;
    return pedido.status === filtroStatus;
  });

  const pedidosHoje = pedidos.filter(p => {
    const hoje = new Date().toDateString();
    const pedidoData = new Date(p.createdAt).toDateString();
    return hoje === pedidoData;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Headphones className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Atendimento</h1>
                <p className="text-sm text-gray-500">Central de Pedidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Olá, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pedidos Hoje</p>
                <p className="text-2xl font-semibold text-gray-900">{pedidosHoje.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Em Preparo</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {pedidos.filter(p => p.status === 'preparando').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Prontos</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {pedidos.filter(p => p.status === 'pronto').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Entregando</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {pedidos.filter(p => p.status === 'saiu_entrega').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'recebido', label: 'Recebidos' },
              { key: 'preparando', label: 'Preparando' },
              { key: 'pronto', label: 'Prontos' },
              { key: 'saiu_entrega', label: 'Entregando' },
              { key: 'entregue', label: 'Entregue' },
              { key: 'finalizado_pago', label: 'Finalizado' },
              { key: 'cancelado', label: 'Cancelado' }
            ].map(filtro => (
              <button
                key={filtro.key}
                onClick={() => setFiltroStatus(filtro.key)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filtroStatus === filtro.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowNovoPedido(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Pedido</span>
          </button>
        </div>

        {/* Lista de Pedidos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum pedido encontrado</h3>
              <p className="mt-1 text-gray-500">
                {filtroStatus === 'todos' 
                  ? 'Não há pedidos no momento.' 
                  : `Não há pedidos com status "${filtroStatus}".`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Itens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pedidosFiltrados.map((pedido) => (
                    <PedidoRow 
                      key={pedido._id} 
                      pedido={pedido} 
                      onFinalizar={finalizarPedido}
                      onCancelar={cancelarPedido}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Pedido */}
      {showNovoPedido && (
        <NovoPedidoModal 
          onClose={() => setShowNovoPedido(false)}
          onSuccess={() => {
            setShowNovoPedido(false);
            loadPedidos();
          }}
          pizzaria={user.pizzaria}
        />
      )}
    </div>
  );
};

const PedidoRow = ({ pedido, onFinalizar, onCancelar, onUpdateStatus }) => {
  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  const getStatusColor = (status) => {
    const colors = {
      'recebido': 'bg-yellow-100 text-yellow-800',
      'preparando': 'bg-blue-100 text-blue-800',
      'pronto': 'bg-green-100 text-green-800',
      'saiu_entrega': 'bg-orange-100 text-orange-800',
      'entregue': 'bg-purple-100 text-purple-800',
      'finalizado_pago': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'recebido': 'Recebido',
      'preparando': 'Preparando',
      'pronto': 'Pronto',
      'saiu_entrega': 'Saiu p/ Entrega',
      'entregue': 'Entregue',
      'finalizado_pago': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900">#{formatarNumeroPedido(pedido.numero)}</div>
            <div className="text-sm text-gray-500 capitalize">{pedido.origem}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <User className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{pedido.cliente.nome}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              {pedido.cliente.telefone}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {pedido.itens.slice(0, 2).map((item, index) => (
            <div key={index}>
              {item.quantidade}x {item.nome}
            </div>
          ))}
          {pedido.itens.length > 2 && (
            <div className="text-gray-500">+{pedido.itens.length - 2} itens</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pedido.status)}`}>
          {getStatusLabel(pedido.status)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          pedido.tipo === 'delivery' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        R$ {pedido.valores.total.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(pedido.createdAt).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          {pedido.status === 'entregue' && (
            <button
              onClick={() => onFinalizar(pedido._id)}
              className="text-green-600 hover:text-green-900 px-3 py-1 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
            >
              Finalizar
            </button>
          )}
          {pedido.status === 'recebido' && (
            <button
              onClick={() => onCancelar(pedido._id)}
              className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const NovoPedidoModal = ({ onClose, onSuccess, pizzaria }) => {
  const [cliente, setCliente] = useState({
    nome: '',
    telefone: '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      complemento: '',
      referencia: ''
    }
  });
  
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({
    nome: '',
    preco: '',
    quantidade: 1
  });

  const adicionarItem = () => {
    if (novoItem.nome && novoItem.preco) {
      setItens([...itens, { ...novoItem, preco: parseFloat(novoItem.preco) }]);
      setNovoItem({ nome: '', preco: '', quantidade: 1 });
    }
  };

  const removerItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    const subtotal = itens.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const taxaEntrega = 5.00; // TODO: Pegar da configuração da pizzaria
    return { subtotal, taxaEntrega, total: subtotal + taxaEntrega };
  };

  const criarPedido = async () => {
    try {
      const valores = calcularTotal();
      const pedidoData = {
        pizzaria,
        cliente,
        itens,
        origem: 'atendente',
        tipo: 'entrega',
        valores,
        pagamento: {
          forma: 'dinheiro',
          status: 'pendente'
        }
      };

      await api.post('/pedidos', pedidoData);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
    }
  };

  const valores = calcularTotal();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Novo Pedido</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Dados do Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do cliente"
                value={cliente.nome}
                onChange={(e) => setCliente({...cliente, nome: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={cliente.telefone}
                onChange={(e) => setCliente({...cliente, telefone: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Rua"
                value={cliente.endereco.rua}
                onChange={(e) => setCliente({...cliente, endereco: {...cliente.endereco, rua: e.target.value}})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Número"
                value={cliente.endereco.numero}
                onChange={(e) => setCliente({...cliente, endereco: {...cliente.endereco, numero: e.target.value}})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Bairro"
                value={cliente.endereco.bairro}
                onChange={(e) => setCliente({...cliente, endereco: {...cliente.endereco, bairro: e.target.value}})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Complemento"
                value={cliente.endereco.complemento}
                onChange={(e) => setCliente({...cliente, endereco: {...cliente.endereco, complemento: e.target.value}})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Itens do Pedido */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Itens do Pedido</h4>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                placeholder="Nome do item"
                value={novoItem.nome}
                onChange={(e) => setNovoItem({...novoItem, nome: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                placeholder="Preço"
                value={novoItem.preco}
                onChange={(e) => setNovoItem({...novoItem, preco: e.target.value})}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                placeholder="Qtd"
                value={novoItem.quantidade}
                onChange={(e) => setNovoItem({...novoItem, quantidade: parseInt(e.target.value)})}
                className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <button
                onClick={adicionarItem}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {itens.length > 0 && (
              <div className="border border-gray-200 rounded-md p-3">
                {itens.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span>{item.quantidade}x {item.nome}</span>
                    <div className="flex items-center space-x-2">
                      <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                      <button
                        onClick={() => removerItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {itens.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {valores.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega:</span>
                <span>R$ {valores.taxaEntrega.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>R$ {valores.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={criarPedido}
            disabled={!cliente.nome || !cliente.telefone || itens.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Criar Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default AtendenteDashboard;