# 🗺️ Configuração Google Maps API

## Passos para obter e configurar a API Key:

### 1. Criar conta Google Cloud Platform
- Acesse: https://console.cloud.google.com/
- Faça login com sua conta Google
- Aceite os termos de serviço

### 2. Criar um projeto
- Clique em "Select a project" no topo
- Clique em "NEW PROJECT"
- Dê um nome (ex: "GoldPizza Maps")
- Clique em "CREATE"

### 3. Ativar a API
- No menu lateral, vá em "APIs & Services" > "Library"
- Procure por "Maps JavaScript API"
- Clique nela e depois em "ENABLE"

### 4. Criar API Key
- Vá em "APIs & Services" > "Credentials"
- Clique em "CREATE CREDENTIALS" > "API key"
- Copie a chave gerada

### 5. Configurar no projeto
Abra o arquivo `/client/public/index.html` e substitua:
```html
<script async defer 
        src="https://maps.googleapis.com/maps/api/js?key=SUA_API_KEY_AQUI&libraries=geometry">
</script>
```

Por:
```html
<script async defer 
        src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_AQUI&libraries=geometry">
</script>
```

### 6. Configurar restrições (Recomendado)
Para produção, vá em "APIs & Services" > "Credentials":
- Clique na sua API Key
- Em "Application restrictions", selecione "HTTP referrers"
- Adicione: `localhost:3000/*` (desenvolvimento)
- Adicione: `seudominio.com/*` (produção)

### 7. Billing (Cobrança)
- Google Maps tem quota gratuita de $200/mês
- Para um app de delivery pequeno, provavelmente será gratuito
- Configure billing para evitar bloqueios: https://console.cloud.google.com/billing

## ⚠️ Importante:
- **NUNCA** comite a API Key no repositório
- Para produção, use variáveis de ambiente
- Configure restrições de segurança
- Monitore o uso na console do Google Cloud

## 🧪 Testando:
1. Substitua a API Key no arquivo
2. Acesse http://localhost:3000
3. Faça login como motoboy
4. Vá na aba "Mapa"
5. Permita acesso à localização quando solicitado
6. O mapa deve carregar com sua localização e marcadores das entregas

## 📱 Funcionalidades do Mapa:
- 🏍️ **Marcador azul**: Sua localização (ícone da moto)
- 🟢 **Marcadores verdes**: Entregas pendentes
- 🟠 **Marcadores laranja**: Entregas em andamento
- 📍 **Clique nos marcadores**: Ver detalhes da entrega
- 🧭 **Botões de navegação**: Google Maps e Waze
- 📞 **Botão ligar**: Para cliente (se disponível)
- 🎯 **Auto-zoom**: Mostra todos os marcadores na tela

## 🔧 Troubleshooting:
- **Mapa não carrega**: Verifique a API Key
- **Erro de permissão**: Configure as restrições da API
- **Marcadores não aparecem**: Verifique os logs do console
- **Localização não funciona**: Permita acesso GPS no navegador