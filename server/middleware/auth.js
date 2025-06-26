const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goldpizza_secret_key');
    const user = await User.findById(decoded.id).populate('pizzaria');
    
    if (!user || !user.ativo) {
      return res.status(401).json({ message: 'Token inválido' });
    }


    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado por role' });
    }

    next();
  };
};

const requireSamePizzaria = (req, res, next) => {
  // Admin geral pode acessar qualquer pizzaria
  if (req.user.role === 'admin') {
    return next();
  }

  // Admin da pizzaria pode acessar apenas sua própria pizzaria
  if (req.user.role === 'admin_pizzaria') {
    const pizzariaId = req.params.pizzariaId || req.body.pizzaria;
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    
    if (pizzariaId === userPizzariaId) {
      return next();
    }
  }

  return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
};

module.exports = { auth, requireRole, requireSamePizzaria };