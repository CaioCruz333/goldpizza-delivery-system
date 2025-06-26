import React, { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import io from 'socket.io-client';
import api from '../services/api';

const PedidoPublicoSimples = () => {
  const [pizzaria, setPizzaria] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [pizzariaId, setPizzariaId] = useState(null);

  useEffect(() => {
    loadDados();
  }, []);

  // Setup do WebSocket para atualizações de cardápio em tempo real
  useEffect(() => {
    if (!pizzariaId) return;

    console.log('🔌 Conectando WebSocket para cardápio em tempo real...');
    
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://goldpizza-backend.onrender.com'
      : 'http://localhost:5000';
      
    const newSocket = io(serverUrl, {
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
      console.log('Carregando dados...');
      
      // Buscar primeira pizzaria
      const pizzariasResponse = await api.get('/pizzarias/publico');
      console.log('Pizzarias response:', pizzariasResponse.data);
      
      if (pizzariasResponse.data.length === 0) {
        throw new Error('Nenhuma pizzaria encontrada');
      }

      const currentPizzariaId = pizzariasResponse.data[0]._id;
      setPizzariaId(currentPizzariaId);
      
      // Carregar dados da pizzaria e cardápio
      const [pizzariaResponse, cardapioResponse] = await Promise.all([
        api.get(`/pizzarias/publico/${currentPizzariaId}`),
        api.get(`/cardapio/publico/${currentPizzariaId}`)
      ]);

      console.log('Pizzaria:', pizzariaResponse.data);
      console.log('Cardápio:', cardapioResponse.data);

      setPizzaria(pizzariaResponse.data);
      setCardapio(cardapioResponse.data);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error.message);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erro: {error}</p>
          <button 
            onClick={loadDados}
            className="mt-4 bg-gold-600 text-white px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
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

  // Filtrar apenas categorias visíveis
  const categoriasVisiveis = ['combo', 'pizza', 'bebida'];
  const ordemCategorias = ['combo', 'pizza', 'bebida'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-gold-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pizzaria.nome}</h1>
              <p className="text-sm text-gray-500">{pizzaria.endereco?.cidade}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Nosso Cardápio</h2>
          <p className="text-gray-600">Escolha seus itens favoritos</p>
        </div>

        {ordemCategorias.map(categoria => {
          const itensCategoria = cardapio.filter(item => 
            item.categoria === categoria && categoriasVisiveis.includes(item.categoria)
          );
          
          if (itensCategoria.length === 0) return null;

          const nomeCategoria = {
            'combo': 'Combos',
            'pizza': 'Pizzas', 
            'bebida': 'Bebidas'
          }[categoria];

          return (
            <div key={categoria} className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {nomeCategoria}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {itensCategoria.map(item => (
                  <div key={item._id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.nome}</h4>
                        <p className="text-sm text-gray-500 mt-1">{item.descricao}</p>
                      </div>
                      <div className="ml-4">
                        <span className="text-lg font-medium text-gold-600">
                          R$ {typeof item.preco === 'number' ? item.preco.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      {item.categoria === 'pizza' ? (
                        <button className="w-full bg-gold-600 text-white py-2 px-4 rounded-lg hover:bg-gold-700">
                          Personalizar Pizza
                        </button>
                      ) : (
                        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                          Adicionar ao Carrinho
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {cardapio.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum item encontrado no cardápio</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PedidoPublicoSimples;