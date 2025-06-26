const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

async function migrateComboReferences() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB');

    // Buscar todos os combos que têm itensCombo com tamanhoBebida
    const combos = await ItemCardapio.find({
      categoria: 'combo',
      'itensCombo.tamanhoBebida': { $exists: true }
    });

    console.log(`🔄 Encontrados ${combos.length} combos para migrar`);

    for (const combo of combos) {
      console.log(`\n📦 Migrando combo: ${combo.nome}`);
      let modified = false;

      for (let i = 0; i < combo.itensCombo.length; i++) {
        const itemCombo = combo.itensCombo[i];
        
        if (itemCombo.tamanhoBebida && itemCombo.tipo === 'bebida') {
          console.log(`  🥤 Migrando bebida com tamanho: ${itemCombo.tamanhoBebida}`);
          
          // Buscar bebida correspondente no cardápio
          let bebida = await ItemCardapio.findOne({
            categoria: 'bebida',
            tamanho: itemCombo.tamanhoBebida,
            pizzaria: combo.pizzaria
          });
          
          // Se não encontrar na mesma pizzaria, buscar qualquer bebida com esse tamanho
          if (!bebida) {
            bebida = await ItemCardapio.findOne({
              categoria: 'bebida',
              tamanho: itemCombo.tamanhoBebida
            });
          }

          if (bebida) {
            console.log(`  ✅ Encontrada bebida: ${bebida.nome} (${bebida.tamanho})`);
            
            // Atualizar referência
            combo.itensCombo[i].item = bebida._id;
            // Remover tamanhoBebida (será removido automaticamente pelo novo schema)
            delete combo.itensCombo[i].tamanhoBebida;
            modified = true;
          } else {
            console.log(`  ❌ Não encontrada bebida para tamanho: ${itemCombo.tamanhoBebida}`);
            
            // Criar bebida genérica se não existir
            const novaBebida = new ItemCardapio({
              nome: `Bebida ${itemCombo.tamanhoBebida}`,
              descricao: `Bebida de ${itemCombo.tamanhoBebida}`,
              categoria: 'bebida',
              tamanho: itemCombo.tamanhoBebida,
              preco: 8, // Preço padrão
              valorEspecial: 0,
              pizzaria: combo.pizzaria,
              disponivel: true
            });
            
            await novaBebida.save();
            console.log(`  ✅ Criada nova bebida: ${novaBebida.nome}`);
            
            combo.itensCombo[i].item = novaBebida._id;
            delete combo.itensCombo[i].tamanhoBebida;
            modified = true;
          }
        }
      }

      if (modified) {
        await combo.save();
        console.log(`  💾 Combo ${combo.nome} salvo com novas referências`);
      }
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Conexão com MongoDB fechada');
  }
}

// Executar migração
migrateComboReferences();