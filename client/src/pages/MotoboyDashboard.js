import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Bike, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Navigation,
  Phone,
  LogOut,
  ArrowRight,
  Car,
  Compass,
  Map,
  Package,
  History,
  User,
  ChevronDown,
  Calendar,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';
import GoogleMapMotoboy from '../components/GoogleMapMotoboy';

const MotoboyDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, connected, on } = useSocket();
  const [entregas, setEntregas] = useState([]);
  const [estatisticas, setEstatisticas] = useState({
    entregasHoje: 0,
    ganhosDia: 0,
    ganhosSemanais: 0,
    tempoMedioEntrega: 0
  });
  
  // Estados para o modal de navegação
  const [modalNavegacaoAberto, setModalNavegacaoAberto] = useState(false);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  
  // Estado para rastrear entregas em andamento
  const [entregasEntregando, setEntregasEntregando] = useState(new Set());
  
  // Estado para aba ativa
  const [abaAtiva, setAbaAtiva] = useState('pedidos');
  
  // Estado para loading dos pedidos
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  
  // Define userId no nível do componente
  const userId = user?._id || user?.id;
  
  // Estados para filtros do histórico
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dataInicio, setDataInicio] = useState(() => {
    const agora = new Date();
    // Se for antes das 4:00, considera ainda o dia anterior
    if (agora.getHours() < 4) {
      agora.setDate(agora.getDate() - 1);
    }
    // Sempre começa às 4:00 da manhã
    agora.setHours(4, 0, 0, 0);
    return agora.toISOString().slice(0, 16); // formato datetime-local
  });
  const [dataFim, setDataFim] = useState(() => {
    const agora = new Date();
    // Se for antes das 4:00, considera ainda o dia anterior
    if (agora.getHours() < 4) {
      agora.setDate(agora.getDate() - 1);
    }
    // Termina às 3:59 do próximo dia
    agora.setDate(agora.getDate() + 1);
    agora.setHours(3, 59, 59, 999);
    return agora.toISOString().slice(0, 16); // formato datetime-local
  });
  
  // Estados para modal de detalhes do pedido
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  
  // Estados para o mapa
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [erroLocalizacao, setErroLocalizacao] = useState(null);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  
  // Estados para controlar carregamento único do mapa
  const [mapaJaCarregado, setMapaJaCarregado] = useState(false);
  const [carregandoMapaInicial, setCarregandoMapaInicial] = useState(false);

  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };

  // Função para obter localização atual sem alterar visualização
  const atualizarLocalizacaoSilenciosa = () => {
    if (!navigator.geolocation) {
      setErroLocalizacao('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    setCarregandoLocalizacao(true);
    setErroLocalizacao(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalizacaoAtual({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCarregandoLocalizacao(false);
        console.log('🏍️ Localização atualizada silenciosamente:', position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        let mensagemErro = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagemErro = 'Permissão para acessar localização foi negada';
            break;
          case error.POSITION_UNAVAILABLE:
            mensagemErro = 'Localização não disponível';
            break;
          case error.TIMEOUT:
            mensagemErro = 'Tempo limite para obter localização esgotado';
            break;
        }
        setErroLocalizacao(mensagemErro);
        setCarregandoLocalizacao(false);
        console.error('🏍️ Erro ao obter localização:', mensagemErro);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  };

  // Função para obter localização atual
  const obterLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      setErroLocalizacao('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    setCarregandoLocalizacao(true);
    setErroLocalizacao(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalizacaoAtual({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCarregandoLocalizacao(false);
        console.log('🏍️ Localização obtida:', position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        let mensagemErro = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagemErro = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            mensagemErro = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            mensagemErro = 'Tempo limite excedido para obter localização';
            break;
        }
        setErroLocalizacao(mensagemErro);
        setCarregandoLocalizacao(false);
        console.error('🏍️ Erro de localização:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  };

  // UseEffect simples para carregar dados iniciais
  useEffect(() => {
    console.log('🏍️ [MOTOBOY DEBUG] Objeto user completo:', JSON.stringify(user, null, 2));
    console.log('🏍️ [MOTOBOY DEBUG] user.id:', user?.id);
    console.log('🏍️ [MOTOBOY DEBUG] user._id:', user?._id);
    console.log('🏍️ [MOTOBOY DEBUG] Object.keys(user):', user ? Object.keys(user) : 'user é null');
    
    if (!user || !userId) {
      console.log('🏍️ [MOTOBOY DEBUG] Aguardando usuário...');
      return;
    }
    
    console.log('🏍️ [MOTOBOY DEBUG] Carregando entregas... userId:', userId);
    loadEntregas();
    loadEstatisticas();
    
    // Solicitar localização após login
    obterLocalizacaoAtual();
  }, [user]);

  // UseEffect separado para WebSocket
  useEffect(() => {
    if (!user || !socket || !connected) return;

    console.log('🏍️ MotoboyDashboard: Conectando ao WebSocket');
    
    const cleanup = [];
    
    // Escutar eventos de tempo real
    cleanup.push(on('pedido_atualizado', (data) => {
      loadEntregas();
      loadEstatisticas();
    }));
    
    cleanup.push(on('pedido_aceito_entrega', (data) => {
      if (user && data.motoboyId === user._id) {
        loadEntregas();
        loadEstatisticas();
      }
    }));
    
    cleanup.push(on('pedido_entregue', (data) => {
      loadEntregas();
      loadEstatisticas();
    }));
    
    cleanup.push(on('novo_pedido', (data) => {
      if (data.tipo === 'delivery') {
        loadEntregas();
      }
    }));
    
    return () => {
      cleanup.forEach(fn => fn());
    };
  }, [socket, connected, user]);

  const loadEntregas = async () => {
    try {
      if (!user || !userId) return;
      
      console.log('🏍️ [MOTOBOY DEBUG] Fazendo requisição para:', `/pedidos/motoboy/${userId}`);
      const response = await api.get(`/pedidos/motoboy/${userId}`);
      
      console.log('🏍️ [MOTOBOY DEBUG] Entregas recebidas:', response.data.length);
      
      // Preservar status local de entregas em andamento
      setEntregas(prev => {
        const entregasDoServidor = response.data;
        const entregasAtualizadas = entregasDoServidor.map(entrega => {
          // Se a entrega estava marcada como 'entregando' localmente, manter esse status
          const entregaLocal = prev.find(e => e._id === entrega._id);
          if (entregaLocal && entregaLocal.status === 'entregando' && entrega.status === 'saiu_entrega') {
            console.log(`🟠 Preservando status 'entregando' para pedido ${entrega.numero}`);
            return { ...entrega, status: 'entregando' };
          }
          return entrega;
        });
        return entregasAtualizadas;
      });
    } catch (error) {
      console.error('🏍️ [MOTOBOY DEBUG] ERRO ao carregar entregas:', error.response?.data?.message || error.message);
    }
  };

  // Função para atualizar pedidos com loading
  const atualizarPedidos = async () => {
    setCarregandoPedidos(true);
    try {
      await loadEntregas();
      await loadEstatisticas();
    } finally {
      setCarregandoPedidos(false);
    }
  };

  const loadEstatisticas = async () => {
    try {
      if (!user || !userId) {
        console.warn('Usuário não disponível para carregar estatísticas');
        return;
      }
      const response = await api.get(`/usuarios/${userId}/stats`);
      setEstatisticas(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Calcular ganhos baseado nas entregas
  const calcularGanhos = () => {
    const userId = user?._id || user?.id;
    if (!userId) return { entregasHoje: 0, ganhosDia: 0, ganhosSemanais: 0, tempoMedioEntrega: 0 };
    
    const entregasHoje = entregas.filter(e => {
      const hoje = new Date().toDateString();
      const entregaData = new Date(e.createdAt).toDateString();
      // Comparar IDs corretamente
      const motoboyId = e.motoboy && (typeof e.motoboy === 'object' ? e.motoboy._id || e.motoboy : e.motoboy);
      return hoje === entregaData && e.status === 'entregue' && motoboyId && motoboyId.toString() === userId.toString();
    });
    
    const ganhosDia = entregasHoje.reduce((total, entrega) => {
      return total + (entrega.valores?.comissaoMotoboy || 2.50);
    }, 0);
    
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    
    const entregasSemana = entregas.filter(e => {
      const entregaData = new Date(e.createdAt);
      // Comparar IDs corretamente
      const motoboyId = e.motoboy && (typeof e.motoboy === 'object' ? e.motoboy._id || e.motoboy : e.motoboy);
      return entregaData >= semanaAtras && e.status === 'entregue' && motoboyId && motoboyId.toString() === userId.toString();
    });
    
    const ganhosSemanais = entregasSemana.reduce((total, entrega) => {
      return total + (entrega.valores?.comissaoMotoboy || 2.50);
    }, 0);
    
    return {
      entregasHoje: entregasHoje.length,
      ganhosDia,
      ganhosSemanais,
      tempoMedioEntrega: 25 // Placeholder - pode ser calculado depois
    };
  };


  const marcarComoEntregue = async (pedidoId) => {
    try {
      console.log('🏍️ Marcando pedido como entregue:', pedidoId);
      console.log('🏍️ URL do endpoint:', `/pedidos/${pedidoId}/entregar`);
      const response = await api.patch(`/pedidos/${pedidoId}/entregar`);
      console.log('🏍️ Resposta da API:', response.status, response.data);
      loadEntregas();
      loadEstatisticas();
    } catch (error) {
      console.error('🏍️ ERRO 500 detalhado:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      });
    }
  };

  // Funções para navegação
  const abrirModalNavegacao = (endereco, pedido) => {
    console.log('📍 Modal de navegação aberto:', { endereco, pedido });
    setEnderecoSelecionado(endereco);
    setPedidoSelecionado(pedido);
    setModalNavegacaoAberto(true);
  };

  const fecharModalNavegacao = () => {
    setModalNavegacaoAberto(false);
    setEnderecoSelecionado(null);
    setPedidoSelecionado(null);
  };

  const abrirWaze = async () => {
    console.log('🚗 Tentando abrir Waze:', { enderecoSelecionado, pedidoSelecionado });
    if (!enderecoSelecionado || !pedidoSelecionado) {
      console.error('❌ Dados faltando para navegação');
      return;
    }
    
    // Marcar pedido como entregando no estado local para mudar cor do pin
    setEntregasEntregando(prev => new Set([...prev, pedidoSelecionado._id]));
    
    // Atualizar entregas localmente para refletir a mudança de cor
    setEntregas(prev => {
      const novasEntregas = prev.map(entrega => 
        entrega._id === pedidoSelecionado._id 
          ? { ...entrega, status: 'entregando' }
          : entrega
      );
      console.log('🔄 Entregas atualizadas:', novasEntregas.find(e => e._id === pedidoSelecionado._id));
      return novasEntregas;
    });
    
    // O mapa deve atualizar automaticamente via useEffect quando entregas mudarem
    
    const lat = enderecoSelecionado.lat || enderecoSelecionado.latitude;
    const lng = enderecoSelecionado.lng || enderecoSelecionado.longitude;
    
    let url;
    if (lat && lng) {
      // Tentar abrir primeiro o app do Waze, depois fallback para web
      url = `waze://?ll=${lat},${lng}&navigate=yes`;
      const fallbackUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      
      // Criar link temporário para testar se o app abre
      const link = document.createElement('a');
      link.href = url;
      link.click();
      
      // Fallback para web se app não abrir (timeout)
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
    } else {
      const endereco = encodeURIComponent(`${enderecoSelecionado.rua}, ${enderecoSelecionado.numero}, ${enderecoSelecionado.bairro}`);
      url = `waze://?q=${endereco}&navigate=yes`;
      const fallbackUrl = `https://waze.com/ul?q=${endereco}&navigate=yes`;
      
      const link = document.createElement('a');
      link.href = url;
      link.click();
      
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
    }
    
    console.log('✅ Navegação Waze iniciada');
    fecharModalNavegacao();
  };

  const abrirGoogleMaps = async () => {
    console.log('🗺️ Tentando abrir Google Maps:', { enderecoSelecionado, pedidoSelecionado });
    if (!enderecoSelecionado || !pedidoSelecionado) {
      console.error('❌ Dados faltando para navegação');
      return;
    }
    
    // Marcar pedido como entregando no estado local para mudar cor do pin
    setEntregasEntregando(prev => new Set([...prev, pedidoSelecionado._id]));
    
    // Atualizar entregas localmente para refletir a mudança de cor
    setEntregas(prev => {
      const novasEntregas = prev.map(entrega => 
        entrega._id === pedidoSelecionado._id 
          ? { ...entrega, status: 'entregando' }
          : entrega
      );
      console.log('🔄 Entregas atualizadas:', novasEntregas.find(e => e._id === pedidoSelecionado._id));
      return novasEntregas;
    });
    
    // O mapa deve atualizar automaticamente via useEffect quando entregas mudarem
    
    const lat = enderecoSelecionado.lat || enderecoSelecionado.latitude;
    const lng = enderecoSelecionado.lng || enderecoSelecionado.longitude;
    
    let url;
    if (lat && lng) {
      // Tentar abrir primeiro o app do Google Maps, depois fallback para web
      url = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      
      // Criar link temporário para testar se o app abre
      const link = document.createElement('a');
      link.href = url;
      link.click();
      
      // Fallback para web se app não abrir (timeout)
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
    } else {
      const endereco = encodeURIComponent(`${enderecoSelecionado.rua}, ${enderecoSelecionado.numero}, ${enderecoSelecionado.bairro}`);
      url = `comgooglemaps://?q=${endereco}&directionsmode=driving`;
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${endereco}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.click();
      
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
    }
    
    console.log('✅ Navegação Google Maps iniciada');
    fecharModalNavegacao();
  };

  // Funções para modal de detalhes
  const abrirModalDetalhes = (pedido) => {
    setPedidoDetalhes(pedido);
    setModalDetalhesAberto(true);
  };

  const fecharModalDetalhes = () => {
    setModalDetalhesAberto(false);
    setPedidoDetalhes(null);
  };
  
  // Apenas minhas entregas (atribuídas a mim) - inclui tanto pendentes quanto em andamento
  const minhasEntregas = entregas.filter(e => {
    // Comparar IDs corretamente (ObjectId vs String)
    const motoboyId = e.motoboy && (typeof e.motoboy === 'object' ? e.motoboy._id || e.motoboy : e.motoboy);
    return motoboyId && userId && motoboyId.toString() === userId.toString() && 
           (e.status === 'saiu_entrega' || e.status === 'entregando');
  });
  
  const entregasFinalizadas = entregas.filter(e => {
    // Comparar IDs corretamente (ObjectId vs String) 
    const motoboyId = e.motoboy && (typeof e.motoboy === 'object' ? e.motoboy._id || e.motoboy : e.motoboy);
    return motoboyId && userId && motoboyId.toString() === userId.toString() && e.status === 'entregue';
  });
  
  // Usar ganhos calculados se as estatísticas não estão disponíveis
  const ganhosCalculados = calcularGanhos();
  const estatisticasExibicao = {
    entregasHoje: estatisticas.entregasHoje || ganhosCalculados.entregasHoje,
    ganhosDia: estatisticas.ganhosDia || ganhosCalculados.ganhosDia,
    ganhosSemanais: estatisticas.ganhosSemanais || ganhosCalculados.ganhosSemanais,
    tempoMedioEntrega: estatisticas.tempoMedioEntrega || ganhosCalculados.tempoMedioEntrega
  };

  const getTempoDecorrido = (timestamp) => {
    const agora = new Date();
    const inicio = new Date(timestamp);
    const diffMs = agora - inicio;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  // Função para obter endereço do pedido
  const obterEnderecoCompleto = (pedido) => {
    const endereco = pedido.endereco || pedido.enderecoEntrega || pedido.cliente?.endereco;
    if (!endereco) return 'Endereço não informado';
    return endereco.bairro || 'Bairro não informado';
  };

  // Função para obter status em português
  const obterStatusPt = (status) => {
    const statusMap = {
      'entregue': 'Pendente',
      'finalizado_pago': 'A receber',
      'recebido': 'Recebido' // Status futuro para quando o motoboy receber
    };
    return statusMap[status] || status;
  };

  // Filtrar pedidos do histórico - apenas pedidos já entregues
  const pedidosFiltrados = entregas.filter(pedido => {
    // Só mostrar pedidos que já foram entregues (status 'entregue' ou 'finalizado_pago')
    if (!['entregue', 'finalizado_pago'].includes(pedido.status)) {
      return false;
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'pendente' && pedido.status !== 'entregue') {
        return false;
      }
      if (filtroStatus === 'a_receber' && pedido.status !== 'finalizado_pago') {
        return false;
      }
      if (filtroStatus === 'recebido' && pedido.status !== 'recebido') {
        return false;
      }
    }

    // Filtro por data e hora
    if (dataInicio) {
      const dataPedido = new Date(pedido.createdAt);
      const dataInicioFiltro = new Date(dataInicio);
      if (dataPedido < dataInicioFiltro) return false;
    }
    
    if (dataFim) {
      const dataPedido = new Date(pedido.createdAt);
      const dataFimFiltro = new Date(dataFim);
      if (dataPedido > dataFimFiltro) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Conteúdo baseado na aba ativa */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {abaAtiva === 'pedidos' && (
          <div className="fixed inset-0 top-0 bottom-16 bg-gray-100">
            {/* Loading overlay durante atualização de pedidos */}
            {carregandoPedidos && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-700">Atualizando pedidos...</p>
                </div>
              </div>
            )}

            {/* Header escuro */}
            <div className="bg-gray-800 text-white p-3 rounded-none">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">Pedidos</h1>
                <button
                  onClick={atualizarPedidos}
                  className="p-2 bg-transparent hover:bg-gray-700 text-white rounded-full transition-colors"
                  title="Atualizar pedidos"
                  disabled={carregandoPedidos}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  </button>
                </div>
            </div>

            {/* Lista de pedidos */}
            <div className="p-4">
              {minhasEntregas.length > 0 ? (
                <div className="space-y-4">
                  {minhasEntregas.map((pedido) => (
                    <EntregaCard
                      key={pedido._id}
                      pedido={pedido}
                      tipo="andamento"
                      onEntregar={() => marcarComoEntregue(pedido._id)}
                      getTempoDecorrido={getTempoDecorrido}
                      onAbrirNavegacao={abrirModalNavegacao}
                      onAbrirDetalhes={abrirModalDetalhes}
                      entregasEntregando={entregasEntregando}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Navigation className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma entrega atribuída</h3>
                  <p className="mt-1 text-gray-500">Aguarde novas entregas serem atribuídas a você.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="fixed inset-0 top-0 bottom-16 bg-gray-100">
            {/* Header escuro */}
            <div className="bg-gray-800 text-white p-3 rounded-none">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">Histórico</h1>
                <div className="w-9 h-9"></div> {/* Spacer para manter altura igual */}
              </div>
            </div>

            {/* Filtros */}
            <div className="p-4 space-y-2">
              {/* Filtros de data */}
              <div className="flex space-x-1">
                <div className="flex-1">
                  <input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      if (novaData !== dataInicio) {
                        setDataInicio(novaData);
                        loadEntregas(); // Recarregar apenas se mudou
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-white rounded text-xs text-gray-700 border border-gray-300"
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      if (novaData !== dataFim) {
                        setDataFim(novaData);
                        loadEntregas(); // Recarregar apenas se mudou
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-white rounded text-xs text-gray-700 border border-gray-300"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Dropdown Todos */}
              <div className="relative">
                <select
                  value={filtroStatus}
                  onChange={(e) => {
                    const novoStatus = e.target.value;
                    if (novoStatus !== filtroStatus) {
                      setFiltroStatus(novoStatus);
                      loadEntregas(); // Recarregar apenas se mudou
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-white rounded text-xs text-gray-700 border border-gray-300 appearance-none"
                  style={{ fontSize: '12px' }}
                >
                  <option value="todos">Todos</option>
                  <option value="pendente" style={{ color: 'black' }}>Pendente</option>
                  <option value="a_receber">A receber</option>
                  <option value="recebido">Recebido</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Cabeçalho da tabela */}
            <div className="mx-4 bg-white border-b border-gray-200">
              <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <div className="text-center">PEDIDO</div>
                <div className="text-center">BAIRRO</div>
                <div className="text-center">TAXA</div>
                <div className="text-center">SITUAÇÃO</div>
              </div>
            </div>

            {/* Lista de pedidos */}
            <div className="mx-4 bg-white">
              {pedidosFiltrados.length > 0 ? (
                pedidosFiltrados
                  .sort((a, b) => {
                    // Ordenar por data de entrega (updatedAt quando mudou para 'entregue') - mais recente primeiro
                    const dataEntregaA = new Date(a.updatedAt || a.createdAt);
                    const dataEntregaB = new Date(b.updatedAt || b.createdAt);
                    return dataEntregaB - dataEntregaA; // Decrescente (mais novo primeiro)
                  })
                  .map((pedido) => (
                  <div key={pedido._id} className="border-b border-gray-100 last:border-b-0">
                    <div className="grid grid-cols-4 gap-4 px-4 py-4 text-xs">
                      <div className="font-medium text-gray-900 text-center">
                        #{formatarNumeroPedido(pedido.numero)}
                      </div>
                      <div className="text-gray-600 text-center">
                        {obterEnderecoCompleto(pedido)}
                      </div>
                      <div className="text-gray-600 text-center">
                        Grátis
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-gray-900 mr-2 text-xs">
                          {obterStatusPt(pedido.status)}
                        </span>
                        {pedido.status === 'entregue' && (
                          <div className="flex items-center text-orange-500">
                            <span className="mr-1">⏳</span>
                          </div>
                        )}
                        {pedido.status === 'finalizado_pago' && (
                          <div className="flex items-center text-blue-500">
                            <RefreshCw className="h-4 w-4" />
                          </div>
                        )}
                        {pedido.status === 'recebido' && (
                          <div className="flex items-center text-green-500">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  Nenhum pedido encontrado
                </div>
              )}
            </div>

            {/* Rodapé com total */}
            <div className="fixed bottom-16 left-0 right-0 bg-gray-500 text-white p-3">
              <div className="text-right font-medium text-sm">
                PEDIDOS: <span className="font-bold">{pedidosFiltrados.length}</span>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'perfil' && (
          <div className="fixed inset-0 top-0 bottom-16 bg-gray-100">
            {/* Header escuro */}
            <div className="bg-gray-800 text-white p-3 rounded-none">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">Perfil</h1>
                <div className="w-9 h-9"></div> {/* Spacer para manter altura igual */}
              </div>
            </div>

            <div className="p-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <div className="mt-1 text-sm text-gray-900">{user?.name}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pizzaria</label>
                    <div className="mt-1 text-sm text-gray-900">{user?.pizzariaNome}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cargo</label>
                    <div className="mt-1 text-sm text-gray-900">Motoboy</div>
                  </div>

                  {/* Botão Sair */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'mapa' && (
          <div className="fixed inset-0 top-0 bottom-16 bg-gray-100">
            {/* Loading overlay durante carregamento inicial do mapa */}
            {carregandoMapaInicial && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Carregando Mapa</h3>
                  <p className="text-sm text-gray-600">Inicializando integração com Google Maps...</p>
                  <div className="mt-4 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header do Mapa */}
            <div className="bg-gray-800 text-white p-3 rounded-none z-20 relative">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">Mapa</h1>
                <button
                    onClick={() => {
                      if (mapaJaCarregado) {
                        atualizarLocalizacaoSilenciosa();
                      }
                    }}
                  className="p-2 bg-transparent hover:bg-gray-700 text-white rounded-full transition-colors"
                  title="Atualizar localização"
                  disabled={carregandoLocalizacao || carregandoMapaInicial || !mapaJaCarregado}
                >
                  {carregandoLocalizacao ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* Mapa */}
            <div className="relative w-full" style={{height: 'calc(100% - 40px)'}}>
              {/* Loading overlay durante atualização de localização */}
              {carregandoLocalizacao && localizacaoAtual && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-700">Atualizando localização...</p>
                  </div>
                </div>
              )}

              {erroLocalizacao && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-300 z-10">
                  <div className="text-center p-4">
                    <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600 mb-3">{erroLocalizacao}</p>
                    <button
                      onClick={obterLocalizacaoAtual}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}

              {!erroLocalizacao && localizacaoAtual && mapaJaCarregado && !carregandoMapaInicial && (
                <GoogleMapMotoboy
                  localizacaoAtual={localizacaoAtual}
                  entregas={minhasEntregas}
                  onAbrirNavegacao={abrirModalNavegacao}
                  formatarNumeroPedido={formatarNumeroPedido}
                  onErro={(erro) => setErroLocalizacao(erro)}
                />
              )}

              {!erroLocalizacao && !localizacaoAtual && mapaJaCarregado && !carregandoMapaInicial && (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <span className="text-sm text-gray-700">Obtendo sua localização...</span>
                  </div>
                </div>
              )}
            </div>


          </div>
        )}
      </div>

      {/* Barra de navegação inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => {
              if (carregandoMapaInicial) return; // Não permitir clique durante carregamento
              
              if (!mapaJaCarregado) {
                // Primeira vez carregando o mapa
                setCarregandoMapaInicial(true);
                setAbaAtiva('mapa');
                
                // Simular loading de 3 segundos
                setTimeout(() => {
                  setMapaJaCarregado(true);
                  setCarregandoMapaInicial(false);
                  // Obter localização após o loading
                  obterLocalizacaoAtual();
                }, 3000);
              } else {
                // Mapa já foi carregado antes, apenas trocar aba
                setAbaAtiva('mapa');
              }
            }}
            className={`flex flex-col items-center justify-center space-y-1 ${
              abaAtiva === 'mapa' ? 'text-red-500' : 'text-gray-300 hover:text-white'
            } ${carregandoMapaInicial ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={carregandoMapaInicial}
          >
            <Map className="h-5 w-5" />
            <span className="text-xs">Mapa</span>
          </button>
          
          <button
            onClick={() => setAbaAtiva('pedidos')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              abaAtiva === 'pedidos' ? 'text-red-500' : 'text-gray-300 hover:text-white'
            } ${carregandoMapaInicial ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={carregandoMapaInicial}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">Pedidos</span>
          </button>
          
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              abaAtiva === 'historico' ? 'text-red-500' : 'text-gray-300 hover:text-white'
            } ${carregandoMapaInicial ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={carregandoMapaInicial}
          >
            <History className="h-5 w-5" />
            <span className="text-xs">Histórico</span>
          </button>
          
          <button
            onClick={() => setAbaAtiva('perfil')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              abaAtiva === 'perfil' ? 'text-red-500' : 'text-gray-300 hover:text-white'
            } ${carregandoMapaInicial ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={carregandoMapaInicial}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </div>

      {/* Modal de Detalhes do Pedido */}
      {modalDetalhesAberto && pedidoDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Detalhes do Pedido: {formatarNumeroPedido(pedidoDetalhes.numero)}
                </h2>
                <p className="text-sm text-gray-500">
                  Registrado às {new Date(pedidoDetalhes.createdAt).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              <button
                onClick={fecharModalDetalhes}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Cliente */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cliente:</p>
                  <p className="font-bold text-gray-900">{pedidoDetalhes.cliente?.nome || 'Cliente'}</p>
                  {pedidoDetalhes.cliente?.telefone && (
                    <p className="text-sm text-gray-600">{pedidoDetalhes.cliente.telefone}</p>
                  )}
                </div>
                {pedidoDetalhes.cliente?.telefone && (
                  <button
                    onClick={() => window.open(`tel:${pedidoDetalhes.cliente.telefone}`)}
                    className="bg-green-500 text-white p-2 rounded-full"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="p-4 border-b">
              <p className="text-sm text-gray-600 mb-1">Endereço:</p>
              {(() => {
                const endereco = pedidoDetalhes.endereco || pedidoDetalhes.enderecoEntrega || pedidoDetalhes.cliente?.endereco;
                if (endereco) {
                  return (
                    <div>
                      <p className="font-medium text-gray-900">
                        {endereco.rua}, {endereco.numero}
                      </p>
                      <p className="text-gray-600">
                        {endereco.bairro}, {endereco.cidade} - {endereco.estado || 'SC'}
                      </p>
                      {endereco.complemento && (
                        <p className="text-red-600 font-medium">
                          {endereco.complemento}
                        </p>
                      )}
                      {endereco.referencia && (
                        <p className="text-red-600 font-medium">
                          {endereco.referencia}
                        </p>
                      )}
                    </div>
                  );
                }
                return <p className="text-red-600">Endereço não informado</p>;
              })()}
            </div>

            {/* Itens do pedido */}
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-3">Itens do pedido</h3>
              <div className="space-y-3">
                {pedidoDetalhes.itens?.map((item, index) => {
                  // Pizzas explodidas
                  const pizzasExplodidas = [];
                  const bebidasExplodidas = [];
                  
                  if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
                    pizzasExplodidas.push({
                      nome: item.item?.nome || item.nome,
                      quantidade: item.quantidade,
                      sabores: item.sabores,
                      borda: item.borda,
                      observacoes: item.observacoes,
                      preco: item.subtotal || 0
                    });
                  }
                  
                  if (item.item?.categoria === 'bebida' || item.categoria === 'bebida') {
                    bebidasExplodidas.push({
                      nome: item.item?.nome || item.nome,
                      quantidade: item.quantidade,
                      preco: item.subtotal || 0
                    });
                  }
                  
                  if (item.item?.categoria === 'combo' || item.categoria === 'combo') {
                    // Pizzas do combo
                    if (item.pizzas) {
                      item.pizzas.forEach(pizza => {
                        pizzasExplodidas.push({
                          nome: pizza.nome || pizza.item?.nome || 'Pizza',
                          quantidade: (pizza.quantidade || 1) * item.quantidade,
                          sabores: pizza.sabores,
                          borda: pizza.borda,
                          observacoes: pizza.observacoes,
                          preco: item.subtotal || 0,
                          isCombo: true,
                          comboNome: item.item?.nome
                        });
                      });
                    }
                    
                    // Bebidas do combo
                    if (item.item?.itensCombo) {
                      item.item.itensCombo.forEach(itemCombo => {
                        if (itemCombo.tipo === 'bebida' || itemCombo.categoria === 'bebida') {
                          const nomeItem = itemCombo.item?.nome || itemCombo.nome;
                          let nomeBebida = nomeItem;
                          if (!nomeItem && typeof itemCombo.item === 'string') {
                            const bebidasConhecidas = {
                              '68548f2f12d47e27b4f20f2b': 'Coca Cola 2L'
                            };
                            nomeBebida = bebidasConhecidas[itemCombo.item] || 'Bebida';
                          }
                          
                          bebidasExplodidas.push({
                            nome: nomeBebida || 'Bebida',
                            quantidade: (itemCombo.quantidade || 1) * item.quantidade,
                            tamanho: itemCombo.item?.tamanho || '',
                            preco: 0,
                            isCombo: true
                          });
                        }
                      });
                    }
                  }

                  return (
                    <div key={index}>
                      {/* Pizzas */}
                      {pizzasExplodidas.map((pizza, pIndex) => (
                        <div key={`pizza-${pIndex}`} className="border-b border-gray-100 pb-2 mb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">
                                {String(pizza.quantidade).padStart(2, '0')} - {pizza.nome}
                              </p>
                              {pizza.isCombo && (
                                <p className="text-xs text-gray-500">({pizza.comboNome})</p>
                              )}
                              {pizza.sabores && pizza.sabores.length > 0 && (
                                <div className="mt-1">
                                  {pizza.sabores.map((saborInfo, sIndex) => (
                                    <p key={sIndex} className="text-sm text-gray-600">
                                      • {saborInfo.sabor?.nome || saborInfo.nome}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {pizza.borda && (
                                <p className="text-sm text-gray-600">
                                  Borda {pizza.borda.nome || pizza.borda} {pizza.borda.preco ? '' : '(Grátis)'}
                                </p>
                              )}
                              {pizza.observacoes && (
                                <p className="text-sm text-red-600 font-medium">
                                  Obs: {pizza.observacoes}
                                </p>
                              )}
                            </div>
                            {!pizza.isCombo && (
                              <p className="font-medium text-gray-900">
                                R$ {pizza.preco.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Bebidas */}
                      {bebidasExplodidas.map((bebida, bIndex) => (
                        <div key={`bebida-${bIndex}`} className="border-b border-gray-100 pb-2 mb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {String(bebida.quantidade).padStart(2, '0')} - Bebida
                              </p>
                              <p className="text-sm text-gray-600">
                                {bebida.nome} {bebida.tamanho}
                              </p>
                            </div>
                            <p className="font-medium text-gray-900">
                              {bebida.isCombo ? 'Grátis' : `R$ ${bebida.preco.toFixed(2)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Valores */}
            <div className="p-4 bg-gray-50 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega</span>
                <span>R$ {(pedidoDetalhes.valores?.taxaEntrega || 5.00).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Desconto</span>
                <span>- - -</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cupom</span>
                <span>- - -</span>
              </div>
            </div>

            {/* Pagamento */}
            <div className="p-4 bg-gray-800 text-white">
              <h3 className="font-bold mb-2">Pagamentos</h3>
              <div className="flex justify-between items-center">
                <span>
                  {typeof pedidoDetalhes.formaPagamento === 'string' 
                    ? pedidoDetalhes.formaPagamento 
                    : (pedidoDetalhes.formaPagamento?.tipo || 'iFood Online')}
                </span>
                <span className="font-bold text-lg">
                  R$ {(pedidoDetalhes.valores?.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escolha de Navegação */}
      {modalNavegacaoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Escolha o aplicativo de navegação
              </h3>
              
              {enderecoSelecionado && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-1 text-sm mb-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-700">Destino:</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {enderecoSelecionado.rua}, {enderecoSelecionado.numero}
                  </p>
                  <p className="text-sm text-gray-600">
                    {enderecoSelecionado.bairro}
                    {enderecoSelecionado.complemento && ` - ${enderecoSelecionado.complemento}`}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={abrirGoogleMaps}
                  className="flex-1 flex flex-col items-center justify-center space-y-2 p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-10 h-10">
                      <path fill="#1c9957" d="M42,39V9c0-1.657-1.343-3-3-3H9C7.343,6,6,7.343,6,9v30c0,1.657,1.343,3,3,3h30C40.657,42,42,40.657,42,39z"/>
                      <path fill="#3e7bf1" d="M9,42h30c1.657,0-15-16-15-16S7.343,42,9,42z"/>
                      <path fill="#cbccc9" d="M42,39V9c0-1.657-16,15-16,15S42,40.657,42,39z"/>
                      <path fill="#efefef" d="M39,42c1.657,0,3-1.343,3-3v-0.245L26.245,23L23,26.245L38.755,42H39z"/>
                      <path fill="#ffd73d" d="M42,9c0-1.657-1.343-3-3-3h-0.245L6,38.755V39c0,1.657,1.343,3,3,3h0.245L42,9.245V9z"/>
                      <path fill="#d73f35" d="M36,2c-5.523,0-10,4.477-10,10c0,6.813,7.666,9.295,9.333,19.851C35.44,32.531,35.448,33,36,33s0.56-0.469,0.667-1.149C38.334,21.295,46,18.813,46,12C46,6.477,41.523,2,36,2z"/>
                      <path fill="#752622" d="M36 8.5A3.5 3.5 0 1 0 36 15.5A3.5 3.5 0 1 0 36 8.5Z"/>
                      <path fill="#fff" d="M14.493,12.531v2.101h2.994c-0.392,1.274-1.455,2.185-2.994,2.185c-1.833,0-3.318-1.485-3.318-3.318s1.486-3.318,3.318-3.318c0.824,0,1.576,0.302,2.156,0.799l1.548-1.547C17.22,8.543,15.92,8,14.493,8c-3.038,0-5.501,2.463-5.501,5.5s2.463,5.5,5.501,5.5c4.81,0,5.637-4.317,5.184-6.461L14.493,12.531z"/>
                    </svg>
                  </div>
                  <span className="font-medium text-sm text-gray-700">Google Maps</span>
                </button>

                <button
                  onClick={abrirWaze}
                  className="flex-1 flex flex-col items-center justify-center space-y-2 p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg viewBox="0 0 52 52" className="w-10 h-10">
                      <g fill="none" fillRule="evenodd">
                        <path fill="#3CF" d="M52 8.557v34.886A8.557 8.557 0 0143.443 52H8.557A8.557 8.557 0 010 43.443V8.557A8.557 8.557 0 018.557 0h34.886A8.557 8.557 0 0152 8.557z"/>
                        <path fill="#000" d="M41.607 24.045a13.95 13.95 0 00-4.096-9.904C34.871 11.49 31.367 10.03 27.646 10.03 23.38 10.03 19.404 11.938 16.69 15.353a14.006 14.006 0 00-3.03 8.706v2.325c0 1.184-.93 2.35-2.501 2.352a.598.598 0 00-.57.425c-.292.972.892 3.116 2.57 4.819a13.639 13.639 0 003.673 2.66 3.89 3.89 0 003.826 4.56 3.865 3.865 0 003.81-3.116l3.258.002c.434 2.202 2.715 3.711 5.155 2.884a3.699 3.699 0 002.285-2.253c.364-1.016.313-2.002-.018-2.846a14.089 14.089 0 002.372-1.916 13.95 13.95 0 004.089-9.91"/>
                        <path fill="#FFF" d="M27.543 36.937l-3.173-.002a3.88 3.88 0 00-3.8-3.126 3.845 3.845 0 00-3.27 1.78l-.001.025a12.206 12.206 0 01-3.137-2.324c-1.093-1.109-1.687-2.123-1.959-2.764a3.79 3.79 0 001.86-1.084 3.898 3.898 0 001.036-2.663v-2.317c0-2.76.916-5.456 2.607-7.632 2.417-3.11 5.994-4.85 9.837-4.85 3.308 0 6.425 1.298 8.774 3.657a12.404 12.404 0 013.644 8.808c0 3.33-1.291 6.46-3.637 8.815-2.291 2.3-5.435 3.677-8.78 3.677"/>
                        <circle fill="#000" cx="33.748" cy="21.336" r="1.553"/>
                        <circle fill="#000" cx="25.977" cy="21.336" r="1.553"/>
                        <path fill="#000" d="M24.9 26.44a.781.781 0 00-.708-.442.774.774 0 00-.703 1.1 6.21 6.21 0 005.62 3.576 6.21 6.21 0 005.62-3.576.774.774 0 00-.704-1.1h-.02a.763.763 0 00-.687.443 4.663 4.663 0 01-4.21 2.675A4.663 4.663 0 0124.9 26.44"/>
                      </g>
                    </svg>
                  </div>
                  <span className="font-medium text-sm text-gray-700">Waze</span>
                </button>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={fecharModalNavegacao}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EntregaCard = ({ pedido, tipo, onEntregar, getTempoDecorrido, onAbrirNavegacao, onAbrirDetalhes, entregasEntregando }) => {
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Função para formatar número do pedido com 3 dígitos
  const formatarNumeroPedido = (numero) => {
    return String(numero).padStart(3, '0');
  };


  // Funções de touch/mouse para swipe
  const handleStart = (clientX) => {
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    // Só permite arrastar para direita sem limite
    if (deltaX > 0) {
      setDragX(deltaX);
    }
  };

  const handleEnd = () => {
    const cardWidth = cardRef.current?.offsetWidth || 300;
    const currentDragX = dragX; // Salvar o valor antes de resetar
    
    console.log('🏍️ DragX atual:', currentDragX, 'CardWidth:', cardWidth, 'Necessário:', cardWidth * 0.5);
    
    if (currentDragX > cardWidth * 0.5) {
      // Swipe de pelo menos 50% da largura do card para finalizar
      console.log('🏍️ Finalizando entrega via swipe:', pedido.numero);
      setIsCompleting(true);
      
      // Animar o card saindo completamente para direita
      setDragX(cardWidth + 100);
      
      // Aguardar animação e depois chamar onEntregar
      setTimeout(() => {
        onEntregar();
      }, 300);
    } else {
      console.log('🏍️ Swipe insuficiente:', currentDragX, 'de', cardWidth * 0.5, 'necessário');
    }
    
    setIsDragging(false);
    if (currentDragX <= cardWidth * 0.5) {
      setDragX(0); // Só reseta se não estiver completando
    }
    setStartX(0);
  };

  // Event handlers para mouse
  const handleMouseDown = (e) => {
    if (isCompleting) return; // Prevenir interação durante finalização
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX);
  }, [isDragging, startX]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [dragX]);

  // Event handlers para touch
  const handleTouchStart = (e) => {
    if (isCompleting) return; // Prevenir interação durante finalização
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX);
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [dragX]);

  // Adicionar/remover event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative overflow-hidden">
      {/* Background vermelho que aparece quando arrasta */}
      <div 
        className="absolute inset-0 bg-red-500 flex items-center justify-start pl-6"
        style={{ 
          opacity: dragX > 0 ? Math.min(dragX / 150, 0.8) : 0,
          transition: isDragging ? 'none' : 'opacity 0.3s ease'
        }}
      >
        <div className="flex items-center space-x-2 text-white">
          <CheckCircle size={24} />
          <span className="font-medium">Finalizar entrega</span>
          <ArrowRight size={20} />
        </div>
      </div>

      {/* Card principal que desliza */}
      <div 
        ref={cardRef}
        className="relative bg-white p-6 border-l-4 border-green-500 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : isCompleting ? 'transform 0.3s ease-out' : 'transform 0.3s ease',
          opacity: isCompleting ? 0.7 : 1
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => {
          // Só abre detalhes se não estiver arrastando
          if (!isDragging && dragX === 0) {
            onAbrirDetalhes?.(pedido);
          }
        }}
      >
      {/* Header estilo iFood */}
      <div className="flex items-center justify-between mb-4 bg-gray-800 text-white p-3 -m-6 mb-4">
        <span className="text-xl font-bold">#{formatarNumeroPedido(pedido.numero)}</span>
        <span className="text-lg font-medium text-center flex-1 mx-4">{pedido.cliente?.nome || 'Cliente'}</span>
        {tipo === 'andamento' ? (
          <span className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium">
            EM ENTREGA
          </span>
        ) : (
          <div className="w-20"></div>
        )}
      </div>

      {/* Pizzas e Bebidas Explodidas */}
      <div className="mb-4">
        {(() => {
          const pizzasExplodidas = [];
          const bebidasExplodidas = [];
          
          pedido.itens?.forEach((item) => {
            // 1. Pizza direta
            if (item.item?.categoria === 'pizza' || item.categoria === 'pizza') {
              pizzasExplodidas.push({
                nome: item.item?.nome || item.nome,
                quantidade: item.quantidade,
                sabores: item.sabores,
                borda: item.borda,
                observacoes: item.observacoes
              });
            }
            
            // 2. Bebida direta
            if (item.item?.categoria === 'bebida' || item.categoria === 'bebida') {
              bebidasExplodidas.push({
                nome: item.item?.nome || item.nome,
                quantidade: item.quantidade
              });
            }
            
            // 3. Itens de combo
            if ((item.item?.categoria === 'combo' || item.categoria === 'combo')) {
              // Pizzas do combo
              if (item.pizzas) {
                item.pizzas.forEach(pizza => {
                  pizzasExplodidas.push({
                    nome: pizza.nome || pizza.item?.nome || 'Pizza',
                    quantidade: (pizza.quantidade || 1) * item.quantidade,
                    sabores: pizza.sabores,
                    borda: pizza.borda,
                    observacoes: pizza.observacoes
                  });
                });
              }
              
              // Bebidas do combo (via itensCombo)
              if (item.item?.itensCombo) {
                item.item.itensCombo.forEach(itemCombo => {
                  if (itemCombo.tipo === 'bebida' || itemCombo.categoria === 'bebida') {
                    const nomeItem = itemCombo.item?.nome || itemCombo.nome;
                    // Mapear IDs conhecidos se necessário
                    let nomeBebida = nomeItem;
                    if (!nomeItem && typeof itemCombo.item === 'string') {
                      const bebidasConhecidas = {
                        '68548f2f12d47e27b4f20f2b': 'Coca Cola 2L'
                      };
                      nomeBebida = bebidasConhecidas[itemCombo.item] || `Bebida ${itemCombo.tamanhoBebida || ''}`;
                    }
                    
                    bebidasExplodidas.push({
                      nome: nomeBebida || 'Bebida',
                      quantidade: (itemCombo.quantidade || 1) * item.quantidade
                    });
                  }
                });
              }
            }
          });
          
          return (
            <div className="grid grid-cols-2 gap-4">
              {/* Coluna Produtos (Pizzas) */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase">PRODUTOS</h4>
                {pizzasExplodidas.length > 0 ? (
                  <div className="space-y-1">
                    {pizzasExplodidas.map((pizza, index) => (
                      <div key={index} className="text-sm">
                        <div className="text-gray-900">
                          <span className="font-bold">{pizza.quantidade.toString().padStart(2, '0')} -</span> {pizza.nome}
                        </div>
                        {pizza.observacoes && (
                          <div className="text-xs text-red-600 font-bold">
                            Obs: {pizza.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nenhuma pizza</div>
                )}
              </div>

              {/* Coluna Bebidas */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase">BEBIDAS</h4>
                {bebidasExplodidas.length > 0 ? (
                  <div className="space-y-1">
                    {bebidasExplodidas.map((bebida, index) => (
                      <div key={index} className="text-sm text-gray-900">
                        <span className="font-bold">{bebida.quantidade.toString().padStart(2, '0')} -</span> {bebida.nome}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nenhuma bebida</div>
                )}
              </div>
            </div>
          );
        })()}
      </div>


      {/* Endereço estilo iFood */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase">ENDEREÇO</h4>
        {(() => {
          const endereco = pedido.endereco || pedido.enderecoEntrega || pedido.cliente?.endereco;
          
          if (endereco) {
            return (
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  {endereco.cep && `${endereco.cep} - `}{endereco.rua}, {endereco.numero}
                </p>
                <p className="text-sm text-gray-600">
                  {endereco.bairro}, {endereco.cidade}{endereco.estado && ` - ${endereco.estado}`}
                </p>
                {endereco.complemento && (
                  <p className="text-sm text-gray-600">{endereco.complemento}</p>
                )}
                {endereco.referencia && (
                  <p className="text-xs text-gray-500 italic mt-1">
                    Ref: {endereco.referencia}
                  </p>
                )}
              </div>
            );
          } else {
            return <p className="text-sm text-red-600">Endereço não informado</p>;
          }
        })()}
      </div>


      {/* Informações de Pagamento estilo iFood */}
      <div className="mb-4">
        <div className="text-sm text-gray-600">
          {(() => {
            if (typeof pedido.formaPagamento === 'string') {
              return pedido.formaPagamento.charAt(0).toUpperCase() + pedido.formaPagamento.slice(1);
            }
            
            const tipo = pedido.formaPagamento?.tipo;
            if (tipo === 'dinheiro') return 'Dinheiro';
            if (tipo === 'cartao') return 'Cartão';
            if (tipo === 'pix') return 'PIX';
            if (tipo === 'ifood') return 'iFood';
            
            return 'iFood Online';
          })()}
        </div>
        <div className="text-xs text-gray-500">
          {pedido.formaPagamento?.necessitaTroco ? 
            `(Troco R$ ${pedido.formaPagamento.valorTroco?.toFixed(2) || '0,00'})` : 
            pedido.status === 'entregue' ? '(Já pago)' : ''}
        </div>
      </div>

      {/* Rodapé com status e ações */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {pedido.cliente?.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${pedido.cliente.telefone}`);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Ligar para cliente"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
          <span className="text-sm text-gray-500">
            👉 Arraste para finalizar
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {entregasEntregando && entregasEntregando.has(pedido._id) ? (
            <button
              className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium flex items-center cursor-default"
              disabled
            >
              <Bike className="h-4 w-4 mr-1" />
              Entregando
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const endereco = pedido.endereco || pedido.enderecoEntrega || pedido.cliente?.endereco;
                if (endereco) {
                  onAbrirNavegacao(endereco, pedido);
                }
              }}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium flex items-center transition-colors"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Iniciar
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default MotoboyDashboard;