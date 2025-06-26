const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurações de backup
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_NAME = 'goldpizza';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Criar diretório de backup se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('📁 Diretório de backup criado:', BACKUP_DIR);
}

const criarBackup = () => {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
    
    // Comando mongodump
    const comando = `mongodump --uri="${MONGODB_URI}/${DB_NAME}" --out="${backupPath}"`;
    
    console.log('🚀 Iniciando backup...');
    console.log('📅 Timestamp:', timestamp);
    console.log('📂 Destino:', backupPath);
    
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro no backup:', error.message);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ Warnings:', stderr);
      }
      
      console.log('✅ Backup criado com sucesso!');
      console.log('📍 Local:', backupPath);
      console.log('📊 Saída mongodump:', stdout);
      
      // Verificar se o backup foi criado
      const dbBackupPath = path.join(backupPath, DB_NAME);
      if (fs.existsSync(dbBackupPath)) {
        const files = fs.readdirSync(dbBackupPath);
        console.log('📋 Collections salvas:', files.length);
        console.log('🗂️ Arquivos:', files.join(', '));
      }
      
      resolve(backupPath);
    });
  });
};

const limparBackupsAntigos = () => {
  try {
    console.log('🧹 Verificando backups antigos...');
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stats: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    console.log(`📦 Backups encontrados: ${backups.length}`);
    
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

const verificarEspaco = () => {
  try {
    const stats = fs.statSync(BACKUP_DIR);
    console.log('💾 Diretório de backup verificado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar espaço:', error.message);
    return false;
  }
};

const executarBackup = async () => {
  try {
    console.log('🔄 INICIANDO PROCESSO DE BACKUP');
    console.log('================================');
    
    // Verificar se mongodump está disponível
    exec('mongodump --version', (error) => {
      if (error) {
        console.error('❌ ERRO: mongodump não encontrado!');
        console.error('📥 Instale MongoDB Tools: https://docs.mongodb.com/database-tools/');
        return;
      }
    });
    
    // Verificar espaço
    if (!verificarEspaco()) {
      throw new Error('Não foi possível verificar o diretório de backup');
    }
    
    // Criar backup
    const backupPath = await criarBackup();
    
    // Limpar backups antigos
    limparBackupsAntigos();
    
    console.log('');
    console.log('🎉 BACKUP CONCLUÍDO COM SUCESSO!');
    console.log('================================');
    console.log('📍 Backup salvo em:', backupPath);
    console.log('⏰ Para restaurar, use:');
    console.log(`   mongorestore --uri="${MONGODB_URI}/${DB_NAME}" --drop "${path.join(backupPath, DB_NAME)}"`);
    
  } catch (error) {
    console.error('💥 FALHA NO BACKUP!');
    console.error('================================');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  executarBackup();
}

module.exports = { criarBackup, limparBackupsAntigos, executarBackup };