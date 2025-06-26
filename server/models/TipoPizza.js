const mongoose = require('mongoose');

const tipoPizzaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    uppercase: true // P, M, G, GG sempre em maiúsculo
  },
  descricao: {
    type: String,
    required: true // Ex: "Pequena", "Média", "Grande", "Gigante"
  },
  fatias: {
    type: Number,
    required: true,
    min: 1
  },
  maxSabores: {
    type: Number,
    required: true,
    min: 1,
    default: 1 // Quantos sabores podem ser selecionados
  },
  ordem: {
    type: Number,
    default: 0 // Para ordenar na exibição (P=1, M=2, G=3, GG=4)
  },
  ativo: {
    type: Boolean,
    default: true
  },
  pizzaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pizzaria',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice único para evitar nomes duplicados por pizzaria
tipoPizzaSchema.index({ nome: 1, pizzaria: 1 }, { unique: true });

module.exports = mongoose.model('TipoPizza', tipoPizzaSchema);