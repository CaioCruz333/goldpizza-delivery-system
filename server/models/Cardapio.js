const mongoose = require('mongoose');

const ingredienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  preco: { type: Number, default: 0 }
});

const itemCardapioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  descricao: {
    type: String,
    required: function() {
      return this.categoria !== 'sabor'; // Descrição não obrigatória para sabores
    }
  },
  categoria: {
    type: String,
    enum: ['pizza', 'sabor', 'bebida', 'combo', 'borda'],
    required: true
  },
  // Para sabores: classificação entre salgado ou doce
  tipoSabor: {
    type: String,
    enum: ['salgado', 'doce'],
    required: function() {
      return this.categoria === 'sabor';
    }
  },
  // Para sabores: valor adicional que será multiplicado pela quantidade de sabores
  // Para bebidas: valor adicional para bebidas premium
  // Para bordas: valor adicional para bordas especiais
  valorEspecial: {
    type: Number,
    default: 0,
    min: 0
  },
  // Para bebidas: tamanho específico (350ml, 600ml, etc)
  tamanho: {
    type: String,
    required: function() {
      return this.categoria === 'bebida';
    }
  },
  // Para pizzas: quantidade de fatias
  quantidadeFatias: {
    type: Number,
    required: function() {
      return this.categoria === 'pizza';
    },
    min: 1
  },
  // Para pizzas: quantidade máxima de sabores
  quantidadeSabores: {
    type: Number,
    required: function() {
      return this.categoria === 'pizza';
    },
    min: 1
  },
  // Para sabores: quais pizzas podem usar este sabor
  pizzasCompativeis: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCardapio'
  }],
  // Para combos: itens inclusos no combo
  itensCombo: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCardapio',
      required: true  // Agora obrigatório para todos os tipos
    },
    quantidade: {
      type: Number,
      default: 1,
      min: 1
    },
    tipo: {
      type: String,
      enum: ['pizza', 'bebida'],
      required: true
    }
    // Removido tamanhoBebida - agora usa sempre referência ao item
  }],
  preco: {
    type: Number,
    required: function() {
      return this.categoria !== 'sabor'; // Sabores não têm preço base
    },
    min: 0,
    default: 0
  },
  tempoPreparoMinutos: {
    type: Number,
    default: 20
  },
  ingredientes: [ingredienteSchema],
  opcionais: [ingredienteSchema],
  // Para itens que não são pizza (bebidas, sobremesas, etc.)
  tamanhos: [{
    nome: { type: String, required: true }, // 300ml, 600ml, 1L, etc.
    preco: { type: Number, required: true },
    descricao: { type: String, default: '' }
  }],
  disponivel: {
    type: Boolean,
    default: true
  },
  visivelCardapio: {
    type: Boolean,
    default: true,
    required: function() {
      return this.categoria === 'pizza';
    }
  },
  destaque: {
    type: Boolean,
    default: false
  },
  imagem: {
    type: String,
    default: ''
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

module.exports = mongoose.model('ItemCardapio', itemCardapioSchema);