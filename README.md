# 🍕 GoldPizza - Sistema de Gestão Multi-Pizzaria

Sistema completo para gerenciamento de múltiplas pizzarias com controle de pedidos, produção e entregas em tempo real.

## 🚀 Funcionalidades

### 👑 Admin Master
- Gerenciamento de múltiplas pizzarias
- Controle de usuários e permissões
- Relatórios consolidados
- Dashboard com estatísticas gerais

### 🏪 Por Pizzaria
- **Atendentes**: Criação e gestão de pedidos
- **Cozinha**: Controle de produção em tempo real
- **Motoboys**: Gestão de entregas e comissões
- **Clientes**: Interface para pedidos online

### 📱 Recursos Técnicos
- Interface responsiva (desktop/mobile)
- Atualizações em tempo real (Socket.IO)
- Sistema multi-tenant com isolamento de dados
- Autenticação JWT com níveis de acesso
- Integração com Google Maps para entregas

## 🛠️ Tecnologias

- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React + Tailwind CSS
- **Real-time**: Socket.IO
- **Autenticação**: JWT
- **UI**: Lucide React Icons

## 🏃‍♂️ Como Executar

### Pré-requisitos
- Node.js (v16+)
- MongoDB
- NPM ou Yarn

### Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repo>
cd GoldPizza
```

2. **Instale as dependências**
```bash
npm run install-all
```

3. **Configure o ambiente**
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

4. **Inicie o MongoDB**
```bash
# Via Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Ou via instalação local
mongod
```

5. **Popule o banco com dados de exemplo**
```bash
npm run seed
```

6. **Inicie o sistema**
```bash
npm run dev
```

O sistema estará disponível em:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 👥 Usuários de Teste

Após executar o seed, você pode usar estes usuários:

| Papel | Email | Senha |
|-------|-------|-------|
| Admin | admin@goldpizza.com | admin123 |
| Atendente | atendente@pizzagold.com | atendente123 |
| Cozinha | cozinha@pizzagold.com | cozinha123 |
| Motoboy | motoboy@pizzagold.com | motoboy123 |

## 📋 Fluxo de Pedidos

1. **Recebimento**: Atendente/Site/iFood cria pedido
2. **Cozinha**: Recebido → Preparando → Pronto
3. **Entrega**: Motoboy aceita → Saiu para entrega → Entregue
4. **Pagamento**: Confirmação automática na entrega

## 🏗️ Estrutura do Projeto

```
GoldPizza/
├── server/                 # Backend Node.js
│   ├── models/            # Modelos MongoDB
│   ├── routes/            # Rotas da API
│   ├── middleware/        # Middlewares (auth, etc)
│   ├── controllers/       # Controladores
│   ├── scripts/           # Scripts utilitários
│   └── server.js          # Servidor principal
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas principais
│   │   ├── context/       # Context API
│   │   ├── services/      # Serviços (API)
│   │   └── utils/         # Utilitários
│   └── public/
└── package.json
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia frontend e backend em modo desenvolvimento
- `npm run server` - Inicia apenas o backend
- `npm run client` - Inicia apenas o frontend
- `npm run seed` - Popula banco com dados de teste
- `npm run build` - Build de produção do frontend

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário

### Pizzarias
- `GET /api/pizzarias` - Listar pizzarias
- `POST /api/pizzarias` - Criar pizzaria
- `PUT /api/pizzarias/:id` - Atualizar pizzaria

### Pedidos
- `GET /api/pedidos/pizzaria/:id` - Pedidos da pizzaria
- `POST /api/pedidos` - Criar pedido
- `PATCH /api/pedidos/:id/status` - Atualizar status

### Usuários
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário

## 🔒 Segurança

- Autenticação JWT com expiração
- Senhas hasheadas com bcrypt
- Middleware de autorização por role
- Isolamento de dados por pizzaria
- Validação de entrada em todas as rotas

## 🌟 Recursos Futuros

- [ ] Integração com WhatsApp Business
- [ ] Sistema de cupons e promoções
- [ ] Relatórios avançados com gráficos
- [ ] App mobile nativo
- [ ] Integração com sistemas de pagamento
- [ ] Cardápio digital personalizado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

Desenvolvido com ❤️ para revolucionar a gestão de pizzarias!
