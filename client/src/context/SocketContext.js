import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user } = useAuth();

  // Função para obter ID da pizzaria
  const getPizzariaId = useCallback(() => {
    if (!user || !user.pizzaria) return null;
    return typeof user.pizzaria === 'object' ? user.pizzaria._id : user.pizzaria;
  }, [user]);

  useEffect(() => {
    if (!user) {
      // Se não há usuário, desconectar socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    console.log('🔌 Inicializando conexão WebSocket...');
    
    // Criar nova conexão socket
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'], // Fallback para polling se WebSocket falhar
      timeout: 5000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 10
    });

    // Event listeners
    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado!', newSocket.id);
      setConnected(true);
      setReconnectAttempts(0);
      
      // Entrar na sala da pizzaria
      const pizzariaId = getPizzariaId();
      if (pizzariaId) {
        console.log('🏪 Entrando na sala da pizzaria:', pizzariaId);
        newSocket.emit('join_pizzaria', pizzariaId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚨 Erro de conexão WebSocket:', error);
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconectado após ${attemptNumber} tentativas`);
      setConnected(true);
      setReconnectAttempts(0);
      
      // Re-entrar na sala da pizzaria após reconexão
      const pizzariaId = getPizzariaId();
      if (pizzariaId) {
        newSocket.emit('join_pizzaria', pizzariaId);
      }
    });

    newSocket.on('reconnect_failed', () => {
      console.error('💥 Falha na reconexão WebSocket');
      setConnected(false);
    });

    // Debug: Log de todos os eventos recebidos
    const debugEvents = [
      'novo_pedido',
      'pedido_atualizado', 
      'pedido_aceito_entrega',
      'pedido_entregue',
      'pedido_cancelado'
    ];

    debugEvents.forEach(event => {
      newSocket.on(event, (data) => {
        console.log(`📡 Evento recebido: ${event}`, data);
      });
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('🔌 Desconectando WebSocket...');
      newSocket.disconnect();
    };
  }, [user, getPizzariaId]);

  // Função helper para emitir eventos
  const emit = useCallback((event, data) => {
    if (socket && connected) {
      console.log(`📤 Emitindo evento: ${event}`, data);
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Tentativa de emitir evento sem conexão:', event);
    }
  }, [socket, connected]);

  // Função helper para escutar eventos
  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  }, [socket]);

  // Função helper para remover listeners
  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  const value = {
    socket,
    connected,
    reconnectAttempts,
    emit,
    on,
    off,
    pizzariaId: getPizzariaId()
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};