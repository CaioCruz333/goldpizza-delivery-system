const mongoose = require('mongoose');
const ItemCardapio = require('../server/models/Cardapio');

// Script de migração para converter dados antigos de sabores para a nova estrutura
async function migrarConfiguracoesSabores() {
  try {
    console.log('🔄 Iniciando migração de configurações de sabores...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar todos os sabores que ainda usam a estrutura antiga
    const sabores = await ItemCardapio.find({
      categoria: 'sabor',
      $or: [
        { configuracoesPizza: { $exists: false } },
        { configuracoesPizza: { $size: 0 } }
      ]
    });
    
    console.log(`📋 Encontrados ${sabores.length} sabores para migrar`);
    
    // Buscar todas as pizzas disponíveis
    const pizzas = await ItemCardapio.find({ categoria: 'pizza' }).select('_id nome');
    console.log(`🍕 Encontradas ${pizzas.length} pizzas disponíveis`);
    
    let migrados = 0;
    
    for (const sabor of sabores) {
      console.log(`🔄 Migrando sabor: ${sabor.nome}`);
      
      const novasConfiguracoes = [];
      
      // Se o sabor tem pizzasCompativeis (estrutura antiga), usar apenas essas pizzas
      if (sabor.pizzasCompativeis && sabor.pizzasCompativeis.length > 0) {
        for (const pizzaId of sabor.pizzasCompativeis) {
          novasConfiguracoes.push({
            pizza: pizzaId,
            permitido: true,
            valorEspecial: sabor.valorEspecial || 0
          });
        }
        console.log(`  ↳ Migradas ${sabor.pizzasCompativeis.length} pizzas compatíveis`);
      } else {
        // Se não tem pizzasCompativeis, aplicar a todas as pizzas baseado no tipo
        for (const pizza of pizzas) {
          // Para compatibilidade, aplicar a todas as pizzas por enquanto
          // O admin pode ajustar depois conforme necessário
          novasConfiguracoes.push({
            pizza: pizza._id,
            permitido: true,
            valorEspecial: sabor.valorEspecial || 0
          });
        }
        console.log(`  ↳ Aplicado a todas as ${pizzas.length} pizzas`);
      }
      
      // Atualizar o sabor com as novas configurações
      await ItemCardapio.findByIdAndUpdate(sabor._id, {
        configuracoesPizza: novasConfiguracoes
      });
      
      migrados++;
      console.log(`  ✅ Sabor "${sabor.nome}" migrado com sucesso`);
    }
    
    console.log(`🎉 Migração concluída! ${migrados} sabores migrados`);
    console.log('📝 Agora você pode:');
    console.log('   1. Verificar as configurações no admin');
    console.log('   2. Ajustar os valores especiais por pizza conforme necessário');
    console.log('   3. Desabilitar sabores para pizzas específicas se desejado');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    // Fechar conexão
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada');
  }
}

// Executar migração se o script for chamado diretamente
if (require.main === module) {
  migrarConfiguracoesSabores()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script de migração:', error);
      process.exit(1);
    });
}

module.exports = { migrarConfiguracoesSabores };