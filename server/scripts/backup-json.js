const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Modelos
const User = require('../models/User');
const Pizzaria = require('../models/Pizzaria');
const Cardapio = require('../models/Cardapio');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const TipoPizza = require('../models/TipoPizza');

// Configurações
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_NAME = 'goldpizza';

// Criar diretório de backup se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('📁 Diretório de backup criado:', BACKUP_DIR);
}

const criarBackupJSON = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🔌 Conectado ao MongoDB');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const backupPath = path.join(BACKUP_DIR, `backup_json_${timestamp}`);
    
    // Criar diretório do backup
    fs.mkdirSync(backupPath, { recursive: true });
    
    console.log('🚀 Iniciando backup JSON...');
    console.log('📅 Timestamp:', timestamp);
    console.log('📂 Destino:', backupPath);

    // Fazer backup de cada collection
    const collections = [
      { name: 'usuarios', model: User },
      { name: 'pizzarias', model: Pizzaria },
      { name: 'cardapio', model: Cardapio },
      { name: 'clientes', model: Cliente },
      { name: 'pedidos', model: Pedido },
      { name: 'tipos_pizza', model: TipoPizza }
    ];

    const backupData = {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      collections: {}
    };

    for (const collection of collections) {
      try {
        console.log(`📋 Fazendo backup de: ${collection.name}`);
        
        const data = await collection.model.find({}).lean();
        backupData.collections[collection.name] = data;
        
        // Salvar arquivo individual da collection
        const filePath = path.join(backupPath, `${collection.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`   ✅ ${collection.name}: ${data.length} documentos salvos`);
        
      } catch (error) {
        console.error(`   ❌ Erro em ${collection.name}:`, error.message);
        backupData.collections[collection.name] = [];
      }
    }

    // Salvar arquivo completo
    const backupCompleto = path.join(backupPath, 'backup_completo.json');
    fs.writeFileSync(backupCompleto, JSON.stringify(backupData, null, 2));

    // Criar arquivo de metadados
    const metadata = {
      backup_date: new Date().toISOString(),
      backup_type: 'JSON Export',
      database: DB_NAME,
      total_collections: Object.keys(backupData.collections).length,
      total_documents: Object.values(backupData.collections).reduce((total, collection) => total + collection.length, 0),
      collections_info: Object.entries(backupData.collections).map(([name, data]) => ({
        name,
        document_count: data.length
      }))
    };

    fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log('');
    console.log('✅ BACKUP JSON CONCLUÍDO!');
    console.log('========================');
    console.log('📍 Backup salvo em:', backupPath);
    console.log('📊 Total de documentos:', metadata.total_documents);
    console.log('📋 Collections:');
    
    metadata.collections_info.forEach(info => {
      console.log(`   • ${info.name}: ${info.document_count} documentos`);
    });

    console.log('');
    console.log('📁 Arquivos criados:');
    console.log('   • backup_completo.json (todos os dados)');
    console.log('   • metadata.json (informações do backup)');
    metadata.collections_info.forEach(info => {
      console.log(`   • ${info.name}.json`);
    });

    // Limpar backups antigos
    limparBackupsAntigos();

    return backupPath;

  } catch (error) {
    console.error('❌ Erro no backup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
};

const limparBackupsAntigos = () => {
  try {
    console.log('🧹 Verificando backups antigos...');
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_json_'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stats: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    console.log(`📦 Backups JSON encontrados: ${backups.length}`);
    
    // Manter apenas os 10 backups mais recentes
    const MANTER_BACKUPS = 10;
    
    if (backups.length > MANTER_BACKUPS) {
      const backupsParaRemover = backups.slice(MANTER_BACKUPS);
      
      console.log(`🗑️ Removendo ${backupsParaRemover.length} backups antigos...`);
      
      backupsParaRemover.forEach(backup => {
        try {
          fs.rmSync(backup.path, { recursive: true, force: true });
          console.log(`   ✅ Removido: ${backup.name}`);
        } catch (error) {
          console.error(`   ❌ Erro ao remover ${backup.name}:`, error.message);
        }
      });
    } else {
      console.log('✅ Não há backups antigos para remover');
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar backups antigos:', error.message);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  criarBackupJSON().catch(error => {
    console.error('💥 FALHA NO BACKUP!', error);
    process.exit(1);
  });
}

module.exports = { criarBackupJSON, limparBackupsAntigos };