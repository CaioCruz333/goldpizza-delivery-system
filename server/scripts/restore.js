const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Configurações
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_NAME = 'goldpizza';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const listarBackups = () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('❌ Diretório de backup não encontrado:', BACKUP_DIR);
      return [];
    }

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stats: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    return backups;
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error.message);
    return [];
  }
};

const confirmarRestore = (backupName) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('');
    console.log('⚠️  ATENÇÃO: OPERAÇÃO DE RESTAURAÇÃO!');
    console.log('🚨 Isso substituirá TODOS os dados atuais do banco!');
    console.log('💾 Certifique-se de ter um backup dos dados atuais.');
    console.log('');
    console.log(`📦 Backup selecionado: ${backupName}`);
    console.log('');
    
    rl.question('🤔 Tem CERTEZA que deseja restaurar? Digite "RESTAURAR" para confirmar: ', (answer) => {
      rl.close();
      resolve(answer === 'RESTAURAR');
    });
  });
};

const restaurarBackup = (backupPath) => {
  return new Promise((resolve, reject) => {
    const dbBackupPath = path.join(backupPath, DB_NAME);
    
    if (!fs.existsSync(dbBackupPath)) {
      reject(new Error(`Backup do banco ${DB_NAME} não encontrado em: ${dbBackupPath}`));
      return;
    }
    
    // Comando mongorestore
    const comando = `mongorestore --uri="${MONGODB_URI}/${DB_NAME}" --drop "${dbBackupPath}"`;
    
    console.log('🔄 Iniciando restauração...');
    console.log('📂 Origem:', dbBackupPath);
    
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro na restauração:', error.message);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ Warnings:', stderr);
      }
      
      console.log('✅ Restauração concluída!');
      console.log('📊 Saída mongorestore:', stdout);
      
      resolve();
    });
  });
};

const executarRestore = async () => {
  try {
    console.log('🔄 PROCESSO DE RESTAURAÇÃO');
    console.log('==========================');
    
    // Listar backups disponíveis
    const backups = listarBackups();
    
    if (backups.length === 0) {
      console.log('❌ Nenhum backup encontrado!');
      console.log('📁 Verifique o diretório:', BACKUP_DIR);
      return;
    }
    
    console.log('📦 Backups disponíveis:');
    console.log('');
    
    backups.forEach((backup, index) => {
      const dataFormatada = backup.stats.mtime.toLocaleString('pt-BR');
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   📅 Criado em: ${dataFormatada}`);
      console.log(`   📁 Tamanho: ${(backup.stats.size / 1024).toFixed(2)} KB`);
      console.log('');
    });
    
    // Seleção interativa do backup
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const selecao = await new Promise((resolve) => {
      rl.question('🔢 Digite o número do backup para restaurar (ou 0 para cancelar): ', (answer) => {
        rl.close();
        resolve(parseInt(answer));
      });
    });
    
    if (selecao === 0 || isNaN(selecao) || selecao < 1 || selecao > backups.length) {
      console.log('❌ Operação cancelada ou seleção inválida.');
      return;
    }
    
    const backupSelecionado = backups[selecao - 1];
    
    // Confirmação final
    const confirmado = await confirmarRestore(backupSelecionado.name);
    
    if (!confirmado) {
      console.log('✅ Operação cancelada. Dados preservados.');
      return;
    }
    
    // Verificar se mongorestore está disponível
    await new Promise((resolve, reject) => {
      exec('mongorestore --version', (error) => {
        if (error) {
          reject(new Error('mongorestore não encontrado! Instale MongoDB Tools.'));
        } else {
          resolve();
        }
      });
    });
    
    // Executar restauração
    await restaurarBackup(backupSelecionado.path);
    
    console.log('');
    console.log('🎉 RESTAURAÇÃO CONCLUÍDA!');
    console.log('========================');
    console.log('✅ Banco de dados restaurado com sucesso');
    console.log('📦 Backup usado:', backupSelecionado.name);
    console.log('🔄 Reinicie a aplicação para aplicar as mudanças');
    
  } catch (error) {
    console.error('');
    console.error('💥 FALHA NA RESTAURAÇÃO!');
    console.error('========================');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  executarRestore();
}

module.exports = { listarBackups, restaurarBackup, executarRestore };