import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle,
  LogOut,
  Play,
  Volume2,
  VolumeX,
  Timer,
  Users,
  Package,
  Utensils,
  ShoppingBag,
  Send,
  X
} from 'lucide-react';
import api from '../services/api';

const CozinhaDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, connected, on } = useSocket();
  const [pedidos, setPedidos] = useState([]);
  const [somHabilitado, setSomHabilitado] = useState(true);
  const [timersAtivos, setTimersAtivos] = useState({});
  const [pizzarias, setPizzarias] = useState([]);
  const [pizzariaSelecionada, setPizzariaSelecionada] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('preparacao'); // Nova aba ativa
  const [descricaoVisivel, setDescricaoVisivel] = useState(true); // Controla a visibilidade da descrição
  const intervalRef = useRef(null);
  const previousPedidosLength = useRef(0);

  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  // Estados para o modal de preparação
  const [modalPreparacaoAberto, setModalPreparacaoAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [pizzasFinalizadasPorPedido, setPizzasFinalizadasPorPedido] = useState({});
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [pizzaSelecionada, setPizzaSelecionada] = useState(null);
  
  // Estados para seleção de motoboy
  const [modalMotoboyAberto, setModalMotoboyAberto] = useState(false);
  const [pedidoParaExpedicao, setPedidoParaExpedicao] = useState(null);
  const [motoboys, setMotoboys] = useState([]);


  useEffect(() => {
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (getPizzariaId()) {
      loadPedidos();
      
      // WebSocket real-time updates
      if (socket && connected) {
        console.log('🍕 CozinhaDashboard: Conectando ao WebSocket');
        
        const cleanup = [];
        
        // Escutar eventos de tempo real
        cleanup.push(on('novo_pedido', (data) => {
          console.log('🔔 Novo pedido recebido:', data);
          loadPedidos();
          if (somHabilitado) {
            tocarSomNovoPedido();
          }
        }));
        
        cleanup.push(on('pedido_atualizado', (data) => {
          console.log('🔄 Pedido atualizado:', data);
          loadPedidos();
        }));
        
        cleanup.push(on('pedido_cancelado', (data) => {
          console.log('❌ Pedido cancelado:', data);
          loadPedidos();
        }));
        
        cleanup.push(on('progresso_pizzas_atualizado', (data) => {
          console.log('🍕 Progresso das pizzas atualizado:', data);
          if (data.pedidoId && data.progressoPizzas) {
            setPizzasFinalizadasPorPedido(prev => ({
              ...prev,
              [data.pedidoId]: data.progressoPizzas
            }));
          }
        }));
        
        // Fallback polling com interval maior (30s)
        intervalRef.current = setInterval(loadPedidos, 30000);
        
        return () => {
          cleanup.forEach(fn => fn());
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      } else {
        // Se não há WebSocket, usar polling normal (10s)
        console.log('⚠️ CozinhaDashboard: WebSocket não disponível, usando polling');
        intervalRef.current = setInterval(loadPedidos, 10000);
        
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }
    }
  }, [pizzariaSelecionada, socket, connected, somHabilitado, on]);

  const initializeDashboard = async () => {
    // Se for admin geral, carregar lista de pizzarias
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
      // Para outros usuários, usar pizzaria do usuário
      const pizzariaId = typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
      setPizzariaSelecionada(pizzariaId);
    }
  };

  const getPizzariaId = () => {
    if (pizzariaSelecionada) {
      return pizzariaSelecionada;
    }
    
    // Se user.pizzaria for um objeto, extrair o _id
    if (user?.pizzaria) {
      return typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
    }
    
    return null;
  };

  // Effect para detectar novos pedidos e tocar som
  useEffect(() => {
    const pedidosRecebidos = pedidos.filter(p => p.status === 'recebido');
    if (pedidosRecebidos.length > previousPedidosLength.current && somHabilitado && previousPedidosLength.current > 0) {
      tocarSomNovoPedido();
    }
    previousPedidosLength.current = pedidosRecebidos.length;
  }, [pedidos, somHabilitado]);

  const loadPedidos = async () => {
    const pizzariaId = getPizzariaId();
    
    if (!pizzariaId) {
      return;
    }
    
    try {
      const response = await api.get(`/pedidos/cozinha/${pizzariaId}`);
      setPedidos(response.data);
      
      // Inicializar timers para pedidos em preparação
      const novosTimers = {};
      response.data.forEach(pedido => {
        if (pedido.status === 'preparando') {
          // Usar tempo do backend se disponível, senão usar timestamp atual
          if (pedido.tempos && pedido.tempos.preparando) {
            novosTimers[pedido._id] = new Date(pedido.tempos.preparando).getTime();
          } else if (!timersAtivos[pedido._id]) {
            novosTimers[pedido._id] = Date.now();
          } else {
            novosTimers[pedido._id] = timersAtivos[pedido._id];
          }
        }
      });
      setTimersAtivos(novosTimers);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const tocarSomNovoPedido = () => {
    // Criar um beep simples usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequência do beep
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Repetir o beep 3 vezes
    setTimeout(() => tocarBeep(audioContext), 600);
    setTimeout(() => tocarBeep(audioContext), 1200);
  };

  const tocarBeep = (audioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const updateStatus = async (pedidoId, novoStatus) => {
    try {
      // Iniciar timer se mudar para preparando
      if (novoStatus === 'preparando') {
        setTimersAtivos(prev => ({
          ...prev,
          [pedidoId]: Date.now()
        }));
      }
      
      // Remover timer se sair do status preparando
      if (novoStatus !== 'preparando') {
        setTimersAtivos(prev => {
          const { [pedidoId]: removed, ...rest } = prev;
          return rest;
        });
      }
      
      // Limpar estado das pizzas finalizadas quando o pedido é finalizado
      if (novoStatus === 'finalizado') {
        setPizzasFinalizadasPorPedido(prev => {
          const newState = { ...prev };
          // Remove o pedido específico do estado
          delete newState[pedidoId];
          return newState;
        });
      }
      
      await api.patch(`/pedidos/${pedidoId}/status`, { status: novoStatus });
      loadPedidos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      
      // Feedback específico para conflito de pizzaiolo
      if (error.response?.status === 409 || error.response?.status === 400) {
        alert(error.response.data.message || 'Este pedido já foi assumido por outra pessoa');
      } else if (error.response?.status === 403) {
        alert(error.response.data.message || 'Você não tem permissão para gerenciar este pedido');
      } else {
        alert('Erro ao atualizar status do pedido');
      }
    }
  };

  const iniciarPreparacao = async (pedidoId) => {
    await updateStatus(pedidoId, 'preparando');
  };

  const finalizarPreparacao = async (pedidoId) => {
    await updateStatus(pedidoId, 'finalizado');
  };

  const marcarComoPronto = async (pedidoId) => {
    await updateStatus(pedidoId, 'pronto');
  };

  const enviarParaExpedicao = async (pedidoId) => {
    // Encontrar o pedido para verificar o tipo
    const pedido = pedidos.find(p => p._id === pedidoId);
    
    if (pedido) {
      if (pedido.tipo === 'retirada') {
        // Pedidos de retirada vão direto para 'entregue' (finalizado)
        await updateStatus(pedidoId, 'entregue');
      } else {
        // Pedidos de delivery precisam de motoboy
        setPedidoParaExpedicao(pedido);
        await loadMotoboys();
        setModalMotoboyAberto(true);
      }
    }
  };

  const loadMotoboys = async () => {
    try {
      const pizzariaId = getPizzariaId();
      console.log('🚀 Carregando motoboys para pizzaria:', pizzariaId);
      
      if (!pizzariaId) {
        console.error('❌ ID da pizzaria não encontrado');
        return;
      }
      
      const response = await api.get(`/pedidos/pizzaria/${pizzariaId}/motoboys`);
      console.log('🏍️ Motoboys carregados:', response.data);
      setMotoboys(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar motoboys:', error);
    }
  };

  const atribuirMotoboy = async (motoboyId) => {
    try {
      await api.patch(`/pedidos/${pedidoParaExpedicao._id}/atribuir-motoboy`, {
        motoboyId
      });
      setModalMotoboyAberto(false);
      setPedidoParaExpedicao(null);
      loadPedidos();
    } catch (error) {
      console.error('Erro ao atribuir motoboy:', error);
      alert('Erro ao atribuir motoboy. Tente novamente.');
    }
  };

  // Funções para o modal de preparação
  const abrirModalPreparacao = async (pedido) => {
    setPedidoSelecionado(pedido);
    setModalPreparacaoAberto(true);
    
    // Carregar progresso das pizzas do servidor
    try {
      const response = await api.get(`/pedidos/${pedido._id}`);
      const pedidoCompleto = response.data;
      
      if (pedidoCompleto.progressoPizzas) {
        setPizzasFinalizadasPorPedido(prev => ({
          ...prev,
          [pedido._id]: pedidoCompleto.progressoPizzas
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar progresso das pizzas:', error);
    }
    
    // Iniciar preparação apenas se o pedido ainda não foi iniciado
    if (pedido.status === 'recebido') {
      iniciarPreparacao(pedido._id);
    }
  };

  const fecharModalPreparacao = () => {
    setModalPreparacaoAberto(false);
    // Não resetar pedidoSelecionado nem pizzasFinalizadas para manter o estado
  };

  const abrirModalConfirmacao = (pizzaIndex) => {
    setPizzaSelecionada(pizzaIndex);
    setModalConfirmacaoAberto(true);
  };

  const confirmarPizzaFinalizada = async () => {
    if (pizzaSelecionada !== null && pedidoSelecionado) {
      const novoProgresso = {
        ...pizzasFinalizadasPorPedido[pedidoSelecionado._id],
        [pizzaSelecionada]: true
      };
      
      // Atualizar estado local
      setPizzasFinalizadasPorPedido(prev => ({
        ...prev,
        [pedidoSelecionado._id]: novoProgresso
      }));
      
      // Salvar no servidor
      try {
        await api.patch(`/pedidos/${pedidoSelecionado._id}/progresso-pizzas`, {
          progressoPizzas: novoProgresso
        });
      } catch (error) {
        console.error('Erro ao salvar progresso da pizza:', error);
        // Reverter estado local em caso de erro
        setPizzasFinalizadasPorPedido(prev => ({
          ...prev,
          [pedidoSelecionado._id]: {
            ...prev[pedidoSelecionado._id],
            [pizzaSelecionada]: false
          }
        }));
      }
    }
    setModalConfirmacaoAberto(false);
    setPizzaSelecionada(null);
  };

  const cancelarConfirmacao = () => {
    setModalConfirmacaoAberto(false);
    setPizzaSelecionada(null);
  };

  const finalizarPreparacaoModal = () => {
    if (pedidoSelecionado) {
      // Buscar todas as pizzas, incluindo as que estão dentro de combos (mesma lógica do modal)
      const pizzas = [];
      
      pedidoSelecionado.itens.forEach((item, itemIndex) => {
        // Pizza direta
        if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
          pizzas.push({
            originalIndex: itemIndex,
            isFromCombo: false
          });
        }
        // Pizzas dentro de combos
        else if (item.item?.categoria === 'combo' || item.categoria === 'combo') {
          if (item.pizzas && item.pizzas.length > 0) {
            item.pizzas.forEach((pizza, pizzaIndex) => {
              pizzas.push({
                originalIndex: itemIndex,
                pizzaIndex: pizzaIndex,
                isFromCombo: true
              });
            });
          }
        }
      });

      // Verificar se todas as pizzas estão finalizadas usando as chaves corretas
      const pizzasDoAtualPedido = pizzasFinalizadasPorPedido[pedidoSelecionado._id] || {};
      const todasPizzasFinalizadas = pizzas.length > 0 && pizzas.every(pizza => {
        const pizzaKey = pizza.isFromCombo 
          ? `combo-${pizza.originalIndex}-${pizza.pizzaIndex}`
          : `direct-${pizza.originalIndex}`;
        return pizzasDoAtualPedido[pizzaKey];
      });
      
      if (todasPizzasFinalizadas) {
        finalizarPreparacao(pedidoSelecionado._id);
        fecharModalPreparacao();
      }
    }
  };

  // Configuração das sub-abas da cozinha
  const abasCozinha = [
    {
      key: 'preparacao',
      label: 'Preparação',
      icon: Utensils,
      description: 'Responsáveis - Montagem e preparo das pizzas',
      statusRelevantes: ['recebido', 'preparando'],
      permissoes: ['admin_pizzaria', 'admin'],
      permissaoCozinha: 'preparo' // Nova permissão específica da cozinha
    },
    {
      key: 'finalizacao',
      label: 'Finalização',
      icon: ShoppingBag,
      description: 'Empacotamento e organização dos pedidos',
      statusRelevantes: ['finalizado'],
      permissoes: ['admin_pizzaria', 'admin'],
      permissaoCozinha: 'finalizacao' // Nova permissão específica da cozinha
    },
    {
      key: 'expedicao',
      label: 'Expedição',
      icon: Send,
      description: 'Controle de saída para entrega',
      statusRelevantes: ['pronto'],
      permissoes: ['admin_pizzaria', 'admin'],
      permissaoCozinha: 'expedicao' // Nova permissão específica da cozinha
    }
  ];

  // Filtrar abas baseado nas permissões do usuário
  const abasDisponiveis = abasCozinha.filter(aba => {
    // Admins e admin_pizzaria têm acesso total
    if (aba.permissoes.includes(user?.role)) {
      return true;
    }
    
    // Usuários da cozinha precisam ter a permissão específica
    if (user?.role === 'cozinha' && aba.permissaoCozinha) {
      return user?.permissoesCozinha?.[aba.permissaoCozinha] === true;
    }
    
    return false;
  });

  // Determinar se deve mostrar as abas
  // Mostrar abas apenas quando o usuário tem acesso a mais de uma aba
  const mostrarAbas = abasDisponiveis.length > 1;

  // Definir aba ativa automaticamente quando há apenas uma disponível
  useEffect(() => {
    if (abasDisponiveis.length === 1 && abaAtiva !== abasDisponiveis[0].key) {
      setAbaAtiva(abasDisponiveis[0].key);
    }
  }, [abasDisponiveis, abaAtiva]);

  // Filtrar pedidos baseado na aba ativa
  const getPedidosPorAba = () => {
    const abaConfig = abasCozinha.find(aba => aba.key === abaAtiva);
    if (!abaConfig) return [];
    
    return pedidos.filter(pedido => {
      const statusMatch = abaConfig.statusRelevantes.includes(pedido.status);
      
      // Para a aba "Em entrega", filtrar apenas pedidos de delivery
      if (abaConfig.key === 'em_entrega') {
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
      'saiu_entrega': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'recebido': <AlertCircle className="h-5 w-5" />,
      'preparando': <Clock className="h-5 w-5" />,
      'finalizado': <Package className="h-5 w-5" />,
      'pronto': <CheckCircle className="h-5 w-5" />
    };
    return icons[status] || <Clock className="h-5 w-5" />;
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

  const getCorTempo = (minutos, status) => {
    // Tempos limite baseados no status
    const limites = {
      'recebido': 5,     // 5 min para iniciar
      'preparando': 30,  // 30 min para preparar
      'pronto': 10       // 10 min aguardando entrega
    };
    
    const limite = limites[status] || 30;
    const porcentagem = (minutos / limite) * 100;
    
    if (porcentagem <= 50) return 'text-green-600 bg-green-100';
    if (porcentagem <= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100 animate-pulse';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cozinha</h1>
                <p className="text-sm text-gray-500">Painel de Produção</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Seletor de Pizzaria para Admins */}
              {user?.role === 'admin' && pizzarias.length > 0 && (
                <select
                  value={pizzariaSelecionada || ''}
                  onChange={(e) => setPizzariaSelecionada(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  {pizzarias.map(pizzaria => (
                    <option key={pizzaria._id} value={pizzaria._id}>
                      {pizzaria.nome}
                    </option>
                  ))}
                </select>
              )}

              {/* Estatísticas rápidas */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded">
                  <Package className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">{pedidos.filter(p => p.status === 'recebido').length} novos</span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">{pedidos.filter(p => p.status === 'preparando').length} preparando</span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">{pedidos.filter(p => p.status === 'pronto').length} prontos</span>
                </div>
              </div>

              {/* Controle de som */}
              <button
                onClick={() => setSomHabilitado(!somHabilitado)}
                className={`p-2 rounded-lg border ${
                  somHabilitado 
                    ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' 
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
                title={somHabilitado ? 'Som habilitado' : 'Som desabilitado'}
              >
                {somHabilitado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

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
        {/* Sub-abas da Cozinha - Mostrar apenas se tiver mais de uma aba */}
        {mostrarAbas && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {abasDisponiveis.map(aba => {
                const pedidosAba = pedidos.filter(pedido => 
                  aba.statusRelevantes.includes(pedido.status)
                );
                
                return (
                  <button
                    key={aba.key}
                    onClick={() => setAbaAtiva(aba.key)}
                    className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      abaAtiva === aba.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <aba.icon className={`mr-2 h-5 w-5 ${
                      abaAtiva === aba.key ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {aba.label}
                    {pedidosAba.length > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        abaAtiva === aba.key 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {pedidosAba.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Descrição da aba ativa */}
          {abasCozinha.find(aba => aba.key === abaAtiva) && descricaoVisivel && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {React.createElement(abasCozinha.find(aba => aba.key === abaAtiva).icon, {
                      className: "h-5 w-5 text-blue-600"
                    })}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      {abasCozinha.find(aba => aba.key === abaAtiva).label}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {abasCozinha.find(aba => aba.key === abaAtiva).description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDescricaoVisivel(false)}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors"
                  title="Fechar descrição"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Lista de Pedidos baseada na aba ativa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {getPedidosPorAba().map((pedido) => {
            // Renderizar componente específico baseado na aba ativa
            if (abaAtiva === 'preparacao') {
              return (
                <PedidoCardPreparacao
                  key={pedido._id}
                  pedido={pedido}
                  onAbrirModalPreparacao={abrirModalPreparacao}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getTempoDecorrido={getTempoDecorrido}
                  getCorTempo={getCorTempo}
                  timerInicio={timersAtivos[pedido._id]}
                />
              );
            } else if (abaAtiva === 'finalizacao') {
              return (
                <PedidoCardFinalizacao
                  key={pedido._id}
                  pedido={pedido}
                  onFinalizarPreparacao={marcarComoPronto}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getTempoDecorrido={getTempoDecorrido}
                  getCorTempo={getCorTempo}
                />
              );
            } else if (abaAtiva === 'expedicao') {
              return (
                <PedidoCardExpedicao
                  key={pedido._id}
                  pedido={pedido}
                  onEnviarParaExpedicao={enviarParaExpedicao}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getTempoDecorrido={getTempoDecorrido}
                  getCorTempo={getCorTempo}
                />
              );
            }
            return null;
          })}
        </div>

        {getPedidosPorAba().length === 0 && (
          <div className="text-center py-12">
            {React.createElement(abasCozinha.find(aba => aba.key === abaAtiva)?.icon || ChefHat, {
              className: "mx-auto h-12 w-12 text-gray-400"
            })}
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              Nenhum pedido em {abasCozinha.find(aba => aba.key === abaAtiva)?.label}
            </h3>
            <p className="mt-1 text-gray-500">
              {abasCozinha.find(aba => aba.key === abaAtiva)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Preparação Global */}
      {modalPreparacaoAberto && pedidoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header do Modal */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Utensils className="h-6 w-6 mr-2 text-blue-600" />
                    Preparação do Pedido #{formatarNumeroPedido(pedidoSelecionado.numero)}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Marque cada pizza conforme for finalizando o preparo
                  </p>
                </div>
                <button
                  onClick={fecharModalPreparacao}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>


              {/* Lista de Pizzas para Preparar */}
              <div className="space-y-4">
                {(() => {
                  // Buscar todas as pizzas, incluindo as que estão dentro de combos
                  const pizzas = [];
                  const pizzasFinalizadas = pizzasFinalizadasPorPedido[pedidoSelecionado._id] || {};
                  
                  pedidoSelecionado.itens.forEach((item, itemIndex) => {
                    // Pizza direta
                    if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
                      pizzas.push({
                        ...item,
                        originalIndex: itemIndex,
                        isFromCombo: false
                      });
                    }
                    // Pizzas dentro de combos
                    else if (item.item?.categoria === 'combo' || item.categoria === 'combo') {
                      if (item.pizzas && item.pizzas.length > 0) {
                        item.pizzas.forEach((pizza, pizzaIndex) => {
                          pizzas.push({
                            ...pizza,
                            originalIndex: itemIndex,
                            pizzaIndex: pizzaIndex,
                            isFromCombo: true,
                            comboName: item.item?.nome || item.nome
                          });
                        });
                      }
                    }
                  });
                  
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        🍕 Pizzas para preparar ({pizzas.length})
                      </h3>
                      
                      {pizzas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhuma pizza encontrada neste pedido</p>
                          <p className="text-sm">Verifique se existem itens de categoria "pizza"</p>
                        </div>
                      ) : (
                        pizzas.map((pizza, index) => {
                          // Criar chave única para pizzas de combo vs pizzas diretas
                          const pizzaKey = pizza.isFromCombo 
                            ? `combo-${pizza.originalIndex}-${pizza.pizzaIndex}`
                            : `direct-${pizza.originalIndex}`;
                          
                          return (
                            <div key={pizzaKey} className={`border rounded-lg p-4 ${
                              pizzasFinalizadas[pizzaKey] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                      {pizza.quantidade || 1}x
                                    </span>
                                    <h4 className="font-semibold text-gray-900">
                                      {pizza.item?.nome || pizza.nome}
                                    </h4>
                                    {pizza.isFromCombo && (
                                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                        📦 {pizza.comboName}
                                      </span>
                                    )}
                                    {pizzasFinalizadas[pizzaKey] && (
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                        ✅ Finalizada
                                      </span>
                                    )}
                                  </div>
                                
                                {pizza.sabores && pizza.sabores.length > 0 && (
                                  <div className="mb-2">
                                    <strong className="text-sm text-gray-700">🍕 Sabores:</strong>
                                    <span className="text-sm text-gray-600 ml-2">
                                      {pizza.sabores.map(s => {
                                        if (typeof s === 'string') return s;
                                        return s.sabor?.nome || s.nome || 'Sabor';
                                      }).join(', ')}
                                    </span>
                                  </div>
                                )}
                                
                                {pizza.borda && (
                                  <div className="mb-2">
                                    <strong className="text-sm text-gray-700">🥨 Borda:</strong>
                                    <span className="text-sm text-gray-600 ml-2">
                                      {pizza.borda.nome || pizza.borda}
                                    </span>
                                  </div>
                                )}
                                
                                {pizza.observacoes && (
                                  <div className="bg-amber-100 p-2 rounded mt-2">
                                    <strong className="text-sm text-amber-800">⚠️ Observações da pizza:</strong>
                                    <p className="text-sm text-red-600 font-bold">{pizza.observacoes}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="ml-4">
                                {!pizzasFinalizadas[pizzaKey] ? (
                                  <button
                                    onClick={() => abrirModalConfirmacao(pizzaKey)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    <span>✓</span>
                                  </button>
                                ) : (
                                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Pronta</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 flex justify-between items-center pt-4 border-t">
                <button
                  onClick={fecharModalPreparacao}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Fechar
                </button>
                
                {(() => {
                  // Buscar todas as pizzas, incluindo as que estão dentro de combos (mesma lógica do modal)
                  const pizzas = [];
                  const pizzasFinalizadas = pizzasFinalizadasPorPedido[pedidoSelecionado._id] || {};
                  
                  pedidoSelecionado.itens.forEach((item, itemIndex) => {
                    // Pizza direta
                    if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
                      pizzas.push({
                        originalIndex: itemIndex,
                        isFromCombo: false
                      });
                    }
                    // Pizzas dentro de combos
                    else if (item.item?.categoria === 'combo' || item.categoria === 'combo') {
                      if (item.pizzas && item.pizzas.length > 0) {
                        item.pizzas.forEach((pizza, pizzaIndex) => {
                          pizzas.push({
                            originalIndex: itemIndex,
                            pizzaIndex: pizzaIndex,
                            isFromCombo: true
                          });
                        });
                      }
                    }
                  });

                  // Verificar se todas as pizzas estão finalizadas usando as chaves corretas
                  const todasPizzasFinalizadas = pizzas.length > 0 && pizzas.every(pizza => {
                    const pizzaKey = pizza.isFromCombo 
                      ? `combo-${pizza.originalIndex}-${pizza.pizzaIndex}`
                      : `direct-${pizza.originalIndex}`;
                    return pizzasFinalizadas[pizzaKey];
                  });
                  
                  return (
                    <button
                      onClick={finalizarPreparacaoModal}
                      disabled={!todasPizzasFinalizadas}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                        todasPizzasFinalizadas
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Finalizar Preparo</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Global */}
      {modalConfirmacaoAberto && pedidoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmar Pizza Finalizada
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Você confirma que esta pizza foi preparada corretamente e está pronta?
              </p>
              {(() => {
                const pizzas = pedidoSelecionado.itens.filter(item => 
                  item.item?.categoria === 'pizza' || item.categoria === 'pizza'
                );
                
                return pizzaSelecionada !== null && pizzas[pizzaSelecionada] && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-6 text-left">
                    <div className="font-medium text-gray-900">
                      {pizzas[pizzaSelecionada].quantidade}x {pizzas[pizzaSelecionada].item?.nome || pizzas[pizzaSelecionada].nome}
                    </div>
                    {pizzas[pizzaSelecionada].sabores && pizzas[pizzaSelecionada].sabores.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        Sabores: {pizzas[pizzaSelecionada].sabores.map(s => {
                          if (typeof s === 'string') return s;
                          return s.sabor?.nome || s.nome || 'Sabor';
                        }).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex space-x-3">
                <button
                  onClick={cancelarConfirmacao}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPizzaFinalizada}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para seleção de motoboy */}
      <ModalSelecaoMotoboy 
        isOpen={modalMotoboyAberto}
        onClose={() => setModalMotoboyAberto(false)}
        motoboys={motoboys}
        onSelect={atribuirMotoboy}
        pedido={pedidoParaExpedicao}
      />
    </div>
  );
};


// Componente específico para a aba de Preparação (Pizzaiolo)
const PedidoCardPreparacao = ({ 
  pedido, 
  onAbrirModalPreparacao,
  getStatusColor, 
  getStatusIcon, 
  getTempoDecorrido, 
  getCorTempo,
  timerInicio
}) => {
  const { user } = useAuth();
  const [tempoPreparacao, setTempoPreparacao] = useState(0);

  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  // Timer para preparação em tempo real
  useEffect(() => {
    let interval;
    if (pedido.status === 'preparando' && timerInicio) {
      interval = setInterval(() => {
        const agora = Date.now();
        const tempo = Math.floor((agora - timerInicio) / 1000);
        setTempoPreparacao(tempo);
      }, 1000);
    } else {
      setTempoPreparacao(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pedido.status, timerInicio]);

  const formatarTempoPreparacao = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCorTempoPreparacao = (segundos) => {
    if (segundos < 900) return 'text-green-600'; // < 15min
    if (segundos < 1800) return 'text-yellow-600'; // < 30min
    return 'text-red-600 animate-pulse'; // > 30min
  };

  const getCorBorda = (status) => {
    const cores = {
      'recebido': 'border-l-yellow-500',
      'preparando': 'border-l-blue-500'
    };
    return cores[status] || 'border-l-gray-500';
  };


  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${getCorBorda(pedido.status)} transform transition-all duration-200 hover:shadow-lg`}>
      {/* Header com foco na preparação */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold text-gray-900">#{formatarNumeroPedido(pedido.numero)}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(pedido.status)}`}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(pedido.status)}
              <span className="font-semibold">{pedido.status.toUpperCase()}</span>
            </div>
          </span>
          {/* Indicador de responsável atribuído */}
          {pedido.pizzaiolo && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              👨‍🍳 {pedido.pizzaiolo.name}
            </span>
          )}
        </div>
        
        {/* Timer específico para preparação */}
        <div className="text-right">
          {pedido.status === 'preparando' && timerInicio ? (
            <div className={`text-lg font-mono font-bold ${getCorTempoPreparacao(tempoPreparacao)}`}>
              ⏱️ {formatarTempoPreparacao(tempoPreparacao)}
            </div>
          ) : (
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${(() => {
              const tempoInfo = getTempoDecorrido(pedido.createdAt);
              return getCorTempo(tempoInfo.minutos, pedido.status);
            })()}`}>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{getTempoDecorrido(pedido.createdAt).tempo}</span>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Itens com foco na preparação */}
      <div className="mb-4">
        <div className="space-y-3 max-h-40 overflow-y-auto">
{(() => {
            const itensParaExibir = [];
            
            pedido.itens.forEach((item, index) => {
              // Se for combo com pizzas
              if ((item.item?.categoria === 'combo' || item.categoria === 'combo') && item.pizzas && item.pizzas.length > 0) {
                // Adicionar cada pizza do combo como item separado
                item.pizzas.forEach((pizza, pizzaIndex) => {
                  itensParaExibir.push({
                    ...pizza,
                    key: `combo-${index}-pizza-${pizzaIndex}`,
                    isFromCombo: true,
                    comboName: item.item?.nome || item.nome
                  });
                });
              } else {
                // Item normal (pizza individual, bebida, etc)
                itensParaExibir.push({
                  ...item,
                  key: `item-${index}`,
                  isFromCombo: false
                });
              }
            });
            
            return itensParaExibir.map((item) => (
              <div key={item.key} className="border-l-4 border-blue-200 pl-3 py-2 bg-blue-50 rounded-r">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs mr-2">
                        {item.quantidade || 1}x
                      </span>
                      {item.item?.nome || item.nome}
                      {item.isFromCombo && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          📦 {item.comboName}
                        </span>
                      )}
                    </div>
                    
                    {(item.sabores && item.sabores.length > 0) && (
                      <div className="text-xs text-gray-700 mb-1">
                        <strong>🍕 Sabores:</strong> {item.sabores.map(s => {
                          if (typeof s === 'string') return s;
                          if (typeof s === 'object' && s !== null) {
                            return s.nome || s.sabor?.nome || 'Sabor';
                          }
                          return 'Sabor';
                        }).join(', ')}
                      </div>
                    )}
                    
                    {item.borda && (
                      <div className="text-xs text-gray-700 mb-1">
                        <strong>🥨 Borda:</strong> {
                          typeof item.borda === 'string' 
                            ? item.borda 
                            : (item.borda.nome || 'Sem borda')
                        }
                      </div>
                    )}
                    
                    {item.observacoes && (
                      <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded mt-1">
                        <strong className="text-red-600 font-bold">⚠️ Observações:</strong> <span className="text-red-600 font-bold">{item.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
        {pedido.observacoes && (
          <div className="mt-3 p-3 bg-yellow-100 rounded border-l-4 border-yellow-500">
            <strong className="text-yellow-800">🗒️ Obs. do Pedido:</strong>
            <p className="text-red-600 font-bold mt-1">{pedido.observacoes}</p>
          </div>
        )}
      </div>

      {/* Ações específicas da preparação */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">
            {pedido.tempoEstimado}min estimado
          </div>
        </div>

        {/* Botão específico para pizzaiolo */}
        <div className="flex space-x-2">
          {pedido.status === 'recebido' && !pedido.pizzaiolo && (
            <button
              onClick={() => onAbrirModalPreparacao(pedido)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Assumir Pedido</span>
            </button>
          )}

          {pedido.status === 'recebido' && pedido.pizzaiolo && pedido.pizzaiolo._id !== user._id && (
            <div className="flex-1 bg-gray-100 border-2 border-gray-300 text-gray-600 px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Atribuído a {pedido.pizzaiolo.name}</span>
            </div>
          )}
          
          {pedido.status === 'recebido' && pedido.pizzaiolo && pedido.pizzaiolo._id === user._id && (
            <button
              onClick={() => onAbrirModalPreparacao(pedido)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Continuar Preparo</span>
            </button>
          )}

          {pedido.status === 'preparando' && (
            <button
              onClick={() => onAbrirModalPreparacao(pedido)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Utensils className="h-4 w-4" />
              <span>Gerenciar Preparo</span>
            </button>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          {pedido.status === 'recebido' && !pedido.pizzaiolo && '👨‍🍳 Clique para assumir este pedido'}
          {pedido.status === 'recebido' && pedido.pizzaiolo && pedido.pizzaiolo._id !== user._id && `🔒 Atribuído a ${pedido.pizzaiolo.name}`}
          {pedido.status === 'recebido' && pedido.pizzaiolo && pedido.pizzaiolo._id === user._id && '✅ Seu pedido - Clique para continuar'}
          {pedido.status === 'preparando' && '🍕 Clique para gerenciar o preparo das pizzas'}
        </div>
      </div>
    </div>
  );
};

// Componente para a aba de Finalização (Controle de Qualidade das Pizzas)
const PedidoCardFinalizacao = ({ 
  pedido, 
  onFinalizarPreparacao, 
  getStatusColor, 
  getStatusIcon, 
  getTempoDecorrido, 
  getCorTempo 
}) => {
  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  // Estado para controlar quais pizzas foram validadas e modais
  const [pizzasValidadas, setPizzasValidadas] = useState({});
  const [modalAberto, setModalAberto] = useState(false);
  const [pizzaSelecionada, setPizzaSelecionada] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Extrair todas as pizzas, incluindo as que estão dentro de combos
  const pizzas = [];
  
  pedido.itens.forEach((item, itemIndex) => {
    // Pizza direta
    if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
      pizzas.push({
        ...item,
        originalIndex: itemIndex,
        isFromCombo: false,
        pizzaKey: `direct-${itemIndex}`
      });
    }
    // Pizzas dentro de combos
    else if (item.item?.categoria === 'combo' || item.categoria === 'combo') {
      if (item.pizzas && item.pizzas.length > 0) {
        item.pizzas.forEach((pizza, pizzaIndex) => {
          pizzas.push({
            ...pizza,
            originalIndex: itemIndex,
            pizzaIndex: pizzaIndex,
            isFromCombo: true,
            comboName: item.item?.nome || item.nome,
            pizzaKey: `combo-${itemIndex}-${pizzaIndex}`
          });
        });
      }
    }
  });

  const abrirModalConfirmacao = (pizzaKey) => {
    setPizzaSelecionada(pizzaKey);
    setModalAberto(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 5000); // Aumentado para 5 segundos
  };

  const confirmarPizza = () => {
    if (pizzaSelecionada !== null) {
      setPizzasValidadas(prev => {
        const novasPizzasValidadas = {
          ...prev,
          [pizzaSelecionada]: true
        };
        
        // Verificar se todas as pizzas foram validadas após esta confirmação
        const todasValidadas = pizzas.length > 0 && pizzas.every(pizza => novasPizzasValidadas[pizza.pizzaKey]);
        
        // Se todas estão validadas, enviar automaticamente para expedição
        if (todasValidadas) {
          setTimeout(() => {
            showToast(`✅ Pedido #${formatarNumeroPedido(pedido.numero)} finalizado!`);
            setTimeout(() => {
              onFinalizarPreparacao(pedido._id);
            }, 1000); // Delay adicional para que o usuário veja o toast
          }, 800); // Aumentado o delay inicial
        }
        
        return novasPizzasValidadas;
      });
    }
    setModalAberto(false);
    setPizzaSelecionada(null);
  };

  const cancelarModal = () => {
    setModalAberto(false);
    setPizzaSelecionada(null);
  };

  // Verificar se todas as pizzas foram validadas
  const todasPizzasValidadas = pizzas.length > 0 && pizzas.every(pizza => pizzasValidadas[pizza.pizzaKey]);

  const getCorBorda = () => {
    return todasPizzasValidadas ? 'border-l-green-500' : 'border-l-orange-500';
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${getCorBorda()}`}>
        {/* Header clean - apenas número do pedido */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-gray-900">#{formatarNumeroPedido(pedido.numero)}</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
            todasPizzasValidadas 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
          }`}>
            {pizzas.filter(pizza => pizzasValidadas[pizza.pizzaKey]).length}/{pizzas.length} validadas
          </div>
        </div>

        {/* Pizzaiolo em seção destacada */}
        {pedido.pizzaiolo && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Preparado por:</span>
              <span className="font-semibold text-gray-900">👨‍🍳 {pedido.pizzaiolo.name}</span>
            </div>
          </div>
        )}

        {/* Lista de pizzas para validação com espaçamento space-y-3 */}
        <div className="space-y-3">
            {pizzas.map((pizza) => (
              <div key={pizza.pizzaKey} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {pizza.quantidade || 1}x
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {pizza.item?.nome || pizza.nome}
                    </div>
                    {/* Sabores em linha compacta */}
                    {(pizza.sabores && pizza.sabores.length > 0) && (
                      <div className="text-xs text-gray-600">
                        {pizza.sabores.map(s => {
                          if (typeof s === 'string') return s;
                          return s.sabor?.nome || s.nome || 'Sabor';
                        }).join(', ')}
                      </div>
                    )}
                    {/* Observações da pizza */}
                    {pizza.observacoes && (
                      <div className="text-xs text-orange-600 italic mt-1">
                        <span className="text-red-600 font-bold">{pizza.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de validação compacto */}
                <div>
                  {pizzasValidadas[pizza.pizzaKey] ? (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                      <span className="text-sm font-medium">Validada</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => abrirModalConfirmacao(pizza.pizzaKey)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Modal de Confirmação */}
        {modalAberto && pizzaSelecionada !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Pizza
            </h3>
            
{(() => {
              const pizzaSelecionadaObj = pizzas.find(pizza => pizza.pizzaKey === pizzaSelecionada);
              return pizzaSelecionadaObj && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-medium">
                      {pizzaSelecionadaObj.quantidade || 1}x
                    </span>
                    <span className="font-semibold">
                      {pizzaSelecionadaObj.item?.nome || pizzaSelecionadaObj.nome}
                    </span>
                    {pizzaSelecionadaObj.isFromCombo && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        📦 {pizzaSelecionadaObj.comboName}
                      </span>
                    )}
                  </div>
                  
                  {pizzaSelecionadaObj.sabores && pizzaSelecionadaObj.sabores.length > 0 && (
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>Sabores:</strong> {pizzaSelecionadaObj.sabores.map(s => {
                        if (typeof s === 'string') return s;
                        return s.sabor?.nome || s.nome || 'Sabor';
                      }).join(', ')}
                    </div>
                  )}
                  
                  {pizzaSelecionadaObj.borda && (
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>Borda:</strong> {pizzaSelecionadaObj.borda.nome || pizzaSelecionadaObj.borda}
                    </div>
                  )}
                  
                  {pizzaSelecionadaObj.observacoes && (
                    <div className="text-sm text-orange-700">
                      <strong>Observações:</strong> {pizzaSelecionadaObj.observacoes}
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="text-gray-600 mb-6">
              Confirma que esta pizza foi preparada corretamente e está pronta para expedição?
            </p>
            
            {(() => {
              const pizzasJaValidadas = pizzas.filter(pizza => pizzasValidadas[pizza.pizzaKey]).length;
              const totalPizzas = pizzas.length;
              const seraUltima = pizzasJaValidadas === totalPizzas - 1;
              
              return seraUltima && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <div className="text-lg">🚀</div>
                    <div className="text-sm font-medium">
                      Esta é a última pizza! Ao confirmar, o pedido será enviado automaticamente para expedição.
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex space-x-3">
              <button
                onClick={cancelarModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPizza}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificação */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg border-l-4 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-400 text-green-800' 
              : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PedidoCardExpedicao = ({ pedido, onEnviarParaExpedicao, getStatusColor, getStatusIcon, getTempoDecorrido, getCorTempo }) => {
  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  const getCorBorda = (status) => {
    const cores = {
      'pronto': 'border-l-green-500',
      'saiu_entrega': 'border-l-purple-500'
    };
    return cores[status] || 'border-l-gray-500';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${getCorBorda(pedido.status)} transform transition-all duration-200 hover:shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold text-gray-900">#{formatarNumeroPedido(pedido.numero)}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(pedido.status)}`}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(pedido.status)}
              <span className="font-semibold">{pedido.status.toUpperCase()}</span>
            </div>
          </span>
        </div>
        
        {/* Timer */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${(() => {
          const tempoInfo = getTempoDecorrido(pedido.createdAt);
          return getCorTempo(tempoInfo.minutos, pedido.status);
        })()}`}>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{getTempoDecorrido(pedido.createdAt).tempo}</span>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Users className="h-4 w-4 text-gray-600" />
          <span className="font-semibold text-gray-900">{pedido.cliente.nome}</span>
        </div>
        <p className="text-sm text-gray-600 ml-6">{pedido.cliente.telefone}</p>
        <div className="text-sm text-gray-600 ml-6 flex items-center space-x-2">
          {pedido.tipo === 'delivery' ? (
            <>
              <Truck className="h-4 w-4" />
              <span>Entrega</span>
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              <span>Retirada</span>
            </>
          )}
        </div>
        {pedido.tipo === 'delivery' && pedido.cliente.endereco && (
          <p className="text-sm text-gray-600 ml-6 mt-1">
            {pedido.cliente.endereco.rua}, {pedido.cliente.endereco.numero} - {pedido.cliente.endereco.bairro}
          </p>
        )}
      </div>

      {/* Resumo dos itens */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
          <ShoppingBag className="h-4 w-4 mr-2" />
          Itens ({pedido.itens.length})
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {pedido.itens.map((item, index) => (
            <div key={index} className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-200">
              <div className="font-medium text-gray-900">
                <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs mr-2">
                  {item.quantidade}x
                </span>
                {item.item?.nome || item.nome}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observações do pedido se existirem */}
      {pedido.observacoes && (
        <div className="mb-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-500">
          <strong className="text-yellow-800">📝 Observações da entrega:</strong>
          <p className="text-yellow-700 mt-1">{pedido.observacoes}</p>
        </div>
      )}

      {/* Ações da expedição */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            Total: <span className="text-green-600">R$ {pedido.valores.total.toFixed(2)}</span>
          </div>
          <div className="text-sm text-gray-500">
            {pedido.tipo === 'delivery' ? 'Para Entrega' : 'Para Retirada'}
          </div>
        </div>

        {/* Botões baseados no status */}
        <div className="flex space-x-2">
          {pedido.status === 'pronto' && (
            <button
              onClick={() => onEnviarParaExpedicao(pedido._id)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{pedido.tipo === 'delivery' ? 'Enviar para Entrega' : 'Liberar Retirada'}</span>
            </button>
          )}

          {pedido.status === 'saiu_entrega' && (
            <div className="flex-1 bg-purple-100 border-2 border-purple-300 text-purple-700 px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
              <Truck className="h-4 w-4" />
              <span>{pedido.tipo === 'delivery' ? 'Saiu para Entrega' : 'Liberado para Retirada'}</span>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          {pedido.status === 'pronto' && '📦 Pedido pronto para expedição'}
          {pedido.status === 'saiu_entrega' && '🚚 Aguardando confirmação de entrega'}
        </div>
      </div>
    </div>
  );
};

// Modal para seleção de motoboy
const ModalSelecaoMotoboy = ({ isOpen, onClose, motoboys, onSelect, pedido }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Selecionar Motoboy</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Pedido #{String(pedido?.numero).padStart(3, '0')} - {pedido?.cliente?.nome}
          </p>
        </div>

        {/* Seção de Bebidas */}
        {(() => {
          const todasBebidas = [];
          
          
          pedido?.itens?.forEach((item, itemIndex) => {
            // 1. Bebidas diretas (itens com categoria bebida)
            if (item.item?.categoria === 'bebida' || item.categoria === 'bebida') {
              todasBebidas.push({
                nome: item.item?.nome || item.nome,
                quantidade: item.quantidade
              });
            }
            
            // 2. Bebidas dentro de combos
            if ((item.item?.categoria === 'combo' || item.categoria === 'combo') && item.item?.itensCombo) {
              item.item.itensCombo.forEach(itemCombo => {
                // Detectar bebidas por categoria OU tipo
                if (itemCombo.categoria === 'bebida' || itemCombo.tipo === 'bebida') {
                  // Verificar se item está populado ou é apenas ID
                  let nomeBebida = 'Bebida';
                  
                  if (typeof itemCombo.item === 'object' && itemCombo.item?.nome) {
                    // Item populado corretamente
                    nomeBebida = itemCombo.item.nome;
                  } else if (typeof itemCombo.item === 'string') {
                    // Item é apenas ID - precisamos buscar ou usar fallback
                    console.log('⚠️ Bebida não populada, ID:', itemCombo.item);
                    // Mapear IDs conhecidos para nomes (temporário)
                    const bebidasConhecidas = {
                      '68548f2f12d47e27b4f20f2b': 'Coca Cola 2L',
                      // Adicionar outros IDs conforme necessário
                    };
                    nomeBebida = bebidasConhecidas[itemCombo.item] || 'Bebida';
                  }
                  
                  todasBebidas.push({
                    nome: nomeBebida,
                    quantidade: itemCombo.quantidade * item.quantidade
                  });
                }
              });
            }
            
            // 3. Bebidas dentro de pizzas (se existir campo bebidas na pizza)
            if ((item.item?.categoria === 'pizza' || item.categoria === 'pizza') && item.bebidas) {
              item.bebidas.forEach(bebida => {
                todasBebidas.push({
                  nome: bebida.nome,
                  quantidade: bebida.quantidade * item.quantidade
                });
              });
            }
            
            // 4. Bebidas dentro das pizzas dos combos
            if ((item.item?.categoria === 'combo' || item.categoria === 'combo') && item.pizzas) {
              item.pizzas.forEach((pizza, pizzaIndex) => {
                if (pizza.bebidas) {
                  pizza.bebidas.forEach(bebida => {
                    todasBebidas.push({
                      nome: bebida.nome,
                      quantidade: bebida.quantidade * item.quantidade
                    });
                  });
                }
              });
            }
          });
          
          if (todasBebidas.length > 0) {
            // Agrupar bebidas iguais
            const bebidasAgrupadas = {};
            todasBebidas.forEach(bebida => {
              const chave = bebida.nome;
              if (bebidasAgrupadas[chave]) {
                bebidasAgrupadas[chave].quantidade += bebida.quantidade;
              } else {
                bebidasAgrupadas[chave] = { ...bebida };
              }
            });
            
            return (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                  🥤 Bebidas do Pedido
                </h4>
                <div className="space-y-1">
                  {Object.values(bebidasAgrupadas).map((bebida, index) => (
                    <div key={index} className="text-sm text-blue-700 font-medium">
                      {bebida.quantidade}x {bebida.nome}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {motoboys.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum motoboy disponível</p>
          ) : (
            motoboys.map(motoboy => (
              <button
                key={motoboy._id}
                onClick={() => onSelect(motoboy._id)}
                className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium">{motoboy.name}</div>
                {motoboy.dadosMotoboy?.telefone && (
                  <div className="text-sm text-gray-500">
                    {motoboy.dadosMotoboy.telefone}
                  </div>
                )}
                {motoboy.dadosMotoboy?.veiculo && (
                  <div className="text-xs text-gray-400">
                    {motoboy.dadosMotoboy.veiculo} - {motoboy.dadosMotoboy.placa}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CozinhaDashboard;