const Funcionario = require('../models/Funcionario');
const User = require('../models/User');
const Pizzaria = require('../models/Pizzaria');

// Listar todos os funcionários (com filtro por pizzaria para admin_pizzaria)
const listarFuncionarios = async (req, res) => {
  try {
    let query = {};
    
    // Se for admin_pizzaria, filtrar apenas funcionários da sua pizzaria
    if (req.user.role === 'admin_pizzaria') {
      query.pizzaria = req.user.pizzaria;
    }
    
    // Se for passado o parâmetro pizzaria_id na query
    if (req.query.pizzaria_id) {
      query.pizzaria = req.query.pizzaria_id;
    }

    const funcionarios = await Funcionario.find(query)
      .populate('pizzaria', 'nome endereco')
      .sort({ name: 1 });

    res.json(funcionarios);
  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Buscar funcionário por ID
const buscarFuncionario = async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id)
      .populate('pizzaria', 'nome endereco');
    
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    // Verificar se o usuário tem permissão para ver este funcionário
    if (req.user.role === 'admin_pizzaria' && 
        funcionario.pizzaria._id.toString() !== req.user.pizzaria.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json(funcionario);
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo funcionário
const criarFuncionario = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      pizzaria,
      telefone,
      salario,
      dataAdmissao,
      endereco,
      dadosMotoboy
    } = req.body;

    // Validações básicas
    if (!name || !email || !password || !role || !telefone) {
      return res.status(400).json({ 
        message: 'Nome, email, senha, função e telefone são obrigatórios' 
      });
    }

    // Determinar pizzaria
    let pizzariaId = pizzaria;
    if (req.user.role === 'admin_pizzaria') {
      pizzariaId = req.user.pizzaria;
    }

    if (!pizzariaId) {
      return res.status(400).json({ message: 'Pizzaria é obrigatória' });
    }

    // Verificar se a pizzaria existe
    const pizzariaExists = await Pizzaria.findById(pizzariaId);
    if (!pizzariaExists) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }

    // Verificar se email já existe
    const emailExists = await Funcionario.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Criar funcionário
    const funcionario = new Funcionario({
      name,
      email: email.toLowerCase(),
      password,
      role,
      pizzaria: pizzariaId,
      telefone,
      salario: salario || 0,
      dataAdmissao: dataAdmissao || new Date(),
      endereco,
      dadosMotoboy: role === 'motoboy' ? dadosMotoboy : undefined
    });

    await funcionario.save();

    // Também criar na tabela User para compatibilidade com autenticação
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      pizzaria: pizzariaId,
      ativo: true,
      forcarAlteracaoSenha: true,
      primeiroLogin: true,
      dadosMotoboy: role === 'motoboy' ? {
        telefone,
        veiculo: dadosMotoboy?.veiculo,
        placa: dadosMotoboy?.placa
      } : undefined
    });

    await user.save();

    const funcionarioPopulado = await Funcionario.findById(funcionario._id)
      .populate('pizzaria', 'nome endereco');

    res.status(201).json(funcionarioPopulado);
  } catch (error) {
    console.error('Erro ao criar funcionário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar funcionário
const atualizarFuncionario = async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id).populate('pizzaria');
    
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    // Verificar permissões
    if (req.user.role === 'admin_pizzaria') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      const funcionarioPizzariaId = funcionario.pizzaria?._id?.toString() || funcionario.pizzaria?.toString();
      
      if (funcionarioPizzariaId !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado - funcionário de outra pizzaria' });
      }
    }

    const {
      name,
      email,
      role,
      telefone,
      salario,
      dataAdmissao,
      endereco,
      dadosMotoboy,
      ativo,
      permissoesCozinha
    } = req.body;

    // Verificar se email já existe (exceto para o próprio funcionário)
    if (email && email !== funcionario.email) {
      const emailExists = await Funcionario.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: funcionario._id }
      });
      if (emailExists) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }

    // Atualizar campos
    if (name) funcionario.name = name;
    if (email) funcionario.email = email.toLowerCase();
    if (role) funcionario.role = role;
    if (telefone) funcionario.telefone = telefone;
    if (salario !== undefined) funcionario.salario = salario;
    if (dataAdmissao) funcionario.dataAdmissao = dataAdmissao;
    if (endereco) funcionario.endereco = endereco;
    if (ativo !== undefined) funcionario.ativo = ativo;
    if (permissoesCozinha) {
      funcionario.permissoesCozinha = permissoesCozinha;
    }
    
    if (role === 'motoboy' && dadosMotoboy) {
      funcionario.dadosMotoboy = dadosMotoboy;
    }

    await funcionario.save();

    // Atualizar também na tabela User
    const user = await User.findOne({ email: funcionario.email });
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();
      if (role) user.role = role;
      if (ativo !== undefined) user.ativo = ativo;
      if (permissoesCozinha) user.permissoesCozinha = permissoesCozinha;
      
      if (role === 'motoboy' && dadosMotoboy) {
        user.dadosMotoboy = {
          telefone,
          veiculo: dadosMotoboy.veiculo,
          placa: dadosMotoboy.placa
        };
      }
      
      await user.save();
    }

    const funcionarioAtualizado = await Funcionario.findById(funcionario._id)
      .populate('pizzaria', 'nome endereco');

    res.json(funcionarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Excluir funcionário
const excluirFuncionario = async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id);
    
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    // Verificar permissões
    if (req.user.role === 'admin_pizzaria' && 
        funcionario.pizzaria.toString() !== req.user.pizzaria.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Remover da tabela User também
    await User.findOneAndDelete({ email: funcionario.email });
    
    // Remover funcionário
    await Funcionario.findByIdAndDelete(req.params.id);

    res.json({ message: 'Funcionário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir funcionário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Resetar senha do funcionário
const resetarSenha = async (req, res) => {
  try {
    const { novaSenha } = req.body;
    
    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ 
        message: 'Nova senha deve ter pelo menos 6 caracteres' 
      });
    }

    const funcionario = await Funcionario.findById(req.params.id);
    
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    // Verificar permissões
    if (req.user.role === 'admin_pizzaria' && 
        funcionario.pizzaria.toString() !== req.user.pizzaria.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    funcionario.password = novaSenha;
    funcionario.forcarAlteracaoSenha = true;
    funcionario.primeiroLogin = true;
    await funcionario.save();

    // Atualizar também na tabela User
    const user = await User.findOne({ email: funcionario.email });
    if (user) {
      user.password = novaSenha;
      user.forcarAlteracaoSenha = true;
      user.primeiroLogin = true;
      await user.save();
    }

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

module.exports = {
  listarFuncionarios,
  buscarFuncionario,
  criarFuncionario,
  atualizarFuncionario,
  excluirFuncionario,
  resetarSenha
};