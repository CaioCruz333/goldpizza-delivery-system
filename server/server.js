const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      if (origin.includes('goldpizza-delivery-system') && origin.includes('vercel.app')) {
        return callback(null, origin);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      
      return callback(new Error('Não permitido pelo CORS'), false);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://goldpizza-delivery-system.vercel.app',
  'https://goldpizza-delivery-system-jq15.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Permitir qualquer subdomínio do Vercel para este projeto
    if (origin.includes('goldpizza-delivery-system') && origin.includes('vercel.app')) {
      return callback(null, origin);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }
    
    return callback(new Error('Não permitido pelo CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');

mongoose.connection.on('connected', () => {
  console.log('🍕 Conectado ao MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erro na conexão MongoDB:', err);
});

// Socket.IO para atualizações em tempo real
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);
  
  // Entrar em sala específica da pizzaria
  socket.on('join_pizzaria', (pizzariaId) => {
    socket.join(pizzariaId);
    console.log(`👤 ${socket.id} entrou na pizzaria ${pizzariaId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado:', socket.id);
  });
});

// Disponibilizar io para as rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pizzarias', require('./routes/pizzarias'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cardapio', require('./routes/cardapio'));
app.use('/api/tipos-pizza', require('./routes/tiposPizza'));
app.use('/api/precos', require('./routes/calculadoraPrecos'));
app.use('/api/funcionarios', require('./routes/funcionarios'));
app.use('/api/ingredientes', require('./routes/ingredientes'));
app.use('/api/sabores', require('./routes/sabores'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'GoldPizza API funcionando!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🖥️  Acesso: http://localhost:${PORT}`);
});