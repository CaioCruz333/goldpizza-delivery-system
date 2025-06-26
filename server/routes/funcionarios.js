const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  listarFuncionarios,
  buscarFuncionario,
  criarFuncionario,
  atualizarFuncionario,
  excluirFuncionario,
  resetarSenha
} = require('../controllers/funcionarioController');

const router = express.Router();


router.use(auth);

// Listar funcionários (admin e admin_pizzaria)
router.get('/', 
  requireRole(['admin', 'admin_pizzaria']), 
  listarFuncionarios
);

// Buscar funcionário por ID (admin e admin_pizzaria)
router.get('/:id', 
  requireRole(['admin', 'admin_pizzaria']), 
  buscarFuncionario
);

// Criar novo funcionário (admin e admin_pizzaria)
router.post('/', 
  requireRole(['admin', 'admin_pizzaria']), 
  criarFuncionario
);


// Atualizar funcionário (admin e admin_pizzaria)
router.put('/:id', 
  requireRole(['admin', 'admin_pizzaria']), 
  atualizarFuncionario
);

// Excluir funcionário (admin e admin_pizzaria)
router.delete('/:id', 
  requireRole(['admin', 'admin_pizzaria']), 
  excluirFuncionario
);

// Resetar senha do funcionário (admin e admin_pizzaria)
router.patch('/:id/resetar-senha', 
  requireRole(['admin', 'admin_pizzaria']), 
  resetarSenha
);

module.exports = router;