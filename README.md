# Amigo oculto de Natal: como colocar no ar

São 2 arquivos:

- **index.html**: o app (abertura, cadastro, área de cada pessoa, brincadeiras e painel do organizador).
- **Code.gs**: o servidor. Guarda os cadastros, faz o sorteio em segredo e manda os e-mails pelo seu Gmail.

Sem o servidor o app abre em **modo demonstração** (dados só no seu navegador, e-mails simulados). Serve para testar tudo antes.

## 1. Publicar o servidor (uns 5 minutos)

1. Entre em https://script.google.com com a conta Gmail que vai enviar os e-mails e clique em **Novo projeto**.
2. Apague o conteúdo do editor e cole **todo** o `Code.gs`. Salve.
3. No topo, escolha a função **autorizar** e clique em **Executar**. O Google pede permissão para Drive e Gmail. Aceite (em "Avançado" > "Acessar projeto").
4. Clique em **Implantar > Nova implantação > Tipo: App da Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie o endereço que termina em `/exec`.

## 2. Publicar o app

1. Abra o `index.html` em um editor de texto e, no topo do script, cole o endereço no `API_URL`:
   `var API_URL = "https://script.google.com/macros/s/.../exec";`
2. Publique o arquivo onde você já publica seus outros apps (por exemplo GitHub Pages).
3. Abra `https://seu-endereco/index.html?admin`, crie a **senha do organizador** e, em **Configurações**, clique em **Usar o endereço desta página** e salve. Esse endereço vai nos links dos e-mails.

## 3. O fluxo na prática

1. Mande o endereço do app para a família (WhatsApp). Cada um se cadastra: foto, nome, aniversário, telefone e e-mail. Ao escolher a foto aparecem molduras de Natal (gorro de Papai Noel, pisca-pisca, laço de presente e neve). Características e presentes são opcionais e podem ser editados depois pelo link pessoal. O último passo é um termo de compromisso opcional, em que a pessoa assina ou faz um desenho com o dedo; as rubricas aparecem na aba Festa.
2. Quando todos entrarem: **Painel > Encerrar inscrições e avisar todos**. Cada um recebe e-mail com a data do sorteio e o link pessoal. Em **Participantes** você também envia o link pelo WhatsApp.
3. **Sorteio**: botão **Sortear agora**, ou automático na data marcada. Para o automático, rode uma vez a função `instalarSorteioAutomatico` no editor do Apps Script.
4. Depois do sorteio todos recebem e-mail. Cada um abre a etiqueta e vê o amigo, as características e os presentes (até 3, com foto, tamanho e link).
5. Brincadeiras: mural de pistas anônimas, pista de despiste, ranking de detetives e, se você ativar no Painel, o inimigo oculto. Na festa, o **modo roubo de presentes** na aba Festa.

6. **Revelação (depois da festa):** no Painel, etapa "A festa", ligue **Liberar a página de revelação**. Aparece o botão "Ver a revelação" na abertura e o link `seu-endereco/index.html?revelacao` (use **Copiar link da revelação**). A página mostra todos os pares em cartas que viram (e os inimigos ocultos, se ativados), com opção de revelar um a um ou todos de uma vez. Enquanto estiver desligado, ninguém vê nada; a página só mostra nome e foto. Não usa Google Sheets: tudo continua no mesmo arquivo do Drive.

## Como o sorteio garante o segredo

- Roda no servidor, de forma aleatória: ninguém tira a si mesmo e cada pessoa é tirada exatamente uma vez. Não existe nenhuma opção para escolher nomes, nem para o organizador.
- O app só entrega a cada pessoa o próprio amigo, pelo link pessoal. O painel do organizador não mostra quem tirou quem.
- **Atenção:** o resultado fica no arquivo `amigo-oculto-dados.json` no seu Google Drive. Não abra nem compartilhe esse arquivo.
- Quem perdeu o link usa **Já me cadastrei** na abertura e recebe de novo por e-mail.

## Limites bom saber

- Conta Gmail comum envia até uns 100 e-mails por dia. Para a família é suficiente.
- Fotos são reduzidas automaticamente no celular antes de enviar.
- As características são escolhidas pela própria pessoa olhando a foto, não detectadas automaticamente.
- Se mudar o `Code.gs`, faça **Implantar > Gerenciar implantações > Editar > Nova versão** para valer.
