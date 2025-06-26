const mongoose = require('mongoose');

const pizzariaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  endereco: {
    rua: { type: String, required: true },
    numero: { type: String, required: true },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    cep: { type: String, required: true }
  },
  contato: {
    telefone: { type: String, required: true },
    email: { type: String, required: true },
    whatsapp: String
  },
  configuracoes: {
    horarioFuncionamento: {
      abertura: { type: String, default: '18:00' },
      fechamento: { type: String, default: '23:00' }
    },
    taxaEntrega: { type: Number, default: 5.00 },
    tempoPreparoMedio: { type: Number, default: 30 }, // minutos
    comissaoMotoboy: { type: Number, default: 2.50 }, // valor fixo por entrega
    limiteUsuarios: { type: Number, default: 10 } // limite de usuários que o admin da pizzaria pode criar
  },
  ativa: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pizzaria', pizzariaSchema);