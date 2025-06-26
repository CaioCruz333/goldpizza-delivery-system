const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Tentativa de login:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Login falhou: Email ou senha não fornecidos');
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('pizzaria');
    console.log('👤 Usuário encontrado:', user ? user.name + ' (' + user.role + ')' : 'NENHUM');
    
    if (!user || !user.ativo) {
      console.log('❌ Login falhou: Usuário não encontrado ou inativo');
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('🔑 Senha confere:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Login falhou: Senha incorreta');
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'goldpizza_secret_key',
      { expiresIn: '24h' }
    );

    console.log('✅ Login bem-sucedido para:', user.name);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        pizzaria: user.pizzaria || null,
        pizzariaNome: user.pizzaria?.nome || null,
        forcarAlteracaoSenha: user.forcarAlteracaoSenha || false,
        primeiroLogin: user.primeiroLogin || false,
        permissoesCozinha: user.permissoesCozinha || null
      }
    });
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Get user info
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('pizzaria');
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      pizzaria: user.pizzaria || null,
      pizzariaNome: user.pizzaria?.nome || null,
      forcarAlteracaoSenha: user.forcarAlteracaoSenha || false,
      primeiroLogin: user.primeiroLogin || false,
      permissoesCozinha: user.permissoesCozinha || null
    });
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.patch('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Se não for primeiro login, verificar senha atual
    if (!user.primeiroLogin && !user.forcarAlteracaoSenha) {
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
    user.primeiroLogin = false;
    user.forcarAlteracaoSenha = false;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;