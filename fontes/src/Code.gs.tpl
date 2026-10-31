/**
 * AMIGO OCULTO - BACKEND (Google Apps Script)
 *
 * Guarda os dados em um arquivo JSON no seu Google Drive, faz o sorteio no servidor
 * e envia os e-mails pela sua conta Gmail. Veja o LEIA-ME.md para o passo a passo.
 *
 * IMPORTANTE: não abra nem compartilhe o arquivo "amigo-oculto-dados.json" do Drive.
 * Ele guarda o resultado do sorteio. Quem abrir esse arquivo estraga a surpresa.
 */

var NOME_ARQUIVO = 'amigo-oculto-dados.json';

/* ====================== GLUE DO APPS SCRIPT ====================== */

function arquivo_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ARQUIVO_ID');
  if (id) {
    try { return DriveApp.getFileById(id); } catch (e) { /* recria abaixo */ }
  }
  var f = DriveApp.createFile(NOME_ARQUIVO, JSON.stringify(AO.novoEstado()), MimeType.PLAIN_TEXT);
  props.setProperty('ARQUIVO_ID', f.getId());
  return f;
}

function ler_() { return JSON.parse(arquivo_().getBlob().getDataAsString()); }
function gravar_(estado) { arquivo_().setContent(JSON.stringify(estado)); }

function ctx_() {
  return {
    uuid: function () { return Utilities.getUuid(); },
    agora: function () { return new Date().toISOString(); },
    hoje: function () { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'); },
    ms: function () { return Date.now(); }
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Envia os e-mails pela conta Gmail de quem publicou o script. Devolve quantos falharam.
function enviar_(outbox) {
  var falhas = 0;
  (outbox || []).forEach(function (m) {
    try {
      MailApp.sendEmail({ to: m.to, subject: m.subject, htmlBody: m.html, name: 'Amigo Oculto' });
    } catch (e) { falhas++; }
  });
  return falhas;
}

function doGet() {
  return json_({ ok: true, mensagem: 'API do Amigo Oculto no ar.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var req = JSON.parse(e.postData.contents);
    var estado = ler_();
    var r = AO.handle(estado, req, ctx_());
    if (r.mudou) gravar_(estado);
    var falhas = enviar_(r.outbox);
    return json_(r.ok ? { ok: true, data: r.data, emailsFalharam: falhas } : { ok: false, erro: r.erro });
  } catch (err) {
    return json_({ ok: false, erro: 'Erro no servidor: ' + err.message });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* sem trava */ }
  }
}

/* ====================== FUNÇÕES PARA RODAR NO EDITOR ====================== */

// Rode UMA vez no editor para o Google pedir as permissões (Drive e Gmail).
function autorizar() {
  arquivo_();
  Logger.log('Permissões ok. E-mails que ainda dá para enviar hoje: ' + MailApp.getRemainingDailyQuota());
}

// Rode UMA vez para o sorteio acontecer sozinho na data marcada (roda todo dia às 8h).
function instalarSorteioAutomatico() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'verificarSorteioAgendado') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('verificarSorteioAgendado').timeBased().everyDays(1).atHour(8).create();
  Logger.log('Sorteio automático instalado.');
}

// Chamada pelo gatilho diário. Só sorteia se as inscrições já foram encerradas e a data chegou.
function verificarSorteioAgendado() {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var estado = ler_();
    var r = AO.tick(estado, ctx_());
    if (r.mudou) { gravar_(estado); enviar_(r.outbox); }
  } finally {
    lock.releaseLock();
  }
}

/* ====================== NÚCLEO COMPARTILHADO (não edite) ====================== */

/*__CORE__*/
