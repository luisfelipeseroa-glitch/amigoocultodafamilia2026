/* ===== NÚCLEO DO AMIGO OCULTO =====
   Este mesmo código roda no servidor (Google Apps Script) e no modo demonstração do navegador.
   Toda a regra de segredo e de sorteio fica aqui: o app nunca recebe o que não deve ver. */
var AO = (function () {
  'use strict';

  var MAX_PESSOAS = 60;
  var NOTA_FOTO = '*Se vc não estava nessa foto, não fique triste, iremos tirar uma nova este natal e tenho certeza de que vc estará conosco!';
  var MAX_PISTAS = 5;

  var OPCOES = {
    cabeloCor: ['Preto', 'Castanho', 'Loiro', 'Ruivo', 'Grisalho', 'Branco', 'Careca', 'Colorido'],
    cabeloTipo: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'],
    cabeloTam: ['Raspado', 'Curto', 'Médio', 'Longo'],
    olhos: ['Pretos', 'Castanhos', 'Mel', 'Verdes', 'Azuis'],
    oculos: ['Usa óculos', 'Não usa óculos'],
    barba: ['Barba', 'Bigode', 'Sem barba'],
    altura: ['Baixinho(a)', 'Mediano(a)', 'Alto(a)'],
    estilo: ['Clássico', 'Esportivo', 'Descolado', 'Despojado', 'Elegante']
  };

  var MISSOES = [
    'Faça um elogio sincero ao seu inimigo oculto, sem que ele desconfie de nada.',
    'Descubra a música favorita do seu inimigo oculto e cante o refrão baixinho perto dele.',
    'Peça uma foto com seu inimigo oculto e faça uma pose bem dramática.',
    'Brinde com seu inimigo oculto e invente um motivo absurdo para o brinde.',
    'Chame seu inimigo oculto de um apelido carinhoso e novo durante a noite inteira.',
    'Descubra o prato favorito da ceia do seu inimigo oculto e diga que ele merece a última porção.',
    'Dê um abraço apertado e inesperado no seu inimigo oculto.',
    'Conte uma história engraçada sobre seu inimigo oculto, sem dizer que é sobre ele.',
    'Pergunte ao seu inimigo oculto o que ele quer ganhar de presente e anote com ar de detetive.',
    'Faça seu inimigo oculto rir de verdade pelo menos uma vez antes da meia-noite.',
    'Troque de lugar à mesa para ficar ao lado do seu inimigo oculto e puxe conversa.',
    'Imite o jeito de rir do seu inimigo oculto e veja se ele percebe.'
  ];

  /* ---------- utilidades ---------- */
  function erro(msg) { var e = new Error(msg); e.amigavel = true; throw e; }

  function str(v, max) {
    v = (v === null || v === undefined) ? '' : String(v);
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    return v.length > max ? v.slice(0, max) : v;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  function dataOk(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    var p = d.split('-').map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2] && p[0] >= 1900;
  }

  function imgOk(d, max) {
    return typeof d === 'string' && d.length <= max && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(d);
  }

  function urlOk(u) { return /^https?:\/\/[^\s]+$/i.test(u); }

  function fmtBR(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fmtDM(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1]; }

  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function diaSemana(d) {
    var p = d.split('-').map(Number);
    return DIAS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  }

  function embaralhar(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- estado inicial ---------- */
  function novoEstado() {
    return {
      v: 1,
      config: {
        titulo: 'Amigo oculto de Natal 2026',
        saudacao: 'Ho ho ho! Este ano o amigo oculto da família tem site próprio. Cadastre-se em um minuto e espere o sorteio.',
        organizador: 'Luis',
        dataSorteio: '2026-12-01',
        evento: {
          data: '2026-12-24',
          hora: '20:00',
          local: 'Casa da Vó Victória (Tia Bebé)',
          endereco: 'Rua Guilherme de Almeida, 565, apto 102 - Recreio dos Bandeirantes, Rio de Janeiro - RJ'
        },
        valorSugerido: '',
        capa: '',
        notaFoto: NOTA_FOTO,
        appUrl: '',
        pin: '',
        fase: 'inscricoes',
        modos: { inimigo: false, roubo: false }
      },
      pessoas: {},
      ordem: [],
      sorteio: null,
      pistas: [],
      palpites: [],
      revelado: false,
      revelacao: false,
      roubo: null,
      seg: { falhas: 0, ate: 0 }
    };
  }

  /* ---------- visões (o que cada pessoa pode ver) ---------- */
  function pub(p) { return { id: p.id, nome: p.nome, foto: p.foto }; }

  function frasesTracos(t) {
    t = t || {};
    var f = [], cab = [];
    if (t.cabeloCor === 'Careca') {
      f.push('É careca');
    } else {
      if (t.cabeloCor) cab.push(t.cabeloCor.toLowerCase());
      if (t.cabeloTipo) cab.push(t.cabeloTipo.toLowerCase());
      if (t.cabeloTam) cab.push(t.cabeloTam.toLowerCase());
      if (cab.length) f.push('Cabelo ' + cab.join(', '));
    }
    if (t.olhos) f.push('Olhos ' + t.olhos.toLowerCase());
    if (t.oculos) f.push(t.oculos);
    if (t.barba) f.push(t.barba === 'Sem barba' ? 'Não tem barba' : 'Tem ' + t.barba.toLowerCase());
    if (t.altura) f.push('É ' + t.altura.toLowerCase());
    if (t.estilo) f.push('Estilo ' + t.estilo.toLowerCase());
    if (t.extra) f.push(t.extra);
    return f;
  }

  // "Cabelo preto", "olhos verdes" e "usa óculos" viram: Cabelo preto, olhos verdes e usa óculos.
  function juntarFrases(f) {
    var l = f.map(function (x, i) { return i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1); });
    if (l.length <= 1) return l.join('');
    return l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
  }

  function configPublica(s) {
    var c = s.config;
    return {
      titulo: c.titulo, saudacao: c.saudacao, organizador: c.organizador,
      dataSorteio: c.dataSorteio, evento: c.evento, valorSugerido: c.valorSugerido,
      capa: c.capa, notaFoto: c.notaFoto === undefined ? NOTA_FOTO : c.notaFoto, fase: c.fase, modos: c.modos, revelado: s.revelado, revelacao: !!(s.revelacao && s.sorteio),
      total: s.ordem.length
    };
  }

  function visaoAmigo(p) {
    return {
      id: p.id, nome: p.nome, foto: p.foto, nascimento: p.nascimento,
      tracos: p.tracos, frases: frasesTracos(p.tracos), presentes: p.presentes
    };
  }

  function visaoPropria(p) {
    return {
      id: p.id, token: p.token, nome: p.nome, foto: p.foto, nascimento: p.nascimento,
      telefone: p.telefone, email: p.email, tracos: p.tracos, presentes: p.presentes,
      assinatura: p.assinatura || ''
    };
  }

  function porToken(s, token) {
    if (!token) return null;
    for (var i = 0; i < s.ordem.length; i++) {
      var p = s.pessoas[s.ordem[i]];
      if (p && p.token === token) return p;
    }
    return null;
  }

  function exigirPessoa(s, req) {
    var p = porToken(s, str(req.token, 80));
    if (!p) erro('Link inválido ou expirado. Peça um novo link na tela inicial.');
    return p;
  }

  /* ---------- validação de dados da pessoa ---------- */
  function limparTracos(t) {
    var out = {};
    if (!t || typeof t !== 'object') return out;
    Object.keys(OPCOES).forEach(function (k) {
      if (t[k] && OPCOES[k].indexOf(t[k]) >= 0) out[k] = t[k];
    });
    if (t.extra) out.extra = str(t.extra, 80);
    return out;
  }

  // A rubrica é opcional: um desenho pequeno (PNG ou JPEG) feito no próprio app.
  function limparAssinatura(a) {
    if (!a) return '';
    if (!imgOk(a, 60000)) erro('A rubrica ficou grande demais. Limpe e desenhe de novo, com traços simples.');
    return a;
  }

  function limparPresentes(lista) {
    var out = [];
    if (!Array.isArray(lista)) return out;
    for (var i = 0; i < lista.length && out.length < 3; i++) {
      var g = lista[i] || {};
      var nome = str(g.nome, 60);
      if (!nome) continue;
      var item = { nome: nome, foto: '', tamanho: str(g.tamanho, 20), link: '' };
      if (g.foto) {
        if (!imgOk(g.foto, 90000)) erro('A foto do presente "' + nome + '" ficou grande demais. Tente outra imagem.');
        item.foto = g.foto;
      }
      var link = str(g.link, 300);
      if (link) {
        if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
        if (!urlOk(link)) erro('O link do presente "' + nome + '" não parece válido.');
        item.link = link;
      }
      out.push(item);
    }
    return out;
  }

  function validarContato(req, s, ignorarId) {
    var nome = str(req.nome, 60);
    if (nome.length < 2) erro('Digite seu nome.');
    var nasc = str(req.nascimento, 10);
    if (!dataOk(nasc)) erro('Informe uma data de aniversário válida.');
    var fone = str(req.telefone, 25);
    if (fone.replace(/\D/g, '').length < 8) erro('Informe um telefone com DDD.');
    if (!imgOk(req.foto, 60000)) erro('Escolha uma foto sua.');
    return { nome: nome, nascimento: nasc, telefone: fone, foto: req.foto };
  }

  /* ---------- e-mails ---------- */
  function linkPessoal(s, p, baseUrl) {
    var base = s.config.appUrl || baseUrl || '';
    if (!base) return '';
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 't=' + p.token;
  }

  function emailHtml(titulo, paragrafos, botao, url, rodape) {
    var h = '<div style="font-family:Arial,Helvetica,sans-serif;background:#F6EFD9;padding:24px">' +
      '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">' +
      '<div style="background:#1F3A2B;color:#ffffff;padding:22px 24px">' +
      '<div style="font-size:22px;font-weight:bold">' + esc(titulo) + '</div></div>' +
      '<div style="padding:22px 24px;color:#1b2440;font-size:15px;line-height:1.55">';
    paragrafos.forEach(function (t) { h += '<p style="margin:0 0 14px">' + t + '</p>'; });
    if (botao && url) {
      h += '<p style="margin:22px 0"><a href="' + esc(url) + '" style="background:#D2693A;color:#ffffff;text-decoration:none;' +
        'padding:13px 22px;border-radius:999px;font-weight:bold;display:inline-block">' + esc(botao) + '</a></p>';
      h += '<p style="margin:0 0 14px;font-size:13px;color:#5b6483">Este link é só seu. Não encaminhe para ninguém, ou a surpresa vai embora.</p>';
    }
    h += '<p style="margin:18px 0 0;font-size:13px;color:#5b6483">' + esc(rodape || '') + '</p></div></div></div>';
    return h;
  }

  function dadosFesta(s) {
    var e = s.config.evento;
    return diaSemana(e.data) + ', ' + fmtBR(e.data) + ' às ' + e.hora + ' · ' + e.local + ' · ' + e.endereco;
  }

  function emailCadastro(s, p, baseUrl) {
    var url = linkPessoal(s, p, baseUrl);
    return {
      to: p.email,
      subject: 'Seu cadastro no ' + s.config.titulo + ' foi recebido',
      html: emailHtml(s.config.titulo, [
        'Oi, ' + esc(p.nome.split(' ')[0]) + '! Seu cadastro está feito.',
        'Agora é só esperar todo mundo entrar. O sorteio será em <b>' + esc(fmtBR(s.config.dataSorteio)) + '</b> e você receberá outro e-mail avisando.',
        'Enquanto isso, use o seu link pessoal para indicar até 3 presentes que você gostaria de ganhar e completar suas características.',
        '<b>A festa:</b> ' + esc(dadosFesta(s))
      ], 'Abrir meu espaço', url, 'Enviado por ' + s.config.organizador)
    };
  }

  function emailAviso(s, p) {
    var url = linkPessoal(s, p);
    return {
      to: p.email,
      subject: 'Inscrições encerradas: o sorteio será em ' + fmtBR(s.config.dataSorteio),
      html: emailHtml(s.config.titulo, [
        'Oi, ' + esc(p.nome.split(' ')[0]) + '! Todo mundo já se cadastrou e as inscrições foram encerradas.',
        'O sorteio acontece em <b>' + esc(fmtBR(s.config.dataSorteio)) + '</b>. Até lá, confira seus 3 presentes e suas características no seu link pessoal. Quem tirar você vai usar essas informações.',
        '<b>A festa:</b> ' + esc(dadosFesta(s))
      ], 'Abrir meu espaço', url, 'Enviado por ' + s.config.organizador)
    };
  }

  function emailSorteio(s, p) {
    var url = linkPessoal(s, p);
    return {
      to: p.email,
      subject: 'O sorteio foi feito! Descubra quem você tirou',
      html: emailHtml(s.config.titulo, [
        'Oi, ' + esc(p.nome.split(' ')[0]) + '! O sorteio foi realizado.',
        'Abra o seu link pessoal para descobrir quem você tirou, ver as características e a lista de presentes. Guarde segredo até a noite de Natal.',
        '<b>A festa:</b> ' + esc(dadosFesta(s))
      ], 'Descobrir meu amigo oculto', url, 'Enviado por ' + s.config.organizador)
    };
  }

  function emailLink(s, p, baseUrl) {
    var url = linkPessoal(s, p, baseUrl);
    return {
      to: p.email,
      subject: 'Seu link pessoal: ' + s.config.titulo,
      html: emailHtml(s.config.titulo, [
        'Oi, ' + esc(p.nome.split(' ')[0]) + '! Aqui está o seu link pessoal para entrar de novo.'
      ], 'Abrir meu espaço', url, 'Enviado por ' + s.config.organizador)
    };
  }

  /* ---------- sorteio ---------- */
  // Sorteia uma permutação sem ponto fixo (ninguém tira a si mesmo) e sem repetição
  // (cada pessoa é tirada exatamente uma vez). "proibidos" bloqueia pares específicos.
  function derrangement(ids, proibidos) {
    for (var tent = 0; tent < 20000; tent++) {
      var perm = embaralhar(ids);
      var ok = true;
      for (var i = 0; i < ids.length; i++) {
        if (ids[i] === perm[i] || (proibidos && proibidos[ids[i]] && proibidos[ids[i]][perm[i]])) { ok = false; break; }
      }
      if (ok) {
        var m = {};
        for (var k = 0; k < ids.length; k++) m[ids[k]] = perm[k];
        return m;
      }
    }
    return null;
  }

  function validarSorteio(ids, m) {
    var vistos = {};
    ids.forEach(function (id) {
      var alvo = m[id];
      if (!alvo || alvo === id) erro('Falha de segurança no sorteio. Nada foi salvo.');
      if (vistos[alvo]) erro('Falha de segurança no sorteio. Nada foi salvo.');
      vistos[alvo] = true;
    });
    if (Object.keys(vistos).length !== ids.length) erro('Falha de segurança no sorteio. Nada foi salvo.');
  }

  function sortearInimigo(s) {
    var ids = s.ordem.slice();
    var proib = {};
    ids.forEach(function (id) { proib[id] = {}; proib[id][s.sorteio.amigo[id]] = true; });
    var m = derrangement(ids, proib);
    if (!m) erro('Não foi possível sortear o inimigo oculto diferente do amigo oculto com esses participantes.');
    validarSorteio(ids, m);
    var missoes = embaralhar(MISSOES);
    var out = {};
    ids.forEach(function (id, i) { out[id] = { alvo: m[id], missao: missoes[i % missoes.length] }; });
    s.sorteio.inimigo = out;
  }

  function fazerSorteio(s, ctx) {
    var ids = s.ordem.slice();
    if (ids.length < 3) erro('São necessários pelo menos 3 participantes para sortear.');
    var m = derrangement(ids, null);
    if (!m) erro('Não foi possível sortear. Tente novamente.');
    validarSorteio(ids, m);
    s.sorteio = { amigo: m, inimigo: null, feitoEm: ctx.agora() };
    s.config.fase = 'sorteado';
    if (s.config.modos.inimigo) sortearInimigo(s);
  }

  /* ---------- mural de pistas ---------- */
  function muralVista(s, eu) {
    var porId = function (id) { return s.pessoas[id] ? pub(s.pessoas[id]) : null; };
    return s.pistas.filter(function (p) { return p.alvoId !== eu.id; }).map(function (p) {
      var palp = null;
      for (var i = 0; i < s.palpites.length; i++) {
        if (s.palpites[i].pessoaId === eu.id && s.palpites[i].pistaId === p.id) palp = s.palpites[i];
      }
      var v = {
        id: p.id, texto: p.texto, minha: p.autorId === eu.id,
        suspeitos: p.suspeitos.map(porId).filter(Boolean),
        palpite: palp ? { escolhaId: palp.escolhaId, acertou: palp.acertou } : null
      };
      if (v.minha || s.revelado) { v.autor = porId(p.autorId); v.alvo = porId(p.alvoId); }
      return v;
    });
  }

  function ranking(s) {
    var pontos = {};
    s.palpites.forEach(function (x) { if (x.acertou) pontos[x.pessoaId] = (pontos[x.pessoaId] || 0) + 1; });
    return Object.keys(pontos).map(function (id) {
      return s.pessoas[id] ? { pessoa: pub(s.pessoas[id]), pontos: pontos[id] } : null;
    }).filter(Boolean).sort(function (a, b) { return b.pontos - a.pontos; }).slice(0, 10);
  }

  /* ---------- roubo de presentes ---------- */
  function rouboAvancar(r) {
    r.proibido = null;
    if (r.fila.length) { r.vezId = r.fila.shift(); } else { r.vezId = null; r.fim = true; }
  }

  function rouboIniciar(s) {
    var ids = embaralhar(s.ordem);
    if (ids.length < 2) erro('É preciso ter pelo menos 2 participantes.');
    var presentes = [];
    for (var i = 1; i <= ids.length; i++) presentes.push({ num: i, dono: null, descricao: '', roubos: 0 });
    s.roubo = { ordem: ids.slice(), fila: ids.slice(1), vezId: ids[0], presentes: presentes, log: [], fim: false, proibido: null, maxRoubos: 2 };
  }

  function rouboAgir(s, req) {
    var r = s.roubo;
    if (!r || r.fim) erro('O jogo não está em andamento.');
    var num = parseInt(req.num, 10);
    var pr = null;
    r.presentes.forEach(function (x) { if (x.num === num) pr = x; });
    if (!pr) erro('Presente não encontrado.');
    var vez = r.vezId;
    var nomeVez = s.pessoas[vez] ? s.pessoas[vez].nome : '?';
    if (req.tipo === 'abrir') {
      if (pr.dono) erro('Esse presente já foi aberto.');
      pr.dono = vez;
      pr.descricao = str(req.descricao, 60) || 'Presente ' + num;
      r.log.unshift(nomeVez + ' abriu o presente ' + num + ': ' + pr.descricao);
      rouboAvancar(r);
    } else if (req.tipo === 'roubar') {
      if (!pr.dono) erro('Esse presente ainda está fechado.');
      if (pr.dono === vez) erro('Esse presente já é seu.');
      if (pr.roubos >= r.maxRoubos) erro('Esse presente já foi roubado ' + r.maxRoubos + ' vezes e está travado.');
      if (r.proibido === pr.num) erro('Não vale roubar de volta na mesma jogada.');
      var vitima = pr.dono;
      pr.dono = vez;
      pr.roubos += 1;
      r.log.unshift(nomeVez + ' roubou o presente ' + num + ' (' + pr.descricao + ') de ' + (s.pessoas[vitima] ? s.pessoas[vitima].nome : '?'));
      r.vezId = vitima;
      r.proibido = pr.num;
    } else {
      erro('Ação inválida.');
    }
  }

  /* ---------- ações ---------- */
  var H = {};

  H.publico = function (s) {
    return {
      config: configPublica(s),
      pessoas: s.ordem.map(function (id) { return { id: id, nome: s.pessoas[id].nome.split(' ')[0], foto: s.pessoas[id].foto }; })
    };
  };

  H.cadastrar = function (s, req, ctx, out) {
    if (s.config.fase !== 'inscricoes') erro('As inscrições estão encerradas. Fale com o organizador.');
    if (s.ordem.length >= MAX_PESSOAS) erro('O limite de participantes foi atingido.');
    var base = validarContato(req, s);
    var email = str(req.email, 120).toLowerCase();
    if (!emailOk(email)) erro('Informe um e-mail válido.');
    for (var i = 0; i < s.ordem.length; i++) {
      if (s.pessoas[s.ordem[i]].email === email) erro('Este e-mail já está cadastrado. Use "Já me cadastrei" para receber seu link.');
    }
    var id = 'p' + ctx.uuid().replace(/-/g, '').slice(0, 10);
    var p = {
      id: id, token: ctx.uuid().replace(/-/g, ''), nome: base.nome, foto: base.foto,
      nascimento: base.nascimento, telefone: base.telefone, email: email,
      tracos: limparTracos(req.tracos), presentes: limparPresentes(req.presentes),
      assinatura: limparAssinatura(req.assinatura), criadoEm: ctx.agora()
    };
    s.pessoas[id] = p;
    s.ordem.push(id);
    out.mudou = true;
    var baseUrl = str(req.baseUrl, 300);
    if (!urlOk(baseUrl)) baseUrl = '';
    out.outbox.push(emailCadastro(s, p, baseUrl));
    return { token: p.token };
  };

  H.reenviarLink = function (s, req, ctx, out) {
    var email = str(req.email, 120).toLowerCase();
    if (!emailOk(email)) erro('Informe o e-mail que você usou no cadastro.');
    for (var i = 0; i < s.ordem.length; i++) {
      var p = s.pessoas[s.ordem[i]];
      if (p.email === email) { out.outbox.push(emailLink(s, p)); break; }
    }
    return { enviado: true };
  };

  H.eu = function (s, req) {
    var p = exigirPessoa(s, req);
    var d = {
      eu: visaoPropria(p),
      config: configPublica(s),
      participantes: s.ordem.map(function (id) {
        var x = s.pessoas[id];
        return { id: id, nome: x.nome, foto: x.foto, nascimento: x.nascimento, presentes: x.presentes.length, assinatura: x.assinatura || '' };
      }),
      amigo: null, inimigo: null, ranking: [], minhasPistas: 0
    };
    if (s.sorteio && s.sorteio.amigo[p.id] && s.pessoas[s.sorteio.amigo[p.id]]) {
      d.amigo = visaoAmigo(s.pessoas[s.sorteio.amigo[p.id]]);
      d.ranking = ranking(s);
      d.minhasPistas = s.pistas.filter(function (x) { return x.autorId === p.id; }).length;
      d.maxPistas = MAX_PISTAS;
    }
    if (s.sorteio && s.sorteio.inimigo && s.config.modos.inimigo && s.sorteio.inimigo[p.id]) {
      var im = s.sorteio.inimigo[p.id];
      if (s.pessoas[im.alvo]) d.inimigo = { pessoa: pub(s.pessoas[im.alvo]), missao: im.missao };
    }
    return d;
  };

  H.salvarPerfil = function (s, req, ctx, out) {
    var p = exigirPessoa(s, req);
    if (req.perfil) {
      var b = validarContato({
        nome: req.perfil.nome, nascimento: req.perfil.nascimento,
        telefone: req.perfil.telefone, foto: req.perfil.foto || p.foto
      }, s);
      p.nome = b.nome; p.nascimento = b.nascimento; p.telefone = b.telefone; p.foto = b.foto;
      p.tracos = limparTracos(req.perfil.tracos);
      if (req.perfil.assinatura !== undefined) p.assinatura = limparAssinatura(req.perfil.assinatura);
    }
    if (req.presentes) p.presentes = limparPresentes(req.presentes);
    out.mudou = true;
    return { salvo: true };
  };

  H.sugerirDespiste = function (s, req) {
    var p = exigirPessoa(s, req);
    if (!s.sorteio) erro('O sorteio ainda não foi feito.');
    var meuAmigo = s.sorteio.amigo[p.id];
    var cand = s.ordem.filter(function (id) {
      return id !== p.id && id !== meuAmigo && frasesTracos(s.pessoas[id].tracos).length >= 2;
    });
    if (!cand.length) erro('Ainda faltam características cadastradas de outros participantes para montar um despiste.');
    var alvo = s.pessoas[cand[Math.floor(Math.random() * cand.length)]];
    var f = embaralhar(frasesTracos(alvo.tracos)).slice(0, 3);
    return { alvoId: alvo.id, nome: alvo.nome, texto: juntarFrases(f) };
  };

  H.postarPista = function (s, req, ctx, out) {
    var p = exigirPessoa(s, req);
    if (!s.sorteio) erro('O sorteio ainda não foi feito.');
    var texto = str(req.texto, 140);
    if (texto.length < 8) erro('Escreva uma pista com pelo menos 8 letras.');
    var minhas = s.pistas.filter(function (x) { return x.autorId === p.id; }).length;
    if (minhas >= MAX_PISTAS) erro('Você já postou ' + MAX_PISTAS + ' pistas.');
    var meuAmigo = s.sorteio.amigo[p.id];
    var alvoId = meuAmigo;
    if (req.despiste) {
      alvoId = str(req.alvoId, 40);
      if (!s.pessoas[alvoId] || alvoId === p.id || alvoId === meuAmigo) erro('Pessoa inválida para o despiste.');
    }
    var outros = embaralhar(s.ordem.filter(function (id) { return id !== p.id && id !== alvoId; })).slice(0, 2);
    var suspeitos = embaralhar([p.id].concat(outros));
    s.pistas.push({
      id: 'k' + ctx.uuid().replace(/-/g, '').slice(0, 8), autorId: p.id, alvoId: alvoId,
      texto: texto, suspeitos: suspeitos, criadoEm: ctx.agora()
    });
    out.mudou = true;
    return { postado: true };
  };

  H.mural = function (s, req) {
    var p = exigirPessoa(s, req);
    if (!s.sorteio) erro('O mural abre depois do sorteio.');
    return { pistas: muralVista(s, p), ranking: ranking(s), revelado: s.revelado };
  };

  H.palpitar = function (s, req, ctx, out) {
    var p = exigirPessoa(s, req);
    var pista = null;
    s.pistas.forEach(function (x) { if (x.id === req.pistaId) pista = x; });
    if (!pista) erro('Pista não encontrada.');
    if (pista.autorId === p.id || pista.alvoId === p.id) erro('Você não pode palpitar nessa pista.');
    var ja = s.palpites.filter(function (x) { return x.pessoaId === p.id && x.pistaId === pista.id; });
    if (ja.length) erro('Você já deu seu palpite nessa pista.');
    var escolha = str(req.escolhaId, 40);
    if (!s.pessoas[escolha]) erro('Escolha uma pessoa.');
    var acertou = escolha === pista.alvoId;
    s.palpites.push({ pessoaId: p.id, pistaId: pista.id, escolhaId: escolha, acertou: acertou });
    out.mudou = true;
    return { acertou: acertou };
  };

  /* ----- organizador ----- */
  function exigirAdmin(s, req, ctx) {
    var agoraMs = ctx.ms();
    if (s.seg.ate && agoraMs < s.seg.ate) erro('Muitas tentativas erradas. Aguarde alguns minutos.');
    if (!s.config.pin) erro('Crie a senha do organizador primeiro.');
    if (req.pin !== s.config.pin) {
      s.seg.falhas += 1;
      if (s.seg.falhas >= 5) { s.seg.ate = agoraMs + 5 * 60 * 1000; s.seg.falhas = 0; }
      var e = new Error('Senha do organizador incorreta.'); e.amigavel = true; e.gravar = true; throw e;
    }
    s.seg.falhas = 0; s.seg.ate = 0;
  }

  H.adminEstado = function (s) { return { temPin: !!s.config.pin }; };

  H.adminCriarPin = function (s, req, ctx, out) {
    if (s.config.pin) erro('A senha do organizador já foi criada.');
    var pin = str(req.pin, 60);
    if (pin.length < 6) erro('Use uma senha com pelo menos 6 caracteres.');
    s.config.pin = pin;
    out.mudou = true;
    return { ok: true };
  };

  H.adminDados = function (s, req, ctx) {
    exigirAdmin(s, req, ctx);
    var pessoas = s.ordem.map(function (id) {
      var p = s.pessoas[id];
      return {
        id: id, nome: p.nome, foto: p.foto, email: p.email, telefone: p.telefone, nascimento: p.nascimento,
        presentes: p.presentes.length, tracos: frasesTracos(p.tracos).length, link: linkPessoal(s, p),
        assinou: !!p.assinatura
      };
    });
    var cfg = JSON.parse(JSON.stringify(s.config));
    delete cfg.pin;
    cfg.notaFoto = configPublica(s).notaFoto;
    return {
      config: cfg, pessoas: pessoas, sorteado: !!s.sorteio, temInimigo: !!(s.sorteio && s.sorteio.inimigo), revelado: s.revelado, revelacao: !!s.revelacao,
      pistas: s.pistas.length, palpites: s.palpites.length, roubo: s.roubo
    };
  };

  H.adminConfig = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    var c = req.config || {};
    var cf = s.config;
    if (c.titulo !== undefined) cf.titulo = str(c.titulo, 80) || cf.titulo;
    if (c.saudacao !== undefined) cf.saudacao = str(c.saudacao, 300);
    if (c.organizador !== undefined) cf.organizador = str(c.organizador, 40) || cf.organizador;
    if (c.dataSorteio !== undefined) {
      if (!dataOk(c.dataSorteio)) erro('Data do sorteio inválida.');
      cf.dataSorteio = c.dataSorteio;
    }
    if (c.valorSugerido !== undefined) cf.valorSugerido = str(c.valorSugerido, 40);
    if (c.notaFoto !== undefined) cf.notaFoto = str(c.notaFoto, 200);
    if (c.appUrl !== undefined) {
      var u = str(c.appUrl, 300);
      if (u && !urlOk(u)) erro('O endereço do app precisa começar com https://');
      cf.appUrl = u;
    }
    if (c.capa !== undefined) {
      if (c.capa && !imgOk(c.capa, 200000)) erro('A foto de capa ficou grande demais.');
      cf.capa = c.capa || '';
    }
    if (c.evento) {
      var e = c.evento;
      if (e.data !== undefined) { if (!dataOk(e.data)) erro('Data da festa inválida.'); cf.evento.data = e.data; }
      if (e.hora !== undefined) { if (!/^\d{2}:\d{2}$/.test(e.hora)) erro('Hora da festa inválida.'); cf.evento.hora = e.hora; }
      if (e.local !== undefined) cf.evento.local = str(e.local, 80);
      if (e.endereco !== undefined) cf.evento.endereco = str(e.endereco, 200);
    }
    if (c.modos) {
      if (c.modos.inimigo !== undefined) {
        cf.modos.inimigo = !!c.modos.inimigo;
        if (cf.modos.inimigo && s.sorteio && !s.sorteio.inimigo) sortearInimigo(s);
      }
      if (c.modos.roubo !== undefined) cf.modos.roubo = !!c.modos.roubo;
    }
    out.mudou = true;
    return { salvo: true };
  };

  H.adminAvisar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (s.sorteio) erro('O sorteio já foi feito.');
    if (!s.config.appUrl) erro('Defina o endereço do app em Configurações antes de avisar todo mundo.');
    if (s.ordem.length < 3) erro('Cadastre pelo menos 3 participantes antes de encerrar as inscrições.');
    s.config.fase = 'aguardando';
    s.ordem.forEach(function (id) { out.outbox.push(emailAviso(s, s.pessoas[id])); });
    out.mudou = true;
    return { avisados: s.ordem.length };
  };

  H.adminReabrir = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (s.sorteio) erro('Depois do sorteio não dá para reabrir as inscrições. Desfaça o sorteio primeiro.');
    s.config.fase = 'inscricoes';
    out.mudou = true;
    return { ok: true };
  };

  H.adminSortear = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (s.sorteio) erro('O sorteio já foi feito. Para refazer, desfaça o sorteio primeiro.');
    if (!s.config.appUrl) erro('Defina o endereço do app em Configurações antes de sortear.');
    fazerSorteio(s, ctx);
    s.ordem.forEach(function (id) { out.outbox.push(emailSorteio(s, s.pessoas[id])); });
    out.mudou = true;
    return { sorteados: s.ordem.length };
  };

  H.adminDesfazerSorteio = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    s.sorteio = null; s.pistas = []; s.palpites = []; s.roubo = null; s.revelado = false; s.revelacao = false;
    s.config.fase = 'aguardando';
    out.mudou = true;
    return { ok: true };
  };

  H.adminRemover = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (s.sorteio) erro('Desfaça o sorteio antes de remover alguém.');
    var id = str(req.id, 40);
    if (!s.pessoas[id]) erro('Participante não encontrado.');
    delete s.pessoas[id];
    s.ordem = s.ordem.filter(function (x) { return x !== id; });
    out.mudou = true;
    return { ok: true };
  };

  H.adminReenviar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    var p = s.pessoas[str(req.id, 40)];
    if (!p) erro('Participante não encontrado.');
    out.outbox.push(emailLink(s, p));
    return { ok: true };
  };

  // Página de revelação: só existe depois que o organizador libera (use depois da festa).
  H.revelacao = function (s) {
    if (!s.sorteio || !s.revelacao) erro('A revelação ainda não foi liberada. Aguarde o organizador.');
    function par(de, para) { return { de: pub(s.pessoas[de]), para: pub(s.pessoas[para]) }; }
    var amigos = s.ordem.filter(function (id) { return s.pessoas[id] && s.pessoas[s.sorteio.amigo[id]]; })
      .map(function (id) { return par(id, s.sorteio.amigo[id]); });
    var inimigos = [];
    if (s.config.modos.inimigo && s.sorteio.inimigo) {
      inimigos = s.ordem.filter(function (id) { return s.pessoas[id] && s.pessoas[s.sorteio.inimigo[id]]; })
        .map(function (id) { return par(id, s.sorteio.inimigo[id]); });
    }
    return { titulo: s.config.titulo, amigos: amigos, inimigos: inimigos };
  };

  H.adminRevelacao = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (req.valor && !s.sorteio) erro('Faça o sorteio antes de liberar a revelação.');
    s.revelacao = !!req.valor;
    out.mudou = true;
    return { revelacao: s.revelacao };
  };

  H.adminRevelar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    s.revelado = !!req.valor;
    out.mudou = true;
    return { revelado: s.revelado };
  };

  H.adminRouboIniciar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    rouboIniciar(s);
    out.mudou = true;
    return { ok: true };
  };

  H.adminRouboAgir = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    rouboAgir(s, req);
    out.mudou = true;
    return { ok: true };
  };

  H.adminRouboEncerrar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    if (s.roubo) { s.roubo.fim = true; s.roubo.vezId = null; }
    out.mudou = true;
    return { ok: true };
  };

  H.adminRouboReiniciar = function (s, req, ctx, out) {
    exigirAdmin(s, req, ctx);
    s.roubo = null;
    out.mudou = true;
    return { ok: true };
  };

  /* ---------- ponto de entrada ---------- */
  function handle(s, req, ctx) {
    var out = { mudou: false, outbox: [] };
    try {
      var fn = H[req && req.action];
      if (!fn) erro('Ação desconhecida.');
      var data = fn(s, req, ctx, out);
      return { ok: true, data: data, mudou: out.mudou, outbox: out.outbox };
    } catch (e) {
      if (e && e.amigavel) return { ok: false, erro: e.message, mudou: !!e.gravar, outbox: [] };
      return { ok: false, erro: 'Erro inesperado: ' + (e && e.message), mudou: false, outbox: [] };
    }
  }

  // Chamado por um gatilho diário: faz o sorteio na data marcada.
  function tick(s, ctx) {
    var out = { mudou: false, outbox: [] };
    try {
      if (s.config.fase === 'aguardando' && !s.sorteio && s.config.appUrl &&
          ctx.hoje() >= s.config.dataSorteio && s.ordem.length >= 3) {
        fazerSorteio(s, ctx);
        s.ordem.forEach(function (id) { out.outbox.push(emailSorteio(s, s.pessoas[id])); });
        out.mudou = true;
      }
    } catch (e) { /* tenta de novo no próximo dia */ }
    return { ok: true, mudou: out.mudou, outbox: out.outbox };
  }

  // Só para o modo demonstração no navegador.
  function semearDemo(s, ctx) {
    function avatar(letra, cor) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="' + cor + '"/>' +
        '<text x="100" y="128" font-family="Arial" font-size="96" font-weight="bold" fill="#fff" text-anchor="middle">' + letra + '</text></svg>';
      return 'data:image/svg+xml;base64,' + btoa(svg);
    }
    function caixa(cor) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#F6EFD9"/>' +
        '<rect x="40" y="80" width="120" height="90" rx="6" fill="' + cor + '"/><rect x="92" y="80" width="16" height="90" fill="#FFC857"/>' +
        '<rect x="34" y="62" width="132" height="26" rx="6" fill="' + cor + '"/><rect x="92" y="62" width="16" height="26" fill="#FFC857"/></svg>';
      return 'data:image/svg+xml;base64,' + btoa(svg);
    }
    var nomes = ['Ana Beatriz', 'Bruno Lima', 'Carla Souza', 'Diego Rocha', 'Elisa Prado', 'Fábio Neves', 'Gabi Torres'];
    var cores = ['#1F3A2B', '#D2693A', '#2F7F6B', '#7A4FB8', '#C7792B', '#2B6CB0', '#B02A55'];
    var cab = ['Castanho', 'Preto', 'Loiro', 'Ruivo', 'Grisalho', 'Castanho', 'Preto'];
    nomes.forEach(function (n, i) {
      var id = 'p' + ctx.uuid().replace(/-/g, '').slice(0, 10);
      s.pessoas[id] = {
        id: id, token: ctx.uuid().replace(/-/g, ''), nome: n, foto: avatar(n.charAt(0), cores[i]),
        nascimento: '19' + (70 + i * 3) + '-0' + (1 + i) + '-1' + i, telefone: '(21) 99999-000' + i,
        email: n.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + '@exemplo.com',
        tracos: { cabeloCor: cab[i], cabeloTipo: OPCOES.cabeloTipo[i % 4], cabeloTam: OPCOES.cabeloTam[(i + 1) % 4],
                  olhos: OPCOES.olhos[i % 5], oculos: OPCOES.oculos[i % 2], altura: OPCOES.altura[i % 3], estilo: OPCOES.estilo[i % 5] },
        presentes: [
          { nome: 'Caneca térmica', foto: caixa(cores[i]), tamanho: '', link: 'https://exemplo.com/caneca' },
          { nome: 'Camiseta', foto: caixa('#D2693A'), tamanho: 'M', link: '' }
        ],
        criadoEm: ctx.agora()
      };
      s.ordem.push(id);
    });
  }

  return {
    OPCOES: OPCOES, MAX_PISTAS: MAX_PISTAS,
    novoEstado: novoEstado, handle: handle, tick: tick, semearDemo: semearDemo,
    frasesTracos: frasesTracos, fmtBR: fmtBR, fmtDM: fmtDM, diaSemana: diaSemana,
    _derrangement: derrangement, _validarSorteio: validarSorteio, _fazerSorteio: fazerSorteio
  };
})();
