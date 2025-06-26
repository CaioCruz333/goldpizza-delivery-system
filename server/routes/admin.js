const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getAdminStats,
  getRelatorioVendas,
  getRelatorioProdutividade
} = require('../controllers/adminController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(auth);

// Estatísticas - admin e admin_pizzaria podem acessar
router.get('/stats', async (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'admin_pizzaria') {
    return getAdminStats(req, res);
  } else {
    return res.status(403).json({ message: 'Acesso negado' });
  }
});

// Outras rotas só para admin
router.use(requireRole('admin'));

// Relatórios
router.get('/relatorios/vendas', getRelatorioVendas);
router.get('/relatorios/produtividade', getRelatorioProdutividade);

module.exports = router;