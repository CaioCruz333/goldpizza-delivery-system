const mongoose = require('mongoose');
const User = require('../models/User');
const Pizzaria = require('../models/Pizzaria');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('Conectado ao MongoDB para seed');

    // ⚠️ PROTEÇÃO: Não executar em produção
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ ERRO: Seed não pode ser executado em produção!');
      console.log('🛡️ Proteção ativa para evitar perda de dados.');
      return;
    }

    console.log('🌱 Iniciando seed de desenvolvimento...');
    console.log('📋 Verificando dados existentes...');

    // Verificar se já existem dados importantes
    const existingUsers = await User.countDocuments();
    const existingPizzarias = await Pizzaria.countDocuments();

    if (existingUsers > 0 || existingPizzarias > 0) {
      console.log(`📊 Encontrados: ${existingUsers} usuários, ${existingPizzarias} pizzarias`);
      console.log('✅ Modo seguro: Criando apenas dados que não existem');
    } else {
      console.log('🆕 Banco vazio: Criando dados iniciais');
    }

    // Criar ou encontrar pizzaria
    let pizzaria = await Pizzaria.findOne({ nome: 'Pizza Gold Express' });
    
    if (!pizzaria) {
      pizzaria = new Pizzaria({
        nome: 'Pizza Gold Express',
        endereco: {
          rua: 'Rua das Pizzas',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          cep: '01234-567'
        },
        contato: {
          telefone: '(11) 1234-5678',
          email: 'contato@pizzagold.com',
          whatsapp: '11987654321'
        },
        configuracoes: {
          horarioFuncionamento: {
            abertura: '18:00',
            fechamento: '23:00'
          },
          taxaEntrega: 5.00,
          tempoPreparoMedio: 30,
          comissaoMotoboy: 2.50
        }
      });

      await pizzaria.save();
      console.log('🏪 Pizzaria criada:', pizzaria.nome);
    } else {
      console.log('🏪 Pizzaria já existe:', pizzaria.nome);
    }

    // Usuários padrão (apenas criar se não existirem)
    const usuariosPadrao = [
      {
        name: 'Administrador',
        email: 'admin@goldpizza.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        name: 'Admin Pizzaria',
        email: 'admin.pizzaria@pizzagold.com',
        password: '123123',
        role: 'admin_pizzaria',
        pizzaria: pizzaria._id
      },
      {
        name: 'João Atendente',
        email: 'atendente@pizzagold.com',
        password: 'atendente123',
        role: 'atendente',
        pizzaria: pizzaria._id
      },
      {
        name: 'Maria Cozinha',
        email: 'cozinha@pizzagold.com',
        password: 'cozinha123',
        role: 'cozinha',
        pizzaria: pizzaria._id
      },
      {
        name: 'Carlos Motoboy',
        email: 'motoboy@pizzagold.com',
        password: 'motoboy123',
        role: 'motoboy',
        pizzaria: pizzaria._id,
        dadosMotoboy: {
          telefone: '11987654321',
          veiculo: 'Honda CG 160',
          placa: 'ABC-1234'
        }
      }
    ];

    console.log('👥 Criando usuários (preservando existentes)...');

    for (const userData of usuariosPadrao) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
      } else {
        console.log(`⏭️  Usuário já existe: ${existingUser.name} (${existingUser.email})`);
        
        // Atualizar apenas campos que não são sensíveis (preservar senha)
        if (!existingUser.pizzaria && userData.pizzaria) {
          existingUser.pizzaria = userData.pizzaria;
          await existingUser.save();
          console.log(`   🔗 Pizzaria vinculada a ${existingUser.name}`);
        }
        
        // Atualizar dados do motoboy se não existirem
        if (userData.dadosMotoboy && !existingUser.dadosMotoboy?.telefone) {
          existingUser.dadosMotoboy = userData.dadosMotoboy;
          await existingUser.save();
          console.log(`   🏍️  Dados do motoboy atualizados para ${existingUser.name}`);
        }
      }
    }

    console.log('\n🎉 SEED SEGURO COMPLETO');
    console.log('═══════════════════════════════════════');
    console.log('🔐 Usuários disponíveis (senhas preservadas):');
    console.log('   Admin Geral: admin@goldpizza.com');
    console.log('   Admin Pizzaria: admin.pizzaria@pizzagold.com');
    console.log('   Atendente: atendente@pizzagold.com');
    console.log('   Cozinha: cozinha@pizzagold.com');
    console.log('   Motoboy: motoboy@pizzagold.com');
    console.log('🏪 Pizzaria: Pizza Gold Express');
    console.log('✅ Dados existentes foram preservados');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
};

// Executar seed se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;