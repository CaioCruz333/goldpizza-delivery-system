const express = require('express');
const User = require('../models/User');
const Pizzaria = require('../models/Pizzaria');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Listar usuários (admin vê todos, admin_pizzaria vê apenas da sua pizzaria)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'admin_pizzaria') {
      query.pizzaria = req.user.pizzaria;
    } else if (req.user.role !== 'admin') {
      query.pizzaria = req.user.pizzaria;
    }

    const users = await User.find(query)
      .populate('pizzaria', 'nome')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo usuário
router.post('/', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      pizzaria,
      dadosMotoboy
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Validar se pizzaria é obrigatória para roles não-admin
    if (role !== 'admin' && !pizzaria) {
      return res.status(400).json({ message: 'Pizzaria é obrigatória para este tipo de usuário' });
    }

    // Se admin_pizzaria está criando usuário, deve ser para sua própria pizzaria
    if (req.user.role === 'admin_pizzaria') {
      if (pizzaria !== req.user.pizzaria.toString()) {
        return res.status(403).json({ message: 'Você só pode criar usuários para sua própria pizzaria' });
      }

      // Verificar limite de usuários
      const pizzariaDoc = await Pizzaria.findById(req.user.pizzaria);
      const usuariosExistentes = await User.countDocuments({ 
        pizzaria: req.user.pizzaria,
        role: { $ne: 'admin_pizzaria' }
      });

      if (usuariosExistentes >= pizzariaDoc.configuracoes.limiteUsuarios) {
        return res.status(400).json({ 
          message: `Limite de usuários atingido (${pizzariaDoc.configuracoes.limiteUsuarios})` 
        });
      }

      // admin_pizzaria não pode criar outros admin_pizzaria ou admin
      if (role === 'admin' || role === 'admin_pizzaria') {
        return res.status(403).json({ message: 'Você não pode criar usuários administradores' });
      }
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role
    };

    if (role !== 'admin') {
      userData.pizzaria = pizzaria;
    }

    if (role === 'motoboy' && dadosMotoboy) {
      userData.dadosMotoboy = dadosMotoboy;
    }

    const user = new User(userData);
    await user.save();

    // Retornar usuário sem a senha
    const userResponse = await User.findById(user._id)
      .populate('pizzaria', 'nome')
      .select('-password');

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar usuário por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('pizzaria', 'nome')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar acesso
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== user._id.toString() &&
        req.user.pizzaria.toString() !== user.pizzaria?._id.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar usuário
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar permissões
    const canEdit = req.user.role === 'admin' || 
                   req.user._id.toString() === user._id.toString();
    
    if (!canEdit) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const {
      name,
      email,
      role,
      pizzaria,
      dadosMotoboy,
      ativo
    } = req.body;

    // Atualizar campos permitidos
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    
    // Apenas admin pode alterar role, pizzaria e status
    if (req.user.role === 'admin') {
      if (role) user.role = role;
      if (pizzaria !== undefined) user.pizzaria = pizzaria;
      if (ativo !== undefined) user.ativo = ativo;
    } else if (req.user.role === 'admin_pizzaria') {
      // admin_pizzaria pode alterar dados básicos de usuários da sua pizzaria
      if (user.pizzaria?.toString() !== req.user.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      // Não pode alterar role para admin ou admin_pizzaria
      if (role && (role === 'admin' || role === 'admin_pizzaria')) {
        return res.status(403).json({ message: 'Você não pode alterar para esta função' });
      }
      if (role && ['atendente', 'cozinha', 'motoboy'].includes(role)) {
        user.role = role;
      }
      if (ativo !== undefined) user.ativo = ativo;
    }

    // Dados específicos do motoboy
    if (dadosMotoboy && (user.role === 'motoboy' || role === 'motoboy')) {
      user.dadosMotoboy = { ...user.dadosMotoboy, ...dadosMotoboy };
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('pizzaria', 'nome')
      .select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.patch('/:id/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se é o próprio usuário ou admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Se não for admin, verificar senha atual
    if (req.user.role !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Senha atual é obrigatória' });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Senha atual incorreta' });
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Desativar/Ativar usuário
router.patch('/:id/toggle-status', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // admin_pizzaria só pode alterar usuários da sua pizzaria
    if (req.user.role === 'admin_pizzaria') {
      if (user.pizzaria?.toString() !== req.user.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      // Não pode desativar outros admin_pizzaria ou admin
      if (user.role === 'admin' || user.role === 'admin_pizzaria') {
        return res.status(403).json({ message: 'Não é possível alterar status deste usuário' });
      }
    }

    user.ativo = !user.ativo;
    await user.save();

    res.json({ 
      message: `Usuário ${user.ativo ? 'ativado' : 'desativado'} com sucesso`,
      ativo: user.ativo 
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Estatísticas de motoboy
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se é o próprio motoboy ou admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const user = await User.findById(id);
    if (!user || user.role !== 'motoboy') {
      return res.status(404).json({ message: 'Motoboy não encontrado' });
    }

    // Calcular estatísticas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const semanaPassada = new Date(hoje);
    semanaPassada.setDate(hoje.getDate() - 7);

    // TODO: Implementar consultas de estatísticas reais
    const stats = {
      entregasHoje: 0,
      ganhosDia: 0,
      ganhosSemanais: 0,
      tempoMedioEntrega: 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do motoboy:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de usuários da pizzaria
router.get('/pizzaria/:pizzariaId/stats', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;
    
    // Verificar acesso
    if (req.user.role !== 'admin' && req.user.pizzaria.toString() !== pizzariaId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const pizzaria = await Pizzaria.findById(pizzariaId);
    if (!pizzaria) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }

    const usuariosAtivos = await User.countDocuments({ 
      pizzaria: pizzariaId, 
      ativo: true,
      role: { $ne: 'admin_pizzaria' }
    });

    const totalUsuarios = await User.countDocuments({ 
      pizzaria: pizzariaId,
      role: { $ne: 'admin_pizzaria' }
    });

    res.json({
      limite: pizzaria.configuracoes.limiteUsuarios,
      total: totalUsuarios,
      ativos: usuariosAtivos,
      disponiveis: pizzaria.configuracoes.limiteUsuarios - totalUsuarios
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Admin resetar senha de usuário
router.patch('/:id/reset-password', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    console.log('Reset password request:', { userId: req.params.id, userRole: req.user.role });
    const { newPassword, forcarAlteracao } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // admin_pizzaria só pode alterar usuários da sua pizzaria
    if (req.user.role === 'admin_pizzaria') {
      if (user.pizzaria?.toString() !== req.user.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      // Não pode alterar senha de outros admin_pizzaria ou admin
      if (user.role === 'admin' || user.role === 'admin_pizzaria') {
        return res.status(403).json({ message: 'Não é possível alterar senha deste usuário' });
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    user.password = newPassword;
    user.forcarAlteracaoSenha = forcarAlteracao || false;
    user.primeiroLogin = forcarAlteracao || false;
    await user.save();

    console.log('Password reset successful for user:', user._id);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Erro ao alterar senha: ' + error.message });
  }
});

module.exports = router;