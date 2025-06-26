const mongoose = require('mongoose');

const enderecoSchema = new mongoose.Schema({
  rua: {
    type: String,
    required: true,
    trim: true
  },
  numero: {
    type: String,
    required: true,
    trim: true
  },
  complemento: {
    type: String,
    trim: true,
    default: ''
  },
  bairro: {
    type: String,
    required: true,
    trim: true
  },
  cidade: {
    type: String,
    required: true,
    trim: true
  },
  cep: {
    type: String,
    required: true,
    trim: true
  },
  referencia: {
    type: String,
    trim: true,
    default: ''
  }
});

const clienteSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  telefone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  enderecos: [enderecoSchema],
  observacoes: {
    type: String,
    default: '',
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ultimoPedido: {
    type: Date
  }
});

// Índices para melhor performance
clienteSchema.index({ telefone: 1 }, { unique: true });
clienteSchema.index({ nome: 1 });

module.exports = mongoose.model('Cliente', clienteSchema);