import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Package,
  Clock, 
  CheckCircle, 
  Truck, 
  DollarSign,
  Star,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import api from '../services/api';

const PedidosDashboard = () => {
  const { user } = useAuth();
  const { socket, connected, on } = useSocket();
  const [pedidos, setPedidos] = useState([]);
  const [pizzarias, setPizzarias] = useState([]);
  const [pizzariaSelecionada, setPizzariaSelecionada] = useState(null);

  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  useEffect(() => {
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (getPizzariaId()) {
      loadPedidos();
      
      // WebSocket real-time updates
      if (socket && connected) {
        console.log('📊 PedidosDashboard: Conectando ao WebSocket');
        
        const cleanup = [];
        
        // Escutar TODOS os eventos (dashboard principal)
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
        
        // Fallback polling com interval maior (30s)
        const interval = setInterval(loadPedidos, 30000);
        
        return () => {
          cleanup.forEach(fn => fn());
          clearInterval(interval);
        };
      } else {
        // Se não há WebSocket, usar polling normal (10s)
        console.log('⚠️ PedidosDashboard: WebSocket não disponível, usando polling');
        const interval = setInterval(loadPedidos, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [pizzariaSelecionada, socket, connected, on]);

  const initializeDashboard = async () => {
    if (user?.role === 'admin') {
      try {
        const response = await api.get('/pizzarias');
        setPizzarias(response.data);
        if (response.data.length > 0) {
          setPizzariaSelecionada(response.data[0]._id);
        }
      } catch (error) {
        console.error('Erro ao carregar pizzarias:', error);
      }
    } else {
      const pizzariaId = typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
      setPizzariaSelecionada(pizzariaId);
    }
  };

  const getPizzariaId = () => {
    if (pizzariaSelecionada) {
      return pizzariaSelecionada;
    }
    if (user?.pizzaria) {
      return typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
    }
    return null;
  };

  const loadPedidos = async () => {
    try {
      const pizzariaId = getPizzariaId();
      if (!pizzariaId) return;

      const response = await api.get(`/pedidos/cozinha/${pizzariaId}`);
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const updateStatus = async (pedidoId, novoStatus) => {
    try {
      await api.patch(`/pedidos/${pedidoId}/status`, { status: novoStatus });
      loadPedidos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Configuração das colunas do Kanban
  const colunasKanban = [
    {
      key: 'recebido',
      label: 'Recebido',
      icon: Package,
      description: 'Novos pedidos recebidos',
      statusRelevantes: ['recebido'],
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      key: 'em_preparacao',
      label: 'Em Preparação',
      icon: Clock,
      description: 'Pedidos sendo preparados na cozinha',
      statusRelevantes: ['preparando', 'finalizado'],
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'bg-blue-100 text-blue-800'
    },
    {
      key: 'prontos',
      label: 'Prontos',
      icon: CheckCircle,
      description: 'Pedidos prontos para entrega/retirada',
      statusRelevantes: ['pronto'],
      color: 'bg-green-50 border-green-200',
      headerColor: 'bg-green-100 text-green-800'
    },
    {
      key: 'em_rota',
      label: 'Em Rota',
      icon: Truck,
      description: 'Pedidos delivery em rota de entrega',
      statusRelevantes: ['saiu_entrega'],
      color: 'bg-purple-50 border-purple-200',
      headerColor: 'bg-purple-100 text-purple-800'
    },
    {
      key: 'aguardando_finalizacao',
      label: 'Aguard. Finalização',
      icon: DollarSign,
      description: 'Pedidos entregues aguardando confirmação de pagamento',
      statusRelevantes: ['entregue'],
      color: 'bg-orange-50 border-orange-200',
      headerColor: 'bg-orange-100 text-orange-800'
    },
    {
      key: 'finalizado',
      label: 'Finalizado',
      icon: Star,
      description: 'Pedidos finalizados e pagos',
      statusRelevantes: ['finalizado_pago'],
      color: 'bg-gray-50 border-gray-200',
      headerColor: 'bg-gray-100 text-gray-800'
    }
  ];

  // Filtrar pedidos por coluna
  const getPedidosPorColuna = (coluna) => {
    return pedidos.filter(pedido => {
      const statusMatch = coluna.statusRelevantes.includes(pedido.status);
      
      // Para a coluna "Em Rota", filtrar apenas pedidos de delivery
      if (coluna.key === 'em_rota') {
        return statusMatch && pedido.tipo === 'delivery';
      }
      
      return statusMatch;
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'recebido': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'preparando': 'bg-blue-100 text-blue-800 border-blue-200',
      'finalizado': 'bg-orange-100 text-orange-800 border-orange-200',
      'pronto': 'bg-green-100 text-green-800 border-green-200',
      'saiu_entrega': 'bg-purple-100 text-purple-800 border-purple-200',
      'entregue': 'bg-orange-100 text-orange-800 border-orange-200',
      'finalizado_pago': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'recebido': <Package className="h-4 w-4" />,
      'preparando': <Clock className="h-4 w-4" />,
      'finalizado': <Clock className="h-4 w-4" />,
      'pronto': <CheckCircle className="h-4 w-4" />,
      'saiu_entrega': <Truck className="h-4 w-4" />,
      'entregue': <DollarSign className="h-4 w-4" />,
      'finalizado_pago': <Star className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  const getTempoDecorrido = (timestamp) => {
    const agora = new Date();
    const inicio = new Date(timestamp);
    const diffMs = agora - inicio;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return { tempo: `${diffMins}min`, minutos: diffMins };
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { tempo: `${hours}h ${mins}min`, minutos: diffMins };
  };

  const getCorTempo = (minutos) => {
    if (minutos < 30) return 'text-green-600';
    if (minutos < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const cleaned = telefone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return telefone;
  };

  // Componente do Card de Pedido
  const PedidoCard = ({ pedido }) => {
    const tempoInfo = getTempoDecorrido(pedido.createdAt);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3 hover:shadow-md transition-shadow overflow-hidden">
        {/* Header do Card */}
        <div className="flex justify-between items-start mb-2 min-w-0">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <span className="font-bold text-lg text-gray-900 whitespace-nowrap">
              #{formatarNumeroPedido(pedido.numero)}
            </span>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <div className={`text-xs font-medium whitespace-nowrap ${getCorTempo(tempoInfo.minutos)}`}>
              {tempoInfo.tempo}
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {new Date(pedido.createdAt).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* Informações do Cliente */}
        <div className="mb-2 min-w-0">
          <div className="flex items-center text-xs text-gray-600 mb-1 min-w-0">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="font-medium truncate">{pedido.cliente?.nome}</span>
          </div>
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center text-xs text-gray-500 min-w-0 flex-1">
              <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{formatarTelefone(pedido.cliente?.telefone)}</span>
              <span className="sm:hidden">{pedido.cliente?.telefone?.slice(-4) || '****'}</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ml-2 ${
              pedido.tipo === 'delivery' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {pedido.tipo === 'delivery' ? 'Delivery' : 'Retirada'}
            </span>
          </div>
        </div>

        {/* Resumo dos Itens */}
        <div className="mb-2 min-w-0">
          <div className="text-xs text-gray-600 mb-1">
            <strong>{pedido.itens?.length || 0}</strong> {pedido.itens?.length === 1 ? 'item' : 'itens'}
          </div>
          <div className="max-h-12 overflow-y-auto">
            {pedido.itens?.slice(0, 2).map((item, index) => (
              <div key={index} className="text-xs text-gray-500 truncate leading-tight">
                <span className="font-medium">{item.quantidade}x</span> {item.item?.nome || 'Item'}
              </div>
            ))}
            {pedido.itens?.length > 2 && (
              <div className="text-xs text-gray-400 leading-tight">
                +{pedido.itens.length - 2} mais...
              </div>
            )}
          </div>
        </div>

        {/* Valor Total */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 min-w-0">
          <span className="text-xs font-medium text-gray-600">Total:</span>
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
            R$ {pedido.valores?.total?.toFixed(2) || '0,00'}
          </span>
        </div>

        {/* Ações baseadas no status */}
        {pedido.status === 'entregue' && (
          <button
            onClick={() => updateStatus(pedido._id, 'finalizado_pago')}
            className="w-full mt-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium truncate"
          >
            Confirmar Pagamento
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Dashboard de Pedidos
            </h1>
            <p className="text-gray-600 mt-1">Visão geral do fluxo de pedidos - Kanban</p>
          </div>

          {/* Seletor de Pizzaria (se for admin) */}
          {user?.role === 'admin' && pizzarias.length > 0 && (
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Pizzaria:</label>
              <select
                value={pizzariaSelecionada || ''}
                onChange={(e) => setPizzariaSelecionada(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {pizzarias.map((pizzaria) => (
                  <option key={pizzaria._id} value={pizzaria._id}>
                    {pizzaria.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-4 lg:p-6">
        {/* Modo desktop: Grid responsivo */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
          {colunasKanban.map((coluna) => {
            const pedidosDaColuna = getPedidosPorColuna(coluna);
            const IconeColuna = coluna.icon;

            return (
              <div key={coluna.key} className={`${coluna.color} rounded-lg border-2 overflow-hidden`}>
                {/* Header da Coluna */}
                <div className={`${coluna.headerColor} px-4 py-3 rounded-t-lg border-b`}>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <IconeColuna className="h-5 w-5 flex-shrink-0" />
                      <h3 className="font-bold text-sm truncate">{coluna.label}</h3>
                    </div>
                    <span className="bg-white bg-opacity-50 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ml-2">
                      {pedidosDaColuna.length}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-75 truncate">{coluna.description}</p>
                </div>

                {/* Cards da Coluna */}
                <div className="p-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {pedidosDaColuna.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <IconeColuna className="h-12 w-12 mx-auto opacity-30 mb-2" />
                      <p className="text-sm">Nenhum pedido</p>
                    </div>
                  ) : (
                    pedidosDaColuna.map((pedido) => (
                      <PedidoCard key={pedido._id} pedido={pedido} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modo mobile: Scroll horizontal */}
        <div className="sm:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4" style={{scrollSnapType: 'x mandatory'}}>
            {colunasKanban.map((coluna) => {
              const pedidosDaColuna = getPedidosPorColuna(coluna);
              const IconeColuna = coluna.icon;

              return (
                <div key={coluna.key} className={`${coluna.color} rounded-lg border-2 flex-shrink-0 w-80 overflow-hidden`} style={{scrollSnapAlign: 'start'}}>
                  {/* Header da Coluna */}
                  <div className={`${coluna.headerColor} px-4 py-3 rounded-t-lg border-b`}>
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <IconeColuna className="h-5 w-5 flex-shrink-0" />
                        <h3 className="font-bold text-sm truncate">{coluna.label}</h3>
                      </div>
                      <span className="bg-white bg-opacity-50 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ml-2">
                        {pedidosDaColuna.length}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-75 truncate">{coluna.description}</p>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="p-3 h-[calc(100vh-350px)] overflow-y-auto">
                    {pedidosDaColuna.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <IconeColuna className="h-12 w-12 mx-auto opacity-30 mb-2" />
                        <p className="text-sm">Nenhum pedido</p>
                      </div>
                    ) : (
                      pedidosDaColuna.map((pedido) => (
                        <PedidoCard key={pedido._id} pedido={pedido} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidosDashboard;