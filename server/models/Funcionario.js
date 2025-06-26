const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const funcionarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin_pizzaria', 'atendente', 'cozinha', 'motoboy'],
    required: true
  },
  pizzaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pizzaria',
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  forcarAlteracaoSenha: {
    type: Boolean,
    default: true
  },
  primeiroLogin: {
    type: Boolean,
    default: true
  },
  telefone: {
    type: String,
    required: true
  },
  dadosMotoboy: {
    veiculo: String,
    placa: String,
    cnh: String
  },
  salario: {
    type: Number,
    default: 0
  },
  dataAdmissao: {
    type: Date,
    default: Date.now
  },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    cep: String
  },
  permissoesCozinha: {
    preparo: {
      type: Boolean,
      default: false
    },
    finalizacao: {
      type: Boolean,
      default: false
    },
    expedicao: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

funcionarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

funcionarioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

funcionarioSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Funcionario', funcionarioSchema);