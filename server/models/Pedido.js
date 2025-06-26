const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCardapio',
    required: true
  },
  quantidade: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  precoUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  valorEspecial: {
    type: Number,
    default: 0,
    min: 0
  },
  // Para pizzas com sabores
  sabores: [{
    sabor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCardapio'
    },
    quantidade: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  // Para pizzas com bordas
  borda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCardapio'
  },
  observacoes: {
    type: String,
    default: '',
    trim: true
  },
  // Para combos - pizzas configuradas
  pizzas: [{
    nome: {
      type: String,
      required: true
    },
    categoria: {
      type: String,
      default: 'pizza'
    },
    quantidade: {
      type: Number,
      default: 1
    },
    sabores: [mongoose.Schema.Types.Mixed],
    borda: mongoose.Schema.Types.Mixed,
    observacoes: {
      type: String,
      default: ''
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const pedidoSchema = new mongoose.Schema({
  numero: {
    type: Number,
    required: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  pizzaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pizzaria',
    required: true
  },
  itens: [itemPedidoSchema],
  endereco: {
    rua: { type: String, required: function() { return this.tipo === 'delivery'; } },
    numero: { type: String, required: function() { return this.tipo === 'delivery'; } },
    complemento: { type: String, default: '' },
    bairro: { type: String, required: function() { return this.tipo === 'delivery'; } },
    cidade: { type: String, required: function() { return this.tipo === 'delivery'; } },
    cep: { type: String, required: function() { return this.tipo === 'delivery'; } },
    referencia: { type: String, default: '' }
  },
  tipo: {
    type: String,
    enum: ['delivery', 'retirada'],
    required: true,
    default: 'delivery'
  },
  status: {
    type: String,
    enum: ['pendente', 'recebido', 'confirmado', 'preparando', 'finalizado', 'pronto', 'saiu_entrega', 'entregue', 'finalizado_pago', 'cancelado'],
    default: 'recebido'
  },
  // Responsável atribuído para o preparo
  pizzaiolo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Motoboy atribuído para a entrega
  motoboy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Progresso das pizzas individuais na preparação
  progressoPizzas: {
    type: Map,
    of: Boolean,
    default: {}
  },
  formaPagamento: {
    tipo: {
      type: String,
      enum: ['dinheiro', 'cartao_debito', 'cartao_credito', 'pix'],
      required: true
    },
    necessitaTroco: {
      type: Boolean,
      default: false
    },
    valorTroco: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  valores: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxaEntrega: {
      type: Number,
      default: 0,
      min: 0
    },
    desconto: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    // Comissão do motoboy para este pedido
    comissaoMotoboy: {
      type: Number,
      default: 2.50,
      min: 0
    }
  },
  tempoEstimado: {
    type: Number, // em minutos
    default: 45
  },
  tempos: {
    pendente: { type: Date },
    recebido: { type: Date },
    confirmado: { type: Date },
    preparando: { type: Date },
    finalizado: { type: Date },
    pronto: { type: Date },
    saiu_entrega: { type: Date },
    entregue: { type: Date },
    finalizado_pago: { type: Date },
    cancelado: { type: Date }
  },
  observacoes: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Histórico de mudanças de status
  historico: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    observacao: {
      type: String,
      default: ''
    }
  }]
});

// Middleware para atualizar updatedAt e registrar tempos
pedidoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Registrar automaticamente o tempo quando o status muda
  if (this.isModified('status')) {
    if (!this.tempos) {
      this.tempos = {};
    }
    this.tempos[this.status] = new Date();
  }
  
  next();
});

// Método para gerar número do pedido (sequência simples 1-999)
pedidoSchema.statics.gerarNumero = async function(pizzariaId) {
  // Buscar o último pedido da pizzaria
  const ultimoPedido = await this.findOne({
    pizzaria: pizzariaId
  }).sort({ numero: -1 });
  
  let proximoNumero = 1;
  if (ultimoPedido) {
    proximoNumero = ultimoPedido.numero + 1;
    
    // Se chegou a 999, reinicia em 1
    if (proximoNumero > 999) {
      proximoNumero = 1;
    }
  }
  
  return proximoNumero;
};

// Método para adicionar ao histórico
pedidoSchema.methods.adicionarHistorico = function(novoStatus, usuario, observacao = '') {
  this.historico.push({
    status: novoStatus,
    usuario: usuario,
    observacao: observacao
  });
  this.status = novoStatus;
};

// Índices para melhor performance
pedidoSchema.index({ numero: 1, pizzaria: 1 }, { unique: true }); // Número único por pizzaria
pedidoSchema.index({ cliente: 1 });
pedidoSchema.index({ pizzaria: 1 });
pedidoSchema.index({ status: 1 });
pedidoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Pedido', pedidoSchema);