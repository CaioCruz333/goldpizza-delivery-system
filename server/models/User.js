const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    enum: ['admin', 'admin_pizzaria', 'atendente', 'cozinha', 'motoboy'],
    required: true
  },
  pizzaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pizzaria',
    required: function() {
      return this.role !== 'admin';
    }
  },
  ativo: {
    type: Boolean,
    default: true
  },
  // Permissões específicas para usuários da cozinha
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
  forcarAlteracaoSenha: {
    type: Boolean,
    default: false
  },
  primeiroLogin: {
    type: Boolean,
    default: true
  },
  dadosMotoboy: {
    telefone: String,
    veiculo: String,
    placa: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);