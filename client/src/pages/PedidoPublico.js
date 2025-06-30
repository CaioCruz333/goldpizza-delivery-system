import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  Crown, 
  MapPin, 
  Phone, 
  Clock, 
  ShoppingCart, 
  Plus, 
  Minus,
  User,
  Home,
  CreditCard,
  Check,
  Pizza,
  CupSoda,
  X
} from 'lucide-react';
import api from '../services/api';

const PedidoPublico = () => {
  const { pizzariaId } = useParams();
  
  const [pizzaria, setPizzaria] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [step, setStep] = useState(1); // 1: cardapio, 2: cliente, 3: endereço, 4: pagamento, 5: confirmação
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [clienteData, setClienteData] = useState({
    nome: '',
    telefone: '',
    email: ''
  });
  const [enderecoData, setEnderecoData] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    cep: '',
    referencia: ''
  });
  const [tipoPedido, setTipoPedido] = useState('delivery');
  const [formaPagamento, setFormaPagamento] = useState({
    tipo: 'dinheiro',
    necessitaTroco: false,
    valorTroco: 0
  });
  const [loading, setLoading] = useState(true);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [pizzaSelecionada, setPizzaSelecionada] = useState(null);
  const [socket, setSocket] = useState(null);
  const [observacoesPedido, setObservacoesPedido] = useState('');
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboSelecionado, setComboSelecionado] = useState(null);
  const [pedidoCriado, setPedidoCriado] = useState(null);

  useEffect(() => {
    loadDados();
  }, [pizzariaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup do WebSocket para atualizações de cardápio em tempo real
  useEffect(() => {
    if (!pizzariaId) return;

    console.log('🔌 Conectando WebSocket para cardápio em tempo real...');
    
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'https://goldpizza-backend.onrender.com'
      : 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado para cardápio!', newSocket.id);
      // Entrar na sala da pizzaria
      newSocket.emit('join_pizzaria', pizzariaId);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
    });

    // Listener para atualizações de cardápio
    newSocket.on('cardapio_updated', (data) => {
      console.log('📡 Cardápio atualizado:', data);
      
      // Recarregar cardápio quando houver mudanças
      const reloadCardapio = async () => {
        try {
          const cardapioResponse = await api.get(`/cardapio/publico/${pizzariaId}`);
          setCardapio(cardapioResponse.data);
          console.log('🔄 Cardápio recarregado automaticamente');
        } catch (error) {
          console.error('Erro ao recarregar cardápio:', error);
        }
      };

      reloadCardapio();
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('🔌 Desconectando WebSocket do cardápio...');
      newSocket.disconnect();
    };
  }, [pizzariaId]);

  const loadDados = async () => {
    try {
      setLoading(true);
      
      // Se não há pizzariaId na URL, buscar a primeira pizzaria disponível
      let pizzariaParaBuscar = pizzariaId;
      
      if (!pizzariaParaBuscar) {
        const pizzariasResponse = await api.get('/pizzarias/publico');
        if (pizzariasResponse.data.length > 0) {
          pizzariaParaBuscar = pizzariasResponse.data[0]._id;
        } else {
          throw new Error('Nenhuma pizzaria encontrada');
        }
      }

      // Carregar dados da pizzaria
      const [pizzariaResponse, cardapioResponse] = await Promise.all([
        api.get(`/pizzarias/publico/${pizzariaParaBuscar}`),
        api.get(`/cardapio/publico/${pizzariaParaBuscar}`)
      ]);

      setPizzaria(pizzariaResponse.data);
      setCardapio(cardapioResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados da pizzaria');
    } finally {
      setLoading(false);
    }
  };

  const adicionarAoCarrinho = (item) => {
    const itemExistente = carrinho.find(c => c.item._id === item._id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(c => 
        c.item._id === item._id 
          ? { ...c, quantidade: c.quantidade + 1 }
          : c
      ));
    } else {
      setCarrinho([...carrinho, { item, quantidade: 1 }]);
    }
  };

  const removerDoCarrinho = (itemId) => {
    const itemExistente = carrinho.find(c => c.item._id === itemId);
    
    if (itemExistente && itemExistente.quantidade > 1) {
      setCarrinho(carrinho.map(c => 
        c.item._id === itemId 
          ? { ...c, quantidade: c.quantidade - 1 }
          : c
      ));
    } else {
      setCarrinho(carrinho.filter(c => c.item._id !== itemId));
    }
  };

  const calcularSubtotal = () => {
    return carrinho.reduce((acc, item) => {
      // Se for pizza personalizada ou combo configurado, usar precoTotal
      if (item.precoTotal) {
        return acc + item.precoTotal;
      }
      // Validar se item.item existe antes de acessar preco
      if (item.item && typeof item.item.preco === 'number') {
        return acc + (item.item.preco * item.quantidade);
      }
      // Se for um combo antigo sem estrutura correta, usar valorTotal
      if (item.valorTotal) {
        return acc + item.valorTotal;
      }
      // Fallback: tentar usar preco diretamente do item
      if (typeof item.preco === 'number') {
        return acc + (item.preco * (item.quantidade || 1));
      }
      console.warn('Item no carrinho com estrutura inválida:', item);
      return acc;
    }, 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const taxaEntrega = tipoPedido === 'delivery' ? 5.00 : 0;
    return subtotal + taxaEntrega;
  };

  const buscarCliente = async (telefone, email) => {
    try {
      const response = await api.post('/clientes/buscar', {
        telefone: telefone || undefined,
        email: email || undefined
      });
      const cliente = response.data;
      
      setClienteData({
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || ''
      });

      // Se o cliente tem endereços, usar o primeiro
      if (cliente.enderecos && cliente.enderecos.length > 0) {
        setEnderecoData(cliente.enderecos[0]);
      }
      
      return cliente;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Cliente não encontrado
      }
      throw error;
    }
  };

  const criarCliente = async () => {
    try {
      const response = await api.post('/clientes', {
        ...clienteData,
        enderecos: tipoPedido === 'delivery' ? [enderecoData] : []
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const abrirModalPizza = (pizza) => {
    setPizzaSelecionada(pizza);
    setShowPizzaModal(true);
  };

  const abrirModalCombo = (combo) => {
    setComboSelecionado(combo);
    setShowComboModal(true);
  };

  const adicionarPizzaPersonalizada = (pizzaPersonalizada) => {
    // Agora as bebidas fazem parte do preço da pizza (apenas valor premium)
    // Não precisa mais adicionar bebidas como itens separados
    setCarrinho([...carrinho, pizzaPersonalizada]);
    setShowPizzaModal(false);
    setPizzaSelecionada(null);
  };

  const adicionarComboPersonalizado = (comboPersonalizado) => {
    setCarrinho([...carrinho, comboPersonalizado]);
    setShowComboModal(false);
    setComboSelecionado(null);
  };

  const finalizarPedido = async () => {
    let pedidoData = null;
    
    try {
      setLoading(true);

      // Buscar cliente por telefone OU email
      let cliente = await buscarCliente(clienteData.telefone, clienteData.email);
      
      // Se não encontrou, criar novo cliente
      if (!cliente) {
        cliente = await criarCliente();
      }

      // Preparar itens do pedido
      const itens = carrinho.map(item => {
        const baseItem = {
          item: item.item._id,
          quantidade: item.quantidade,
          precoUnitario: item.item.preco,
          valorEspecial: item.valorEspecial || 0,
          sabores: item.sabores ? item.sabores.map(sabor => ({
            sabor: sabor._id,
            quantidade: 1
          })) : [],
          borda: item.borda?._id || null,
          observacoes: item.observacoes || ''
        };

        // Se for um combo com itens configurados, adicionar as pizzas configuradas
        if (item.item.categoria === 'combo' && item.itensConfigurados) {
          baseItem.pizzas = item.itensConfigurados
            .filter(itemConfig => itemConfig.tipo === 'pizza')
            .map(pizzaConfig => ({
              nome: pizzaConfig.item.nome,
              categoria: 'pizza',
              quantidade: 1,
              sabores: pizzaConfig.configuracao?.sabores || [],
              borda: pizzaConfig.configuracao?.borda || null,
              observacoes: pizzaConfig.configuracao?.observacoes || ''
            }));
        }

        return baseItem;
      });

      // Criar pedido
      pedidoData = {
        clienteId: cliente._id,
        pizzariaId: pizzaria._id,
        itens,
        endereco: tipoPedido === 'delivery' ? enderecoData : null,
        tipo: tipoPedido,
        formaPagamento,
        observacoes: observacoesPedido
      };

      console.log('Enviando pedido:', pedidoData);
      const response = await api.post('/pedidos', pedidoData);
      
      // Armazenar dados do pedido criado
      setPedidoCriado(response.data);
      
      // Limpar carrinho após pedido criado com sucesso
      setCarrinho([]);
      
      // Reset dos dados para novo pedido (opcional - manter dados do cliente)
      // setClienteData({ nome: '', telefone: '', email: '' });
      // setEnderecoData({ rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', referencia: '' });
      
      // Ir para tela de confirmação
      setStep(5);
      
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      if (pedidoData) {
        console.error('Dados do pedido:', pedidoData);
      }
      console.error('Resposta do servidor:', error.response?.data);
      alert(`Erro ao finalizar pedido: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="mx-auto h-12 w-12 text-gold-600 animate-spin" />
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!pizzaria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Pizzaria não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-gold-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{pizzaria.nome}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{pizzaria.endereco?.cidade}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{pizzaria.contato?.telefone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Aberto</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Carrinho */}
            <div className="relative">
              <button
                onClick={() => setShowCarrinho(true)}
                className="flex items-center space-x-2 bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700"
                disabled={carrinho.length === 0}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Carrinho ({carrinho.length})</span>
                {carrinho.length > 0 && (
                  <span className="ml-2 font-semibold">
                    R$ {calcularSubtotal().toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 && (
          <CardapioStep 
            cardapio={cardapio}
            carrinho={carrinho}
            onAdicionarItem={adicionarAoCarrinho}
            onRemoverItem={removerDoCarrinho}
            onSelecionarPizza={abrirModalPizza}
            onSelecionarCombo={abrirModalCombo}
          />
        )}
        
        {step === 2 && (
          <ClienteStep 
            clienteData={clienteData}
            setClienteData={setClienteData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            buscarCliente={buscarCliente}
          />
        )}
        
        {step === 3 && (
          <EnderecoStep 
            enderecoData={enderecoData}
            setEnderecoData={setEnderecoData}
            tipoPedido={tipoPedido}
            setTipoPedido={setTipoPedido}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        
        {step === 4 && (
          <PagamentoStep 
            formaPagamento={formaPagamento}
            setFormaPagamento={setFormaPagamento}
            carrinho={carrinho}
            tipoPedido={tipoPedido}
            total={calcularTotal()}
            observacoesPedido={observacoesPedido}
            setObservacoesPedido={setObservacoesPedido}
            onFinalizar={finalizarPedido}
            onBack={() => setStep(3)}
            loading={loading}
          />
        )}
        
        {step === 5 && (
          <ConfirmacaoStep 
            pedido={pedidoCriado}
            onNovopedido={() => {
              setStep(1);
              setPedidoCriado(null);
            }} 
          />
        )}
      </main>

      {/* Modal de Personalização de Pizza */}
      {showPizzaModal && pizzaSelecionada && (
        <PizzaPersonalizacaoModal
          pizza={pizzaSelecionada}
          cardapio={cardapio}
          onConfirmar={adicionarPizzaPersonalizada}
          onCancelar={() => setShowPizzaModal(false)}
        />
      )}

      {/* Modal de Personalização de Combo */}
      {showComboModal && comboSelecionado && (
        <ComboPersonalizacaoModal
          combo={comboSelecionado}
          cardapio={cardapio}
          onConfirmar={adicionarComboPersonalizado}
          onCancelar={() => setShowComboModal(false)}
        />
      )}

      {/* Modal do Carrinho */}
      {showCarrinho && (
        <CarrinhoModal
          carrinho={carrinho}
          setCarrinho={setCarrinho}
          calcularSubtotal={calcularSubtotal}
          onFechar={() => setShowCarrinho(false)}
          onFinalizar={() => {
            setShowCarrinho(false);
            setStep(2);
          }}
        />
      )}
    </div>
  );
};

// Componente para exibir o cardápio
const CardapioStep = ({ cardapio, carrinho, onAdicionarItem, onRemoverItem, onSelecionarPizza, onSelecionarCombo }) => {
  // Filtrar apenas categorias que devem aparecer no cardápio principal
  const categoriasVisiveis = ['combo', 'pizza', 'bebida'];
  
  // Ordenar categorias na ordem desejada
  const ordemCategorias = ['combo', 'pizza', 'bebida'];
  
  const getQuantidadeNoCarrinho = (itemId) => {
    const item = carrinho.find(c => c.item._id === itemId);
    return item ? item.quantidade : 0;
  };

  const getNomeCategoria = (categoria) => {
    const nomes = {
      'combo': 'Combos',
      'pizza': 'Pizzas',
      'bebida': 'Bebidas'
    };
    return nomes[categoria] || categoria;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Nosso Cardápio</h2>
        <p className="text-gray-600">Escolha seus itens favoritos</p>
      </div>

      {ordemCategorias.map(categoria => {
        const itensCategoria = cardapio.filter(item => {
          // Verificar categoria e se está nas categorias visíveis
          if (item.categoria !== categoria || !categoriasVisiveis.includes(item.categoria)) {
            return false;
          }
          
          // Para pizzas, verificar se está visível no cardápio
          if (item.categoria === 'pizza') {
            return item.visivelCardapio === true;
          }
          
          return true;
        });
        
        if (itensCategoria.length === 0) return null;

        return (
          <div key={categoria} className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              {getNomeCategoria(categoria)}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itensCategoria.map(item => (
                <div 
                  key={item._id} 
                  className={`bg-white rounded-lg shadow p-6 transition-all duration-200 ${
                    item.categoria === 'pizza' || item.categoria === 'combo' || item.categoria === 'bebida'
                      ? 'cursor-pointer hover:shadow-lg hover:scale-105 transform' 
                      : ''
                  }`}
                  onClick={() => {
                    if (item.categoria === 'pizza') {
                      onSelecionarPizza(item);
                    } else if (item.categoria === 'combo') {
                      onSelecionarCombo(item);
                    } else if (item.categoria === 'bebida') {
                      onAdicionarItem(item);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.nome}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.descricao}</p>
                    </div>
                    <div className="ml-4">
                      {typeof item.preco === 'number' && item.preco === 0
                        ? <span className="text-lg font-medium text-gold-600">Grátis</span>
                        : <span className="text-lg font-medium text-gold-600">
                            R$ {typeof item.preco === 'number' ? item.preco.toFixed(2) : '0.00'}
                          </span>
                      }
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {item.categoria === 'pizza' ? (
                      // Para pizzas, mostrar indicador visual
                      <div className="flex-1 flex items-center justify-center space-x-2 text-gold-600">
                        <Pizza className="h-4 w-4" />
                        <span className="font-medium">Clique para personalizar</span>
                      </div>
                    ) : item.categoria === 'combo' ? (
                      // Para combos, mostrar indicador visual
                      <div className="flex-1 flex items-center justify-center space-x-2 text-orange-600">
                        <Pizza className="h-4 w-4" />
                        <span className="font-medium">Clique para montar combo</span>
                      </div>
                    ) : item.categoria === 'bebida' ? (
                      // Para bebidas, mostrar quantidade e indicador de clique
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2 text-blue-600">
                          <Plus className="h-4 w-4" />
                          <span className="font-medium">Clique para adicionar</span>
                        </div>
                        {getQuantidadeNoCarrinho(item._id) > 0 && (
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {getQuantidadeNoCarrinho(item._id)}
                          </span>
                        )}
                      </div>
                    ) : (
                      // Para outros itens, mostrar controles de quantidade (sem clique no card)
                      <div 
                        className="flex items-center space-x-2"
                        onClick={(e) => e.stopPropagation()} // Impede que o clique no card seja ativado
                      >
                        <button
                          onClick={() => onRemoverItem(item._id)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          disabled={getQuantidadeNoCarrinho(item._id) === 0}
                        >
                          <Minus className="h-4 w-4 text-gray-500" />
                        </button>
                        <span className="w-8 text-center">{getQuantidadeNoCarrinho(item._id)}</span>
                        <button
                          onClick={() => onAdicionarItem(item)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4 text-gold-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componentes dos outros steps (simplificados para este exemplo)
const ClienteStep = ({ clienteData, setClienteData, onNext, onBack, buscarCliente }) => {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Seus Dados</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            value={clienteData.nome}
            onChange={(e) => setClienteData({...clienteData, nome: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Seu nome completo"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input
            type="tel"
            value={clienteData.telefone}
            onChange={(e) => setClienteData({...clienteData, telefone: e.target.value})}
            onBlur={async (e) => {
              const telefone = e.target.value.trim();
              if (telefone && telefone.length >= 10) {
                try {
                  await buscarCliente(telefone, null);
                } catch (error) {
                  // Não mostrar erro se cliente não encontrado
                  console.log('Cliente não encontrado pelo telefone');
                }
              }
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="(11) 99999-9999"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email (opcional)</label>
          <input
            type="email"
            value={clienteData.email}
            onChange={(e) => setClienteData({...clienteData, email: e.target.value})}
            onBlur={async (e) => {
              const email = e.target.value.trim();
              if (email && email.includes('@')) {
                try {
                  await buscarCliente(null, email);
                } catch (error) {
                  console.log('Cliente não encontrado pelo email');
                }
              }
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="seu@email.com"
          />
        </div>
      </div>
      
      <div className="flex space-x-4 mt-6">
        <button onClick={onBack} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">
          Voltar
        </button>
        <button 
          onClick={onNext}
          disabled={!clienteData.nome || !clienteData.telefone}
          className="flex-1 bg-gold-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

const EnderecoStep = ({ enderecoData, setEnderecoData, tipoPedido, setTipoPedido, onNext, onBack }) => {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tipo de Pedido</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setTipoPedido('delivery')}
            className={`flex-1 p-4 rounded-lg border-2 ${
              tipoPedido === 'delivery' ? 'border-gold-500 bg-gold-50' : 'border-gray-300'
            }`}
          >
            <Home className="h-6 w-6 mx-auto mb-2" />
            <div className="text-center">Delivery</div>
          </button>
          <button
            onClick={() => setTipoPedido('retirada')}
            className={`flex-1 p-4 rounded-lg border-2 ${
              tipoPedido === 'retirada' ? 'border-gold-500 bg-gold-50' : 'border-gray-300'
            }`}
          >
            <User className="h-6 w-6 mx-auto mb-2" />
            <div className="text-center">Retirada</div>
          </button>
        </div>
        
        {tipoPedido === 'delivery' && (
          <div className="space-y-4 pt-4">
            <h3 className="font-medium">Endereço de Entrega</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={enderecoData.rua}
                onChange={(e) => setEnderecoData({...enderecoData, rua: e.target.value})}
                placeholder="Rua"
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={enderecoData.numero}
                onChange={(e) => setEnderecoData({...enderecoData, numero: e.target.value})}
                placeholder="Número"
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={enderecoData.bairro}
                onChange={(e) => setEnderecoData({...enderecoData, bairro: e.target.value})}
                placeholder="Bairro"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={enderecoData.cidade}
                onChange={(e) => setEnderecoData({...enderecoData, cidade: e.target.value})}
                placeholder="Cidade"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={enderecoData.cep}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ''); // Remove não-números
                  if (value.length > 5) {
                    value = value.slice(0, 5) + '-' + value.slice(5, 8);
                  }
                  setEnderecoData({...enderecoData, cep: value});
                }}
                placeholder="CEP (00000-000)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                maxLength="9"
              />
            </div>
          
          {/* Campos adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={enderecoData.complemento}
              onChange={(e) => setEnderecoData({...enderecoData, complemento: e.target.value})}
              placeholder="Complemento (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={enderecoData.referencia}
              onChange={(e) => setEnderecoData({...enderecoData, referencia: e.target.value})}
              placeholder="Ponto de referência (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-4 mt-6">
        <button onClick={onBack} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">
          Voltar
        </button>
        <button 
          onClick={() => {
            // Validação para delivery
            if (tipoPedido === 'delivery') {
              const camposObrigatorios = ['rua', 'numero', 'bairro', 'cidade', 'cep'];
              const camposFaltando = camposObrigatorios.filter(campo => !enderecoData[campo]?.trim());
              
              if (camposFaltando.length > 0) {
                alert(`Por favor, preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`);
                return;
              }
              
              // Validar formato do CEP
              const cepRegex = /^\d{5}-?\d{3}$/;
              if (!cepRegex.test(enderecoData.cep)) {
                alert('Por favor, insira um CEP válido (formato: 00000-000)');
                return;
              }
            }
            
            onNext();
          }}
          className="flex-1 bg-gold-600 text-white py-2 rounded-lg hover:bg-gold-700"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

const PagamentoStep = ({ formaPagamento, setFormaPagamento, carrinho, tipoPedido, total, observacoesPedido, setObservacoesPedido, onFinalizar, onBack, loading }) => {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Forma de Pagamento</h2>
      
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-medium mb-4">Resumo do Pedido</h3>
          {carrinho.map((item, index) => (
            <div key={item.id || item.item._id || index} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>{item.quantidade}x {item.item.nome}</span>
                <span>R$ {(item.precoTotal || (item.item.preco * item.quantidade)).toFixed(2)}</span>
              </div>
              {/* Detalhes da pizza personalizada */}
              {item.sabores && item.sabores.length > 0 && (
                <div className="text-xs text-gray-500 ml-4">
                  Sabores: {item.sabores.map(s => s.nome || s).join(', ')}
                  {item.borda && ` | Borda: ${item.borda.nome}`}
                </div>
              )}
              {item.bebidas && item.bebidas.length > 0 && (
                <div className="text-xs text-gray-500 ml-4">
                  Bebidas: {item.bebidas.map(b => `${b.nome} (${b.quantidade}x)`).join(', ')}
                </div>
              )}
              {item.observacoes && (
                <div className="text-xs text-gray-500 ml-4">
                  Obs: {item.observacoes}
                </div>
              )}
            </div>
          ))}
          {tipoPedido === 'delivery' && (
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span>Taxa de entrega</span>
              <span>R$ 5.00</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-2 mt-2">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {['dinheiro', 'cartao_debito', 'cartao_credito', 'pix'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setFormaPagamento({...formaPagamento, tipo})}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                formaPagamento.tipo === tipo ? 'border-gold-500 bg-gold-50' : 'border-gray-300'
              }`}
            >
              <CreditCard className="h-4 w-4 inline mr-2" />
              {tipo === 'dinheiro' ? 'Dinheiro' :
               tipo === 'cartao_debito' ? 'Cartão de Débito' :
               tipo === 'cartao_credito' ? 'Cartão de Crédito' : 'PIX'}
            </button>
          ))}
        </div>
        
        {formaPagamento.tipo === 'dinheiro' && (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formaPagamento.necessitaTroco}
                onChange={(e) => setFormaPagamento({
                  ...formaPagamento, 
                  necessitaTroco: e.target.checked
                })}
                className="mr-2"
              />
              Preciso de troco
            </label>
            {formaPagamento.necessitaTroco && (
              <input
                type="number"
                value={formaPagamento.valorTroco}
                onChange={(e) => setFormaPagamento({
                  ...formaPagamento, 
                  valorTroco: parseFloat(e.target.value) || 0
                })}
                placeholder="Valor para troco"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            )}
          </div>
        )}
      </div>

      {/* Campo de Observações do Pedido */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações do Pedido (opcional)
        </label>
        <textarea
          value={observacoesPedido}
          onChange={(e) => setObservacoesPedido(e.target.value)}
          placeholder="Ex: Entregar no portão dos fundos, tocar campainha..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Observações gerais sobre a entrega ou atendimento
        </p>
      </div>
      
      <div className="flex space-x-4 mt-6">
        <button onClick={onBack} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">
          Voltar
        </button>
        <button 
          onClick={onFinalizar}
          disabled={loading}
          className="flex-1 bg-gold-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Finalizando...' : 'Finalizar Pedido'}
        </button>
      </div>
    </div>
  );
};

const ConfirmacaoStep = ({ pedido, onNovopedido }) => {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-green-50 p-8 rounded-lg">
        <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h2>
        
        {pedido && (
          <div className="bg-white p-4 rounded-lg mb-4 border-2 border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Número do Pedido
            </h3>
            <div className="text-3xl font-bold text-green-600">
              #{String(pedido.numero).padStart(3, '0')}
            </div>
          </div>
        )}
        
        <p className="text-gray-600 mb-6">
          Seu pedido foi recebido e está sendo preparado. 
          Você receberá atualizações sobre o status do seu pedido.
        </p>
        <button
          onClick={onNovopedido}
          className="bg-gold-600 text-white px-6 py-2 rounded-lg hover:bg-gold-700"
        >
          Fazer Novo Pedido
        </button>
      </div>
    </div>
  );
};

// Modal para personalização de pizza
const PizzaPersonalizacaoModal = ({ pizza, cardapio, onConfirmar, onCancelar }) => {
  const [saboresSelecionados, setSaboresSelecionados] = useState([]);
  const [bordaSelecionada, setBordaSelecionada] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  const [bebidasSelecionadas, setBebidasSelecionadas] = useState([]);

  // Filtrar sabores baseado na nova estrutura configuracoesPizza
  const sabores = cardapio.filter(item => {
    if (item.categoria !== 'sabor') return false;
    
    // NOVA LÓGICA: Verificar se o sabor está configurado para esta pizza
    if (item.configuracoesPizza && item.configuracoesPizza.length > 0) {
      const configuracao = item.configuracoesPizza.find(config => 
        config.pizza && config.pizza._id === pizza._id
      );
      return configuracao && configuracao.permitido;
    }
    
    // Se não tem configuracoesPizza definido, não mostrar o sabor
    return false;
  });
  const bordas = cardapio.filter(item => item.categoria === 'borda');
  const bebidas = cardapio.filter(item => item.categoria === 'bebida');

  // Função para determinar o texto da divisão da pizza
  const obterDivisaoPizza = (quantidadeSabores) => {
    switch(quantidadeSabores) {
      case 0:
        return "Nenhum sabor selecionado";
      case 1:
        return "Pizza Inteira";
      case 2:
        return "Meia a Meia (1/2 + 1/2)";
      case 3:
        return "Três Sabores (1/3 + 1/3 + 1/3)";
      case 4:
        return "Quatro Sabores (1/4 + 1/4 + 1/4 + 1/4)";
      default:
        return `${quantidadeSabores} Sabores (1/${quantidadeSabores} cada)`;
    }
  };

  const calcularPrecoTotal = () => {
    let precoBase = pizza.preco * quantidade;
    
    // Calcular valor dos sabores baseado na divisão da pizza
    const maxSabores = pizza.quantidadeSabores || 4; // Usar propriedade da pizza
    const saboresSelecionadosCount = saboresSelecionados.length;
    
    const valorSabores = saboresSelecionados.reduce((acc, sabor) => {
      if (saboresSelecionadosCount > 0) {
        // NOVA LÓGICA: Buscar valor específico da configuração da pizza
        let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
        
        if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
          const configuracao = sabor.configuracoesPizza.find(config => 
            config.pizza && config.pizza._id === pizza._id
          );
          if (configuracao && configuracao.permitido) {
            valorEspecialSabor = configuracao.valorEspecial;
          }
        }
        
        // Cada sabor ocupa uma fração da pizza (ex: 2 sabores = 1/2 cada)
        // O valor especial é multiplicado por: (fração da pizza × 4 divisões totais)
        const fracaoPizza = 1 / saboresSelecionadosCount;
        const valorPorSabor = valorEspecialSabor * fracaoPizza * maxSabores;
        return acc + (valorPorSabor * quantidade);
      }
      return acc;
    }, 0);
    
    // Adicionar valor da borda
    const valorBorda = bordaSelecionada ? 
      (bordaSelecionada.preco + bordaSelecionada.valorEspecial) * quantidade : 0;
    
    // Adicionar valor das bebidas (apenas valor premium)
    const valorBebidas = bebidasSelecionadas.reduce((acc, bebida) => {
      return acc + ((bebida.valorEspecial || 0) * bebida.quantidade * quantidade);
    }, 0);
    
    return precoBase + valorSabores + valorBorda + valorBebidas;
  };

  const adicionarSabor = (sabor) => {
    const maxSabores = pizza.quantidadeSabores || 4;
    if (saboresSelecionados.length < maxSabores && !saboresSelecionados.find(s => s._id === sabor._id)) {
      setSaboresSelecionados([...saboresSelecionados, sabor]);
    }
  };

  const removerSabor = (saborId) => {
    setSaboresSelecionados(saboresSelecionados.filter(s => s._id !== saborId));
  };

  const adicionarBebida = (bebida) => {
    const bebidaExistente = bebidasSelecionadas.find(b => b._id === bebida._id);
    if (bebidaExistente) {
      setBebidasSelecionadas(bebidasSelecionadas.map(b => 
        b._id === bebida._id ? { ...b, quantidade: b.quantidade + 1 } : b
      ));
    } else {
      setBebidasSelecionadas([...bebidasSelecionadas, { ...bebida, quantidade: 1 }]);
    }
  };

  const removerBebida = (bebidaId) => {
    setBebidasSelecionadas(bebidasSelecionadas.filter(b => b._id !== bebidaId));
  };

  const alterarQuantidadeBebida = (bebidaId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerBebida(bebidaId);
    } else {
      setBebidasSelecionadas(bebidasSelecionadas.map(b => 
        b._id === bebidaId ? { ...b, quantidade: novaQuantidade } : b
      ));
    }
  };

  const confirmarPizza = () => {
    if (saboresSelecionados.length === 0) {
      alert('Selecione pelo menos um sabor!');
      return;
    }

    if (!bordaSelecionada) {
      alert('Selecione uma borda!');
      return;
    }

    const pizzaPersonalizada = {
      item: pizza,
      quantidade,
      sabores: saboresSelecionados,
      borda: bordaSelecionada,
      bebidas: bebidasSelecionadas,
      observacoes,
      precoTotal: calcularPrecoTotal(),
      id: Date.now() // ID único para o carrinho
    };

    onConfirmar(pizzaPersonalizada);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="flex justify-between items-center p-6 border-b bg-white rounded-t-md">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Personalizar {pizza.nome}</h3>
            <p className="text-gray-600">{pizza.descricao}</p>
          </div>
          <button
            onClick={onCancelar}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Conteúdo com layout fixo */}
        <div className="flex-1 flex overflow-hidden">
          {/* Área principal esquerda com sabores, bordas, bebidas e observações */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Sabores */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Escolha os Sabores {saboresSelecionados.length > 0 && `(${saboresSelecionados.length}/${pizza.quantidadeSabores || 4})`}
                {saboresSelecionados.length > 0 && (
                  <span className="ml-3 text-sm font-normal text-gray-600">
                    - {obterDivisaoPizza(saboresSelecionados.length)}
                  </span>
                )}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {sabores.map(sabor => {
                  const jaSelecionado = saboresSelecionados.find(s => s._id === sabor._id);
                  const maxSabores = pizza.quantidadeSabores || 4;
                  const atingiuLimite = saboresSelecionados.length >= maxSabores && !jaSelecionado;
                  
                  return (
                    <div
                      key={sabor._id}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        jaSelecionado
                          ? 'border-gold-500 bg-gold-50 cursor-pointer'
                          : atingiuLimite
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-gold-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (jaSelecionado) {
                          removerSabor(sabor._id);
                        } else if (!atingiuLimite) {
                          adicionarSabor(sabor);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{sabor.nome}</h5>
                          <p className="text-sm text-gray-500">{sabor.descricao}</p>
                        </div>
                        <div className="ml-2">
                          {(() => {
                            // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                            let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                            
                            if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                              const configuracao = sabor.configuracoesPizza.find(config => 
                                config.pizza && config.pizza._id === pizza._id
                              );
                              if (configuracao && configuracao.permitido) {
                                valorEspecialSabor = configuracao.valorEspecial;
                              }
                            }
                            
                            return valorEspecialSabor > 0 ? (
                              <span className="text-sm text-purple-600">
                                +R$ {valorEspecialSabor.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm text-green-600">Incluso</span>
                            );
                          })()}
                        </div>
                      </div>
                      {jaSelecionado && (
                        <div className="mt-2">
                          <Check className="h-4 w-4 text-gold-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bordas */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Escolha a Borda</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bordas.map(borda => {
                  const jaSelecionada = bordaSelecionada?._id === borda._id;
                  return (
                    <div
                      key={borda._id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        jaSelecionada
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300 bg-white'
                      }`}
                      onClick={() => setBordaSelecionada(jaSelecionada ? null : borda)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">{borda.nome}</h5>
                          <p className="text-xs text-gray-500">{borda.descricao}</p>
                        </div>
                        <div className="ml-2">
                          {(borda.preco + borda.valorEspecial) > 0 ? (
                            <span className="text-xs text-amber-600">
                              +R$ {(borda.preco + borda.valorEspecial).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">Grátis</span>
                          )}
                        </div>
                      </div>
                      {jaSelecionada && (
                        <div className="mt-2">
                          <Check className="h-4 w-4 text-amber-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bebidas */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Escolha sua Bebida <span className="text-red-500">*</span>
              </h4>
              
              <div className="space-y-3">
                {bebidas.map(bebida => {
                  const bebidaSelecionada = bebidasSelecionadas.find(b => b._id === bebida._id);
                  const quantidade = bebidaSelecionada ? bebidaSelecionada.quantidade : 0;
                  
                  return (
                    <div
                      key={bebida._id}
                      className={`p-3 border rounded-lg transition-colors ${
                        quantidade > 0 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">{bebida.nome}</h5>
                          <p className="text-xs text-gray-500">{bebida.descricao}</p>
                          <div className="mt-1">
                            {bebida.valorEspecial > 0 ? (
                              <span className="text-xs text-blue-600">
                                +R$ {bebida.valorEspecial.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-green-600">
                                Grátis
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Contador de quantidade */}
                        <div className="ml-2 flex flex-col items-center space-y-1">
                          {quantidade > 0 ? (
                            <>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alterarQuantidadeBebida(bebida._id, quantidade - 1);
                                  }}
                                  className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-sm font-medium w-6 text-center">{quantidade}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alterarQuantidadeBebida(bebida._id, quantidade + 1);
                                  }}
                                  className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => adicionarBebida(bebida)}
                              className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações (opcional)</h4>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Alguma observação especial para sua pizza?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                rows="3"
              />
            </div>
          </div>

          {/* Sidebar direita com resumo */}
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h4>
            
            {/* Quantidade */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-bold text-lg">{quantidade}</span>
                <button
                  onClick={() => setQuantidade(quantidade + 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sabores Selecionados */}
            {saboresSelecionados.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Sabores Selecionados:</h5>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <ul className="text-sm text-gray-600 space-y-1">
                    {saboresSelecionados.map(sabor => {
                      const saboresSelecionadosCount = saboresSelecionados.length;
                      const maxSabores = pizza.quantidadeSabores || 4;
                      const fracaoPizza = 1 / saboresSelecionadosCount;
                      // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                      let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                      
                      if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                        const configuracao = sabor.configuracoesPizza.find(config => 
                          config.pizza && config.pizza._id === pizza._id
                        );
                        if (configuracao && configuracao.permitido) {
                          valorEspecialSabor = configuracao.valorEspecial;
                        }
                      }
                      
                      const valorPorSabor = valorEspecialSabor * fracaoPizza * maxSabores;
                      const valorTotal = valorPorSabor * quantidade;
                      
                      return (
                        <li key={sabor._id} className="flex justify-between items-center">
                          <span>• {sabor.nome} ({Math.round(fracaoPizza * 100)}%)</span>
                          {valorTotal > 0 && (
                            <span className="text-gold-600 font-medium text-xs">
                              +R$ {valorTotal.toFixed(2)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Borda Selecionada */}
            {bordaSelecionada && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Borda:</h5>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>• {bordaSelecionada.nome}</span>
                    {((bordaSelecionada.preco + bordaSelecionada.valorEspecial) * quantidade) > 0 && (
                      <span className="text-amber-600 font-medium text-xs">
                        +R$ {((bordaSelecionada.preco + bordaSelecionada.valorEspecial) * quantidade).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bebidas Selecionadas */}
            {bebidasSelecionadas.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Bebidas:</h5>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <ul className="text-sm text-gray-600 space-y-1">
                    {bebidasSelecionadas.map(bebida => (
                      <li key={bebida._id} className="flex justify-between items-center">
                        <span>• {bebida.nome} (x{bebida.quantidade})</span>
                        <span className="text-blue-600 font-medium text-xs">
                          {(bebida.valorEspecial * bebida.quantidade * quantidade) > 0 ? 
                            `+R$ ${(bebida.valorEspecial * bebida.quantidade * quantidade).toFixed(2)}` : 
                            'Incluso'
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Preço Total */}
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-gold-600">
                  R$ {calcularPrecoTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={confirmarPizza}
                className="w-full bg-gold-600 text-white py-3 px-4 rounded-lg hover:bg-gold-700 font-medium"
              >
                Adicionar ao Carrinho
              </button>
              <button
                onClick={onCancelar}
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para personalização de combo
const ComboPersonalizacaoModal = ({ combo, cardapio, onConfirmar, onCancelar }) => {
  const [itensConfigurados, setItensConfigurados] = useState([]);
  const [itemPersonalizando, setItemPersonalizando] = useState(null);
  const [tipoPersonalizando, setTipoPersonalizando] = useState(null); // 'pizza' ou 'bebida'

  // Função para filtrar sabores baseado em uma pizza específica
  const filtrarSaboresPorPizza = (pizzaItem) => {
    return cardapio.filter(item => {
      if (item.categoria !== 'sabor') return false;
      
      if (!pizzaItem) return false;
      
      // NOVA LÓGICA: Verificar se o sabor está configurado para esta pizza específica
      if (item.configuracoesPizza !== undefined) {
        if (item.configuracoesPizza.length > 0) {
          const configuracao = item.configuracoesPizza.find(config => 
            config.pizza && config.pizza._id === pizzaItem._id
          );
          return configuracao && configuracao.permitido;
        } else {
          return false;
        }
      }
      
      // FALLBACK: Buscar configurações específicas do combo para esta pizza (sistema antigo)
      const configCombo = combo.itensCombo?.find(comboItem => 
        comboItem.item && comboItem.item._id === pizzaItem._id
      );
      
      if (configCombo && configCombo.configuracaoPizza) {
        // Usar configurações específicas do combo (sistema antigo)
        if (item.tipoSabor === 'doce' && !configCombo.configuracaoPizza.permiteDoce) return false;
        if (item.tipoSabor === 'salgado' && !configCombo.configuracaoPizza.permiteSalgado) return false;
        return true;
      }
      // Se não tem configuracoesPizza definido, não mostrar o sabor
      return false;
    });
  };

  // Filtrar sabores baseado na pizza sendo personalizada
  const sabores = itemPersonalizando && itemPersonalizando.item 
    ? filtrarSaboresPorPizza(itemPersonalizando.item)
    : [];
  const bordas = cardapio.filter(item => item.categoria === 'borda');
  const bebidas = cardapio.filter(item => item.categoria === 'bebida');
  
  
  // Criar lista de itens do combo para configurar
  const itensDoCombo = [];
  
  if (combo.itensCombo) {
    combo.itensCombo.forEach((config, configIndex) => {
      if (config.tipo === 'pizza') {
        // Para pizzas, usar o item específico
        const itemData = config.item?._id ? 
          cardapio.find(item => item._id.toString() === config.item._id.toString()) : 
          cardapio.find(item => item._id.toString() === config.item.toString());
        
        if (itemData) {
          for (let i = 0; i < config.quantidade; i++) {
            itensDoCombo.push({
              id: `${configIndex}-${i}`,
              tipo: config.tipo,
              item: itemData,
              configurado: false,
              configuracao: null
            });
          }
        }
      } else if (config.tipo === 'bebida') {
        // Para bebidas, usar o item específico referenciado
        const itemData = config.item?._id ? 
          cardapio.find(item => item._id.toString() === config.item._id.toString()) : 
          cardapio.find(item => item._id.toString() === config.item.toString());
        
        if (itemData) {
          for (let i = 0; i < config.quantidade; i++) {
            itensDoCombo.push({
              id: `${configIndex}-${i}`,
              tipo: config.tipo,
              tamanhoBebida: itemData.tamanho, // Usar tamanho do item referenciado
              item: {
                nome: `Bebida ${itemData.tamanho}`,
                descricao: `Escolha uma bebida de ${itemData.tamanho}`
              },
              configurado: false,
              configuracao: null
            });
          }
        } else {
          // Fallback caso não encontre o item
          for (let i = 0; i < config.quantidade; i++) {
            itensDoCombo.push({
              id: `${configIndex}-${i}`,
              tipo: config.tipo,
              tamanhoBebida: '1.5L', // Valor padrão
              item: {
                nome: `Bebida 1.5L`,
                descricao: `Escolha uma bebida de 1.5L`
              },
              configurado: false,
              configuracao: null
            });
          }
        }
      }
    });
  }
  
  // Ordenar itens do combo para pizza ficar primeiro
  const itensDoComboOrdenados = itensDoCombo.sort((a, b) => {
    if (a.tipo === 'pizza' && b.tipo === 'bebida') return -1;
    if (a.tipo === 'bebida' && b.tipo === 'pizza') return 1;
    return 0;
  });

  const calcularPrecoTotal = () => {
    let precoBase = combo.preco;
    
    // Adicionar valores especiais dos itens configurados
    const valorEspeciais = itensConfigurados.reduce((acc, item) => {
      if (item.tipo === 'pizza' && item.configuracao) {
        // Verificar se este item do combo cobra especiais
        const configCombo = combo.itensCombo?.find(comboItem => 
          comboItem.item && comboItem.item._id === item.item._id
        );
        const cobraEspecial = configCombo?.configuracaoPizza?.cobraEspecial !== false;
        
        const valorSabores = cobraEspecial ? item.configuracao.sabores.reduce((accSabores, sabor) => {
          // NOVA LÓGICA: Buscar valor específico da configuração da pizza
          let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
          
          if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
            const configuracao = sabor.configuracoesPizza.find(config => 
              config.pizza && config.pizza._id === item.item._id
            );
            if (configuracao && configuracao.permitido) {
              valorEspecialSabor = configuracao.valorEspecial;
            }
          }
          
          return accSabores + valorEspecialSabor;
        }, 0) : 0;
        
        const valorBorda = item.configuracao.borda ? item.configuracao.borda.valorEspecial : 0;
        
        return acc + valorSabores + valorBorda;
      } else if (item.tipo === 'bebida' && item.configuracao) {
        return acc + item.configuracao.valorEspecial;
      }
      return acc;
    }, 0);
    
    return precoBase + valorEspeciais;
  };

  const iniciarPersonalizacaoItem = (item) => {
    // Buscar configuração existente se o item já foi configurado
    const existingConfig = itensConfigurados.find(i => i.id === item.id);
    
    // Criar item com configuração existente mesclada
    const itemWithConfig = {
      ...item,
      configuracao: existingConfig?.configuracao || null
    };
    
    setItemPersonalizando(itemWithConfig);
    setTipoPersonalizando(item.tipo);
  };

  const confirmarConfiguracaoItem = (configuracao) => {
    if (itemPersonalizando) {
      const itemAtualizado = {
        ...itemPersonalizando,
        configurado: true,
        configuracao
      };
      
      setItensConfigurados(prev => {
        const existing = prev.find(i => i.id === itemPersonalizando.id);
        if (existing) {
          return prev.map(i => i.id === itemPersonalizando.id ? itemAtualizado : i);
        }
        return [...prev, itemAtualizado];
      });
      
      setItemPersonalizando(null);
      setTipoPersonalizando(null);
    }
  };

  const confirmarCombo = () => {
    const todosConfigurados = itensDoComboOrdenados.every(item => 
      itensConfigurados.some(configurado => configurado.id === item.id)
    );
    
    if (todosConfigurados) {
      // Criar combo com estrutura padrão do carrinho
      const comboPersonalizado = {
        item: combo,
        quantidade: 1,
        precoTotal: calcularPrecoTotal(),
        itensConfigurados,
        tipo: 'combo'
      };
      
      onConfirmar(comboPersonalizado);
    }
  };

  const renderListaItens = () => {
    return (
      <div className="space-y-3">
        {itensDoComboOrdenados.map((item, index) => {
          const itemConfigurado = itensConfigurados.find(i => i.id === item.id);
          const numeroItem = index + 1;
          
          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                itemConfigurado 
                  ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
              }`}
              onClick={() => iniciarPersonalizacaoItem(item)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
                      {numeroItem}
                    </span>
                    <div>
                      <h5 className="font-medium text-gray-900">{item.item.nome}</h5>
                      <p className="text-sm text-gray-500">{item.item.descricao}</p>
                      
                      {itemConfigurado && (
                        <div className="mt-1 space-y-1">
                          {/* Mostrar sabores para pizza */}
                          {item.tipo === 'pizza' && itemConfigurado.configuracao && itemConfigurado.configuracao.sabores && (
                            <p className="text-sm text-green-600">
                              ✓ Sabores: {itemConfigurado.configuracao.sabores.map((s, index) => {
                                // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                                let valorEspecialSabor = s.valorEspecial; // Fallback para compatibilidade
                                
                                if (s.configuracoesPizza && s.configuracoesPizza.length > 0) {
                                  const configuracao = s.configuracoesPizza.find(config => 
                                    config.pizza && config.pizza._id === item.item._id
                                  );
                                  if (configuracao && configuracao.permitido) {
                                    valorEspecialSabor = configuracao.valorEspecial;
                                  }
                                }
                                
                                return (
                                  <span key={s._id}>
                                    {s.nome}
                                    {valorEspecialSabor > 0 && (
                                      <span className="text-blue-600 ml-1">
                                        (+R$ {valorEspecialSabor.toFixed(2)})
                                      </span>
                                    )}
                                    {index < itemConfigurado.configuracao.sabores.length - 1 && ', '}
                                  </span>
                                );
                              })}
                            </p>
                          )}
                          
                          {/* Mostrar borda para pizza */}
                          {item.tipo === 'pizza' && itemConfigurado.configuracao && itemConfigurado.configuracao.borda && (
                            <p className="text-sm text-green-600">
                              ✓ Borda: {itemConfigurado.configuracao.borda.nome}
                              {itemConfigurado.configuracao.borda.valorEspecial > 0 && (
                                <span className="text-blue-600 ml-2">
                                  (+R$ {itemConfigurado.configuracao.borda.valorEspecial.toFixed(2)})
                                </span>
                              )}
                            </p>
                          )}
                          
                          {/* Mostrar bebida selecionada */}
                          {item.tipo === 'bebida' && itemConfigurado.configuracao && (
                            <p className="text-sm text-green-600">
                              ✓ Bebida: {itemConfigurado.configuracao.nome}
                              {itemConfigurado.configuracao.valorEspecial > 0 && (
                                <span className="text-blue-600 ml-2">
                                  (+R$ {itemConfigurado.configuracao.valorEspecial.toFixed(2)})
                                </span>
                              )}
                            </p>
                          )}
                          
                          {/* Mostrar observações se houver */}
                          {item.tipo === 'pizza' && itemConfigurado.configuracao && itemConfigurado.configuracao.observacoes && (
                            <p className="text-sm text-gray-600">
                              📝 Obs: {itemConfigurado.configuracao.observacoes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center ${itemConfigurado ? 'text-green-600' : 'text-blue-600'}`}>
                    {itemConfigurado ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      item.tipo === 'pizza' ? (
                        <Pizza className="h-5 w-5" />
                      ) : (
                        <CupSoda className="h-5 w-5" />
                      )
                    )}
                    <span className="ml-1 font-medium">
                      {itemConfigurado ? 'Configurado' : (item.tipo === 'pizza' ? 'Personalizar' : 'Selecionar')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSelecaoBebida = () => {
    const bebidasFiltradas = bebidas.filter(bebida => 
      bebida.tamanho === itemPersonalizando.tamanhoBebida
    );
    
    // Adicionar bebidas de upgrade disponíveis
    const bebidasUpgrade = [];
    if (combo.upgradesDisponiveis) {
      Object.keys(combo.upgradesDisponiveis).forEach(bebidaId => {
        const upgrade = combo.upgradesDisponiveis[bebidaId];
        if (upgrade.permitir) {
          const bebida = cardapio.find(item => item._id === bebidaId);
          if (bebida && bebida.categoria === 'bebida') {
            bebidasUpgrade.push({
              ...bebida,
              valorEspecial: upgrade.valor // Usar valor do upgrade ao invés do valor original
            });
          }
        }
      });
    }
    
    // Combinar bebidas filtradas do tamanho + bebidas de upgrade
    const todasBebidas = [...bebidasFiltradas, ...bebidasUpgrade];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => {
              setItemPersonalizando(null);
              setTipoPersonalizando(null);
            }}
            className="mr-3 text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </button>
          <h4 className="text-lg font-semibold text-gray-900">
            Escolha sua {itemPersonalizando.item.nome}
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todasBebidas.map(bebida => (
            <div
              key={bebida._id}
              className="p-4 border-2 rounded-lg cursor-pointer transition-colors border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50"
              onClick={() => confirmarConfiguracaoItem(bebida)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{bebida.nome}</h5>
                  <p className="text-sm text-gray-500 mt-1">{bebida.descricao}</p>
                  <div className="mt-2">
                    {bebida.valorEspecial > 0 ? (
                      <span className="text-sm text-blue-600">
                        +R$ {bebida.valorEspecial.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-green-600">Incluso</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!combo) return null;

  // Se estiver personalizando um item
  if (itemPersonalizando) {
    if (tipoPersonalizando === 'pizza') {
      return (
        <PizzaPersonalizacaoCombo
          pizza={itemPersonalizando.item}
          sabores={sabores}
          bordas={bordas}
          configuracaoExistente={itemPersonalizando.configuracao}
          configCombo={combo.itensCombo?.find(comboItem => 
            comboItem.item && comboItem.item._id === itemPersonalizando.item._id
          )}
          onConfirmar={confirmarConfiguracaoItem}
          onCancelar={() => {
            setItemPersonalizando(null);
            setTipoPersonalizando(null);
          }}
        />
      );
    } else if (tipoPersonalizando === 'bebida') {
      return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-8 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            {renderSelecaoBebida()}
          </div>
        </div>
      );
    }
  }

  // Modal principal do combo
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{combo.nome}</h3>
            <p className="text-gray-600">{combo.descricao}</p>
          </div>
          <button 
            onClick={onCancelar}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Configure os itens do combo</h4>
          {renderListaItens()}
          
          <div className="mt-6 flex space-x-4">
            <button 
              onClick={onCancelar}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmarCombo}
              disabled={itensDoComboOrdenados.length !== itensConfigurados.length}
              className={`flex-1 py-3 rounded-lg font-medium ${
                itensDoComboOrdenados.length === itensConfigurados.length
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Adicionar Combo - R$ {calcularPrecoTotal().toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para personalização de pizza dentro do combo
const PizzaPersonalizacaoCombo = ({ pizza, sabores, bordas, configuracaoExistente, configCombo, onConfirmar, onCancelar }) => {
  const [saboresSelecionados, setSaboresSelecionados] = useState(() => {
    if (configuracaoExistente?.sabores && configuracaoExistente.sabores.length > 0) {
      // Se já existe configuração, usar ela
      return configuracaoExistente.sabores;
    } else {
      // Inicializar com array de nulls baseado na quantidade inicial
      return [null];
    }
  });
  const [bordaSelecionada, setBordaSelecionada] = useState(
    configuracaoExistente?.borda || null
  );
  const [observacoes, setObservacoes] = useState(
    configuracaoExistente?.observacoes || ''
  );
  const [showIngredientes, setShowIngredientes] = useState(false);
  const [saborIngredientes, setSaborIngredientes] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [quantidadeSabores, setQuantidadeSabores] = useState(1);
  const [showModalSabor, setShowModalSabor] = useState(false);
  const [fracaoSelecionada, setFracaoSelecionada] = useState(null);

  const obterDivisaoPizza = (quantidadeSabores) => {
    switch(quantidadeSabores) {
      case 0:
        return "Sem sabores selecionados";
      case 1:
        return "Pizza Inteira";
      case 2:
        return "Meia a Meia";
      case 3:
        return "Três Sabores";
      case 4:
        return "Quatro Sabores";
      default:
        return `${quantidadeSabores} Sabores`;
    }
  };

  const adicionarSaborFracao = (sabor, fracaoIndex) => {
    const novosSabores = [...saboresSelecionados];
    novosSabores[fracaoIndex] = sabor;
    setSaboresSelecionados(novosSabores);
    setShowModalSabor(false);
    setFracaoSelecionada(null);
  };

  const removerSaborFracao = (fracaoIndex) => {
    const novosSabores = [...saboresSelecionados];
    novosSabores[fracaoIndex] = null;
    setSaboresSelecionados(novosSabores);
  };

  const abrirModalSabor = (fracaoIndex) => {
    setFracaoSelecionada(fracaoIndex);
    setShowModalSabor(true);
  };

  const calcularValorEspecialProporcional = (valorEspecial, quantidadeSabores) => {
    return valorEspecial / quantidadeSabores;
  };

  const alterarQuantidadeSabores = (novaQuantidade) => {
    setQuantidadeSabores(novaQuantidade);
    // Limpar sabores que excedem a nova quantidade
    const novosSabores = Array(novaQuantidade).fill(null);
    // Manter os sabores existentes que cabem na nova quantidade
    for (let i = 0; i < Math.min(saboresSelecionados.length, novaQuantidade); i++) {
      novosSabores[i] = saboresSelecionados[i];
    }
    setSaboresSelecionados(novosSabores);
  };

  const confirmarPersonalizacao = () => {
    // Filtrar apenas sabores que foram selecionados (não null)
    const saboresConfirmados = saboresSelecionados.filter(sabor => sabor !== null);
    
    onConfirmar({
      sabores: saboresConfirmados,
      borda: bordaSelecionada,
      observacoes
    });
  };

  const abrirIngredientes = (sabor) => {
    setSaborIngredientes(sabor);
    setShowIngredientes(true);
  };

  // Função para renderizar a pizza visual
  const renderPizzaVisual = () => {
    const raio = 80;
    const centro = 140;
    const maxSabores = pizza.quantidadeSabores || 4;

    const fatias = [];
    
    // Para 1 sabor, usar círculo completo em vez de path
    if (quantidadeSabores === 1) {
      const sabor = saboresSelecionados[0];
      fatias.push(
        <g key={0}>
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill={sabor ? `hsl(0, 70%, 80%)` : '#f3f4f6'}
            stroke="#8B4513"
            strokeWidth="2"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => abrirModalSabor(0)}
          />
          
          {/* Nome do sabor se selecionado */}
          {sabor && (
            <text
              x={centro}
              y={centro + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#333"
              className="pointer-events-none"
            >
              {sabor.nome.length > 12 ? sabor.nome.substring(0, 12) + '...' : sabor.nome}
            </text>
          )}
        </g>
      );
    } else {
      // Para múltiplos sabores, usar paths como antes
      for (let i = 0; i < quantidadeSabores; i++) {
        const sabor = saboresSelecionados[i];
        const anguloInicio = (i * 360) / quantidadeSabores;
        const anguloFim = ((i + 1) * 360) / quantidadeSabores;
        
        // Criar path SVG para cada fatia
        const anguloInicioRad = (anguloInicio * Math.PI) / 180;
        const anguloFimRad = (anguloFim * Math.PI) / 180;
        
        const x1 = centro + raio * Math.cos(anguloInicioRad);
        const y1 = centro + raio * Math.sin(anguloInicioRad);
        const x2 = centro + raio * Math.cos(anguloFimRad);
        const y2 = centro + raio * Math.sin(anguloFimRad);
        
        const largeArcFlag = anguloFim - anguloInicio > 180 ? 1 : 0;
        
        const pathData = [
          `M ${centro} ${centro}`,
          `L ${x1} ${y1}`,
          `A ${raio} ${raio} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');

        fatias.push(
          <g key={i}>
            <path
              d={pathData}
              fill={sabor ? `hsl(${(i * 360) / quantidadeSabores}, 70%, 80%)` : '#f3f4f6'}
              stroke="#8B4513"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => abrirModalSabor(i)}
            />
            
            {/* Nome do sabor se selecionado */}
            {sabor && (
              <text
                x={centro + (raio * 0.4) * Math.cos((anguloInicioRad + anguloFimRad) / 2)}
                y={centro + (raio * 0.4) * Math.sin((anguloInicioRad + anguloFimRad) / 2)}
                textAnchor="middle"
                fontSize="8"
                fill="#333"
                className="pointer-events-none"
              >
                {sabor.nome.length > 8 ? sabor.nome.substring(0, 8) + '...' : sabor.nome}
              </text>
            )}
          </g>
        );
      }
    }

    return (
      <div className="relative w-80 h-80 mx-auto">
        <svg viewBox="0 0 280 280" className="w-full h-full">
          {/* Borda da pizza */}
          <circle
            cx={centro}
            cy={centro}
            r={raio + 4}
            fill="#8B4513"
          />
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="#DEB887"
          />
          {/* Fatias */}
          {fatias}
        </svg>
        
        {/* Indicador de quantidade - CLICÁVEL */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full px-3 py-1 shadow-lg border">
          <div className="flex space-x-1">
            {[1, 2, 3, 4].slice(0, maxSabores).map(num => (
              <div
                key={num}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ${
                  num === quantidadeSabores
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                }`}
                onClick={() => alterarQuantidadeSabores(num)}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center text-sm text-gray-600">
          {obterDivisaoPizza(quantidadeSabores)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Personalizar {pizza.nome}</h3>
            <p className="text-gray-600">{pizza.descricao}</p>
          </div>
          <button 
            onClick={onCancelar}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pizza Visual */}
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Quantidade de sabores
              </h4>
              {renderPizzaVisual()}
            </div>
          </div>

          {/* Resumo dos sabores selecionados */}
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Sabores Selecionados:</h4>
              {saboresSelecionados.some(s => s) ? (
                <div className="space-y-2">
                  {saboresSelecionados.map((sabor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {quantidadeSabores === 1 ? '1' : `1/${quantidadeSabores}`}
                        </span>
                        <div>
                          {sabor ? (
                            <>
                              {/* Nome do sabor com indicador especial na mesma linha */}
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{sabor.nome}</p>
                                {(() => {
                                  // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                                  let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                                  
                                  if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                                    const configuracao = sabor.configuracoesPizza.find(config => 
                                      config.pizza && config.pizza._id === pizza._id
                                    );
                                    if (configuracao && configuracao.permitido) {
                                      valorEspecialSabor = configuracao.valorEspecial;
                                    }
                                  }
                                  
                                  // Só exibir se for especial (não exibir "Tradicional")
                                  return valorEspecialSabor > 0 && (
                                    configCombo?.configuracaoPizza?.cobraEspecial === false ? (
                                      <span className="text-xs font-medium text-green-600">
                                        ⭐ Especial Incluso
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-orange-600">
                                        ⭐ Especial <span className="text-green-600">+R$ {calcularValorEspecialProporcional(valorEspecialSabor, quantidadeSabores).toFixed(2)}</span>
                                      </span>
                                    )
                                  );
                                })()}
                              </div>
                              
                              {/* Ingredientes do sabor */}
                              {sabor.ingredientes && sabor.ingredientes.length > 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {sabor.ingredientes.map(ing => ing.nome).join(', ')}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-500 italic">Clique na fatia para escolher sabor</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Botão X para remover sabor */}
                      {sabor && (
                        <button
                          onClick={() => removerSaborFracao(index)}
                          className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-sm font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum sabor selecionado</p>
              )}
            </div>
          </div>
        </div>

        {/* Seção separada para bordas e observações */}
        <div className="mt-8 space-y-6">

          {/* Bordas */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Escolha a Borda</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bordas.map(borda => {
                const jaSelecionada = bordaSelecionada?._id === borda._id;
                return (
                  <div
                    key={borda._id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      jaSelecionada
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                    onClick={() => setBordaSelecionada(jaSelecionada ? null : borda)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 text-sm">{borda.nome}</h5>
                        <p className="text-xs text-gray-500">{borda.descricao}</p>
                      </div>
                      <div className="ml-2">
                        {borda.valorEspecial > 0 ? (
                          <span className="text-xs text-amber-600">
                            +R$ {borda.valorEspecial.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Grátis</span>
                        )}
                      </div>
                    </div>
                    {jaSelecionada && (
                      <div className="mt-2">
                        <Check className="h-4 w-4 text-amber-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações (opcional)</h4>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Alguma observação especial para esta pizza?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              rows="3"
            />
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button 
            onClick={onCancelar}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium"
          >
            Cancelar
          </button>
          <button 
            onClick={confirmarPersonalizacao}
            disabled={!saboresSelecionados.some(sabor => sabor !== null)}
            className={`flex-1 py-3 rounded-lg font-medium ${
              saboresSelecionados.some(sabor => sabor !== null)
                ? 'bg-gold-600 text-white hover:bg-gold-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirmar Personalização
          </button>
        </div>
      </div>
      
      {/* Modal de Ingredientes */}
      {showIngredientes && saborIngredientes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Ingredientes</h3>
              <button
                onClick={() => setShowIngredientes(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{saborIngredientes.nome}</h4>
                <p className="text-sm text-gray-600">{saborIngredientes.descricao}</p>
              </div>
              
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Deseja remover algum ingrediente?
                </h5>
                <p className="text-xs text-gray-500 mb-3">
                  Selecione os ingredientes que você NÃO quer no seu produto
                </p>
                
                {/* Lista de ingredientes */}
                <div className="space-y-2">
                  {saborIngredientes.ingredientes && saborIngredientes.ingredientes.length > 0 ? (
                    saborIngredientes.ingredientes.map((ingrediente, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm text-gray-700">{ingrediente}</span>
                        <button className="text-red-600 hover:text-red-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm text-gray-700">Mussarela</span>
                        <button className="text-red-600 hover:text-red-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm text-gray-700">Molho de tomate</span>
                        <button className="text-red-600 hover:text-red-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm text-gray-700">Azeitona</span>
                        <button className="text-red-600 hover:text-red-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm text-gray-700">Oregano</span>
                        <button className="text-red-600 hover:text-red-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowIngredientes(false)}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Seleção de Sabor Individual */}
      {showModalSabor && fracaoSelecionada !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Escolha o sabor para a fração {quantidadeSabores === 1 ? 'inteira' : `${fracaoSelecionada + 1}/${quantidadeSabores}`}
              </h3>
              <button
                onClick={() => {
                  setShowModalSabor(false);
                  setFracaoSelecionada(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Procurar um sabor"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {sabores.filter(sabor => 
                  sabor.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                  sabor.descricao.toLowerCase().includes(termoBusca.toLowerCase())
                ).map(sabor => {
                  // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                  let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                  
                  if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                    const configuracao = sabor.configuracoesPizza.find(config => 
                      config.pizza && config.pizza._id === pizza._id
                    );
                    if (configuracao && configuracao.permitido) {
                      valorEspecialSabor = configuracao.valorEspecial;
                    }
                  }
                  
                  const valorProporcional = calcularValorEspecialProporcional(valorEspecialSabor, quantidadeSabores);
                  
                  return (
                    <div
                      key={sabor._id}
                      className="flex items-center p-4 border rounded-lg cursor-pointer transition-colors border-gray-200 hover:border-gold-300 hover:bg-gray-50"
                      onClick={() => adicionarSaborFracao(sabor, fracaoSelecionada)}
                    >
                      {/* Imagem do sabor */}
                      <div className="w-16 h-16 bg-amber-200 rounded-lg mr-4 flex items-center justify-center overflow-hidden">
                        {sabor.imagem ? (
                          <img 
                            src={sabor.imagem} 
                            alt={sabor.nome} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Pizza className="h-8 w-8 text-amber-600" />
                        )}
                      </div>
                      
                      {/* Informações do sabor */}
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{sabor.nome}</h5>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {sabor.ingredientes && sabor.ingredientes.length > 0 
                            ? (() => {
                                const ingredientesStr = sabor.ingredientes.map(ingrediente => {
                                  // Tratar diferentes tipos de dados
                                  if (typeof ingrediente === 'string') {
                                    return ingrediente.toLowerCase();
                                  } else if (ingrediente && ingrediente.nome) {
                                    return ingrediente.nome.toLowerCase();
                                  } else {
                                    return String(ingrediente).toLowerCase();
                                  }
                                }).join(', ');
                                return ingredientesStr.charAt(0).toUpperCase() + ingredientesStr.slice(1);
                              })()
                            : sabor.descricao
                          }
                        </p>
                        <div className="mt-2">
                          {(() => {
                            // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                            let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                            
                            if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                              const configuracao = sabor.configuracoesPizza.find(config => 
                                config.pizza && config.pizza._id === pizza._id
                              );
                              if (configuracao && configuracao.permitido) {
                                valorEspecialSabor = configuracao.valorEspecial;
                              }
                            }
                            
                            return valorEspecialSabor > 0 ? (
                              configCombo?.configuracaoPizza?.cobraEspecial === false ? (
                                <p className="text-xs font-medium text-green-600">
                                  ⭐ Sabor Especial <span className="ml-2">Incluso no Combo</span>
                                </p>
                              ) : (
                                <p className="text-xs font-medium text-orange-600">
                                  ⭐ Sabor Especial <span className="text-green-600 ml-2">+R$ {valorProporcional.toFixed(2)}</span>
                                </p>
                              )
                            ) : (
                              <p className="text-xs text-gray-500">Sabor Tradicional</p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PizzaPersonalizacaoInline = ({ 
  pizza, 
  saboresSelecionados,
  setSaboresSelecionados,
  bordaSelecionada,
  setBordaSelecionada,
  bebidasSelecionadas, 
  setBebidasSelecionadas,
  observacoes,
  setObservacoes,
  adicionarSabor,
  removerSabor,
  alterarQuantidadeBebida,
  adicionarBebida,
  cardapio
}) => {
  const [quantidade, setQuantidade] = useState(1);
  const bordas = cardapio.filter(item => item.categoria === 'borda');
  const bebidas = cardapio.filter(item => item.categoria === 'bebida');
  const sabores = cardapio.filter(item => {
    if (item.categoria !== 'sabor') return false;
    
    // NOVA LÓGICA: Verificar se o sabor está configurado para esta pizza específica
    if (item.configuracoesPizza && item.configuracoesPizza.length > 0) {
      const configuracao = item.configuracoesPizza.find(config => 
        config.pizza && config.pizza._id === pizza._id
      );
      return configuracao && configuracao.permitido;
    }
    
    // Se não tem configuracoesPizza definido, não mostrar o sabor
    return false;
  });

  const obterDivisaoPizza = (numeroSabores) => {
    switch (numeroSabores) {
      case 1: return "Pizza inteira";
      case 2: return "2 metades";
      case 3: return "3 fatias (⅓, ⅓, ⅓)";
      case 4: return "4 fatias (¼, ¼, ¼, ¼)";
      default: return `${numeroSabores} sabores`;
    }
  };

  return (
    <div className="w-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar esquerda com resumo */}
        <div className="w-80 border-r bg-white p-4 overflow-y-auto">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h4>
          
          {/* Sabores Selecionados */}
          {saboresSelecionados.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Sabores Selecionados:</h5>
              <div className="bg-gray-50 p-3 rounded-lg">
                <ul className="text-sm text-gray-600 space-y-1">
                  {saboresSelecionados.map(sabor => {
                    const saboresSelecionadosCount = saboresSelecionados.length;
                    const fracaoPizza = 1 / saboresSelecionadosCount;
                    
                    // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                    let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                    
                    if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                      const configuracao = sabor.configuracoesPizza.find(config => 
                        config.pizza && config.pizza._id === pizza._id
                      );
                      if (configuracao && configuracao.permitido) {
                        valorEspecialSabor = configuracao.valorEspecial;
                      }
                    }
                    
                    return (
                      <li key={sabor._id} className="flex justify-between items-center">
                        <span>• {sabor.nome} ({Math.round(fracaoPizza * 100)}%)</span>
                        {valorEspecialSabor > 0 && (
                          <span className="text-gold-600 font-medium text-xs">
                            +R$ {valorEspecialSabor.toFixed(2)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Borda Selecionada */}
          {bordaSelecionada && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Borda:</h5>
              <div className="bg-amber-50 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>• {bordaSelecionada.nome}</span>
                  {bordaSelecionada.valorEspecial > 0 && (
                    <span className="text-amber-600 font-medium text-xs">
                      +R$ {bordaSelecionada.valorEspecial.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          {observacoes && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Observações:</h5>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{observacoes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Área principal direita com sabores, bordas e observações */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Sabores */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Escolha os Sabores {saboresSelecionados.length > 0 && `(${saboresSelecionados.length}/${pizza.quantidadeSabores || 4})`}
              {saboresSelecionados.length > 0 && (
                <span className="ml-3 text-sm font-normal text-gray-600">
                  - {obterDivisaoPizza(saboresSelecionados.length)}
                </span>
              )}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {sabores.map(sabor => {
                const jaSelecionado = saboresSelecionados.find(s => s._id === sabor._id);
                const maxSabores = pizza.quantidadeSabores || 4;
                const limitingido = saboresSelecionados.length >= maxSabores && !jaSelecionado;
                
                // NOVA LÓGICA: Buscar valor específico da configuração da pizza
                let valorEspecialSabor = sabor.valorEspecial; // Fallback para compatibilidade
                
                if (sabor.configuracoesPizza && sabor.configuracoesPizza.length > 0) {
                  const configuracao = sabor.configuracoesPizza.find(config => 
                    config.pizza && config.pizza._id === pizza._id
                  );
                  if (configuracao && configuracao.permitido) {
                    valorEspecialSabor = configuracao.valorEspecial;
                  }
                }
                
                return (
                  <div
                    key={sabor._id}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      jaSelecionado
                        ? 'border-gold-500 bg-gold-50 cursor-pointer'
                        : limitingido
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-gold-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (jaSelecionado) {
                        removerSabor(sabor._id);
                      } else if (!limitingido) {
                        adicionarSabor(sabor);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{sabor.nome}</h5>
                        <p className="text-sm text-gray-500">{sabor.descricao}</p>
                      </div>
                      <div className="ml-2">
                        {valorEspecialSabor > 0 ? (
                          <span className="text-sm text-purple-600">
                            +R$ {valorEspecialSabor.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600">Incluso</span>
                        )}
                      </div>
                    </div>
                    {jaSelecionado && (
                      <div className="mt-2">
                        <Check className="h-4 w-4 text-gold-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bordas */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Escolha a Borda</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bordas.map(borda => {
                const jaSelecionada = bordaSelecionada?._id === borda._id;
                return (
                  <div
                    key={borda._id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      jaSelecionada
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                    onClick={() => setBordaSelecionada(jaSelecionada ? null : borda)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 text-sm">{borda.nome}</h5>
                        <p className="text-xs text-gray-500">{borda.descricao}</p>
                      </div>
                      <div className="ml-2">
                        {borda.valorEspecial > 0 ? (
                          <span className="text-xs text-amber-600">
                            +R$ {borda.valorEspecial.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Grátis</span>
                        )}
                      </div>
                    </div>
                    {jaSelecionada && (
                      <div className="mt-2">
                        <Check className="h-4 w-4 text-amber-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações (opcional)</h4>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Alguma observação especial para sua pizza?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              rows="3"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


// Modal do Carrinho
const CarrinhoModal = ({ carrinho, setCarrinho, calcularSubtotal, onFechar, onFinalizar }) => {
  const removerItem = (index) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };

  const alterarQuantidade = (index, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerItem(index);
      return;
    }
    
    setCarrinho(carrinho.map((item, i) => 
      i === index ? { ...item, quantidade: novaQuantidade } : item
    ));
  };

  const subtotal = calcularSubtotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Seu Carrinho</h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-96">
          {carrinho.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Carrinho vazio</h3>
              <p className="mt-1 text-gray-500">Adicione itens ao seu carrinho para continuar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {carrinho.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.item.nome}</h4>
                    <p className="text-sm text-gray-500">{item.item.descricao}</p>
                    {(item.configuracao || item.sabores || item.bebidas) && (
                      <div className="mt-2 text-sm text-gray-600">
                        {(item.configuracao?.sabores || item.sabores) && (
                          <p>Sabores: {(item.configuracao?.sabores || item.sabores).map(s => s.nome).join(', ')}</p>
                        )}
                        {(item.configuracao?.borda || item.borda) && (
                          <p>Borda: {(item.configuracao?.borda || item.borda).nome}</p>
                        )}
                        {item.bebidas && item.bebidas.length > 0 && (
                          <p>Bebidas: {item.bebidas.map(b => `${b.nome} (${b.quantidade}x)`).join(', ')}</p>
                        )}
                      </div>
                    )}
                    <p className="text-lg font-medium text-gold-600">
                      R$ {(item.precoTotal ? item.precoTotal : (item.item.preco * item.quantidade)).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => alterarQuantidade(index, item.quantidade - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(index, item.quantidade + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removerItem(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {carrinho.length > 0 && (
          <div className="border-t p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-gray-900">Subtotal:</span>
              <span className="text-xl font-bold text-gold-600">R$ {subtotal.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              * Taxa de entrega será calculada baseada no endereço
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={onFechar}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium"
              >
                Continuar Comprando
              </button>
              <button
                onClick={onFinalizar}
                className="flex-1 bg-gold-600 text-white py-3 rounded-lg hover:bg-gold-700 font-medium"
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidoPublico;