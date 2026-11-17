/* Idiomas · curso por unidades con lecciones, repaso espaciado y audio. Tu progreso va a tu hoja «Fergard · Idiomas». */
(function () {
  "use strict";
  var CFG = window.FG_CFG || {}, VERSION = "0.6.0", DB_KEY = "idiomas_db", M = window.IMotor;
  var IDI = [{ id: "en", n: "Inglés", nat: "English", b: "🇺🇸", voz: "en-US" }, { id: "pt", n: "Portugués", nat: "Português", b: "🇧🇷", voz: "pt-BR" }, { id: "it", n: "Italiano", nat: "Italiano", b: "🇮🇹", voz: "it-IT" }];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = (function () { try { localStorage.setItem("_t", "1"); localStorage.removeItem("_t"); return localStorage; } catch (e) { var m = {}; return { getItem: function (k) { return m[k] || null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; } })();
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function idiOf(id) { for (var i = 0; i < IDI.length; i++) if (IDI[i].id === id) return IDI[i]; return IDI[0]; }

  /* ---------- datos locales y nube ---------- */
  function vacia() { return { v: 1, lec: {}, exa: {}, dia: {}, aj: { idioma: "en", meta: 1, lento: false, sonido: true, puedo: {} }, pend: {}, sync: { ult: 0 } }; }
  function cargar() { var d; try { d = JSON.parse(LS.getItem(DB_KEY)); } catch (e) { d = null; } if (!d || typeof d !== "object") d = vacia(); var b = vacia(); Object.keys(b).forEach(function (k) { if (d[k] === undefined) d[k] = b[k]; }); Object.keys(b.aj).forEach(function (k) { if (d.aj[k] === undefined) d.aj[k] = b.aj[k]; }); return d; }
  var db = cargar();
  var S = { tab: "camino", C: {}, ix: null, sync: "", P: null, vq: "" };
  function save() { try { LS.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  function mapa(t) { return t === "leccion" ? db.lec : t === "examen" ? db.exa : t === "dia" ? db.dia : null; }
  function touch(t, id, o) { if (o) o.upd = Date.now(); db.pend[t + ":" + id] = Date.now(); save(); schedSync(); }
  function cfg() { return window.FergardAcceso ? FergardAcceso.config() : { token: null, url: null }; }
  function post(url, body) { return fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function docsPend() {
    return Object.keys(db.pend).map(function (k) {
      var i = k.indexOf(":"), t = k.slice(0, i), id = k.slice(i + 1), m = mapa(t), d = t === "ajustes" ? db.aj : m && m[id];
      return { t: t, id: id, upd: (d && d.upd) || db.pend[k], del: !d, d: d || {} };
    });
  }
  function aplicar(docs) {
    var n = 0;
    (docs || []).forEach(function (r) {
      if (r.t === "ajustes") { if ((db.aj.upd || 0) < r.upd && !db.pend["ajustes:" + r.id]) { var b = vacia().aj; Object.keys(b).forEach(function (k) { if (r.d[k] === undefined) r.d[k] = b[k]; }); db.aj = r.d; db.aj.upd = r.upd; n++; } return; }
      var m = mapa(r.t); if (!m) return; var l = m[r.id]; if (l && (l.upd || 0) >= r.upd) return; if (db.pend[r.t + ":" + r.id] && !l && !r.del) return;
      if (r.del) delete m[r.id]; else { r.d.upd = r.upd; m[r.id] = r.d; } n++;
    });
    return n;
  }
  var syncing = false, syncT = null;
  function schedSync() { clearTimeout(syncT); syncT = setTimeout(function () { sync(false); }, 1500); }
  function sync(manual) {
    var c = cfg(); if (!c.token || !c.url) return Promise.resolve();
    if (syncing) return Promise.resolve(); syncing = true;
    var env = docsPend(), claves = Object.keys(db.pend), t0 = Date.now();
    return post(c.url, { op: "idiomas_sync", app: "idiomas", token: c.token, since: db.sync.ult || 0, docs: env }).then(function (r) {
      if (!r || !r.ok) { S.sync = r && r.error === "operacion_desconocida" ? "Actualiza el script de Fergard (v0.10.0)" : "Pendiente (" + ((r && r.error) || "error") + ")"; if (manual) toast(S.sync); return; }
      var entiende = r.tipos || [], sin = 0;
      claves.forEach(function (k) { if (entiende.indexOf(k.slice(0, k.indexOf(":"))) < 0) { sin++; return; } if (db.pend[k] <= t0) delete db.pend[k]; });
      var n = aplicar(r.docs); db.sync.ult = r.ahora || t0; db.sync.ok = Date.now(); if (r.url) db.sync.url = r.url; save();
      S.sync = sin ? "Actualiza el script de Fergard (v0.10.0)" : "Al día"; if (manual) toast(S.sync); if (n) { cargarCurso(db.aj.idioma).then(pintar); }
    }).catch(function () { S.sync = "Sin conexión · se subirá después"; if (manual) toast("Sin conexión"); }).then(function () { syncing = false; });
  }
  window.addEventListener("online", function () { sync(false); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { sync(false); buscarActualizacion(); } });
  function toast(t) { var e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on"); }, 2800); }
  function ico(n) {
    var p = { camino: '<path d="M4 19c4-1 3-6 7-7s3-6 9-7"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>', repaso: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>', palabras: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 8h6M8 12h6"/>', perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>' };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (p[n] || "") + "</svg>";
  }

  /* ---------- curso ---------- */
  function cargarCurso(id) {
    if (S.C[id]) return Promise.resolve(S.C[id]);
    return Promise.all([S.ix ? S.ix : fetch("data/cursos.json").then(function (r) { return r.json(); }), S.plan ? S.plan : fetch("data/plan.json").then(function (r) { return r.json(); })]).then(function (r) {
      S.ix = r[0]; S.plan = r[1]; var def = S.ix[id], cargas = [];
      def.niveles.forEach(function (n) { n.unidades.forEach(function (u) { cargas.push(fetch("data/" + id + "/" + u + ".json").then(function (x) { return x.json(); })); }); });
      return Promise.all(cargas).then(function (us) {
        var k = 0, niveles = def.niveles.map(function (n) { var pl = S.plan.niveles.filter(function (p) { return p.id === n.id; })[0], l = us.slice(k, k + n.unidades.length); k += n.unidades.length; return { id: n.id, nombre: pl.nombre, horas: pl.horas, total: n.total, completo: n.completo, plan: pl.unidades, unidades: l }; });
        S.C[id] = { niveles: niveles, unidades: us, cat: M.indexar(us) }; return S.C[id];
      });
    });
  }
  function curso() { return S.C[db.aj.idioma]; }
  function hecha(id) { return !!(db.lec[id] && db.lec[id].e >= 1); }
  function examOk(uid) { return !!(db.exa[uid] && db.exa[uid].ok); }
  function secuencia(c) {   // orden fijo: por nivel, 5 lecciones y examen de cada unidad, y examen final del nivel
    var s = [], idi = db.aj.idioma;
    c.niveles.forEach(function (nv, nk) {
      nv.unidades.forEach(function (u) { var k = c.unidades.indexOf(u); u.lecciones.forEach(function (L, i) { s.push({ k: "lec", u: k, i: i, id: L.id, ok: hecha(L.id) }); }); s.push({ k: "exa", u: k, i: 5, id: u.id, ok: examOk(u.id) }); });
      if (nv.completo) s.push({ k: "niv", u: -1, nv: nk, i: 6, id: idi + "-" + nv.id, ok: examOk(idi + "-" + nv.id) });
    });
    var act = -1; s.forEach(function (e, n) { if (act < 0 && !e.ok) act = n; }); s.forEach(function (e, n) { e.estado = e.ok ? "hecha" : n === act ? "actual" : "bloq"; }); return s;
  }
  function srsMap(idioma) {
    var m = {}; Object.keys(db.lec).forEach(function (id) { if (id.indexOf(idioma + "-") !== 0) return; var s = db.lec[id].srs || {}; Object.keys(s).forEach(function (k) { m[k] = { b: s[k][0], d: s[k][1] }; }); }); return m;
  }
  function vencidosHoy() { var c = curso(); if (!c) return []; var m = srsMap(db.aj.idioma); return M.vencidos(m, M.hoy()).filter(function (id) { return c.cat[id]; }); }
  function diasMapa() { var m = {}; Object.keys(db.dia).forEach(function (f) { if ((db.dia[f].xp || 0) > 0 || (db.dia[f].n || 0) > 0) m[f] = 1; }); return m; }
  function xpTotal() { return Object.keys(db.dia).reduce(function (a, f) { return a + (db.dia[f].xp || 0); }, 0); }

  /* ---------- audio ---------- */
  var vozCache = {}, avisoVoz = false;
  function puntaje(v) { return (/premium|enhanced|mejorada|siri/i.test(v.name) ? 3 : 0) + (v.localService ? 1 : 0) + (/samantha|ava|luciana|joana|alice|federica|allison/i.test(v.name) ? 1 : 0); }
  function elegirVoz(lang) {
    if (vozCache[lang]) return vozCache[lang]; if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices() || [], l = lang.toLowerCase(), pref = vs.filter(function (v) { return v.lang.replace("_", "-").toLowerCase() === l; });
    if (!pref.length) pref = vs.filter(function (v) { return v.lang.toLowerCase().indexOf(l.slice(0, 2)) === 0; });
    pref.sort(function (a, b) { return puntaje(b) - puntaje(a); }); if (pref[0]) vozCache[lang] = pref[0]; return pref[0] || null;
  }
  function hablar(texto, lento) {
    if (!window.speechSynthesis || !texto) { if (!window.speechSynthesis) toast("Este dispositivo no tiene voz para escuchar"); return; }
    try {
      speechSynthesis.cancel(); var i = idiOf(db.aj.idioma), u = new SpeechSynthesisUtterance(texto); u.lang = i.voz; var v = elegirVoz(i.voz);
      if (v) u.voice = v; else if (!avisoVoz) { avisoVoz = true; toast("Para oír " + i.n + ": Ajustes ▸ Accesibilidad ▸ Contenido hablado ▸ Voces"); }
      u.rate = (lento || db.aj.lento) ? 0.55 : 0.85; speechSynthesis.speak(u);
    } catch (e) {}
  }
  if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = function () { vozCache = {}; }; } catch (e) {} }
  var ac = null;
  function sonido(ok) {
    if (db.aj.sonido === false) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); var o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.type = "sine"; o.frequency.value = ok ? 660 : 220; g.gain.setValueAtTime(0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (ok ? 0.18 : 0.3)); o.start(); o.stop(ac.currentTime + 0.32); } catch (e) {}
  }

  /* ---------- pantallas ---------- */
  function topBar() {
    var i = idiOf(db.aj.idioma), r = M.racha(diasMapa(), M.hoy());
    return '<div class="top"><button class="chip idi" data-a="idi" aria-label="Cambiar de idioma">' + i.b + " " + esc(i.n) + ' ▾</button><span class="chip" aria-label="Racha">🔥 ' + r + '</span><span class="chip" aria-label="Puntos">⭐ ' + xpTotal() + "</span></div>";
  }
  function leccionesHoy() { var d = db.dia[M.hoy()]; return d ? d.n || 0 : 0; }
  function nodoHtml(e, c, j) {
    var u = e.u >= 0 ? c.unidades[e.u] : null, off = [0, 44, 66, 44, 0, -44, -66][j % 7];
    var cls = (e.k !== "lec" ? "exam " : "") + e.estado, cont = e.k === "lec" ? (e.estado === "hecha" ? "✓" : e.estado === "actual" ? "▶" : "🔒") : (e.ok ? "✓" : e.estado === "bloq" ? "🔒" : e.k === "niv" ? "🏆" : "👑");
    var est = e.k === "lec" && e.ok ? '<span class="st" aria-hidden="true">' + "★★★".slice(0, db.lec[e.id].e) + "☆☆☆".slice(0, 3 - db.lec[e.id].e) + "</span>" : "";
    var rot = e.k === "niv" ? "Examen final del nivel" : e.k === "exa" ? "Examen de la unidad " + u.n : "Lección " + (e.i + 1) + ": " + u.lecciones[e.i].titulo;
    return '<button class="nd ' + cls + '" style="transform:translateX(' + off + 'px)" data-a="nodo" data-u="' + e.u + '" data-i="' + e.i + '"' + (e.k === "niv" ? ' data-nv="' + e.nv + '"' : "") + ' aria-label="' + esc(rot) + (e.estado === "bloq" ? " (bloqueada)" : "") + '">' + (e.estado === "actual" ? '<span class="go">EMPEZAR</span>' : "") + cont + est + "</button>";
  }
  function vCamino() {
    var c = curso(); if (!c) return '<div class="vacio"><b>Cargando el curso…</b>Un momento.</div>';
    var seq = secuencia(c), h = topBar(), meta = db.aj.meta || 1, hoyN = leccionesHoy(), pc = Math.min(100, Math.round(100 * hoyN / meta));
    h += '<div class="meta"><div style="flex:1"><b>Meta de hoy</b><small>' + hoyN + " de " + meta + (meta === 1 ? " lección" : " lecciones") + (hoyN >= meta ? " · ¡cumplida! 🎉" : "") + '</small></div><div class="bar" style="max-width:110px"><i style="width:' + pc + '%"></i></div></div>';
    c.niveles.forEach(function (nv) {
      var hechasN = 0, totN = nv.unidades.length * 5; nv.unidades.forEach(function (u) { u.lecciones.forEach(function (L) { if (hecha(L.id)) hechasN++; }); });
      h += '<div class="nvl"><b>' + esc(nv.nombre) + "</b><small>" + hechasN + " de " + totN + " lecciones · " + nv.unidades.length + " de " + nv.total + " unidades · " + esc(nv.horas) + " de estudio guiado</small></div>";
      nv.unidades.forEach(function (u) {
        var k = c.unidades.indexOf(u);
        h += '<div class="ub"><div><small>UNIDAD ' + u.n + " · " + esc(u.nivel) + "</small><b>" + esc(u.titulo) + '</b></div><button data-a="guia" data-u="' + k + '" aria-label="Guía de la unidad ' + u.n + '">📘 Guía</button></div><div class="path">';
        var j = 0; seq.filter(function (e) { return e.u === k; }).forEach(function (e) { h += nodoHtml(e, c, j++); });
        h += "</div>";
      });
      if (nv.completo) { var ne = seq.filter(function (e) { return e.k === "niv" && e.nv === c.niveles.indexOf(nv); })[0]; h += '<div class="ub" style="background:#7C5CFF;box-shadow:0 5px 0 #5238C8"><div><small>EXAMEN FINAL</small><b>Nivel ' + esc(nv.id.toUpperCase()) + '</b></div></div><div class="path">' + nodoHtml(ne, c, 0) + "</div>"; }
      else h += '<div class="prox"><b>🚧 Próximamente · resto del nivel ' + esc(nv.id.toUpperCase()) + "</b>" + nv.plan.slice(nv.unidades.length).map(function (t, n) { return "<div>Unidad " + (nv.unidades.length + n + 1) + " · " + esc(t) + "</div>"; }).join("") + "<div>🏆 Examen final del nivel</div></div>";
    });
    var vistos = {}; c.niveles.forEach(function (n) { vistos[n.id] = 1; }); var faltan = S.plan.niveles.filter(function (n) { return !vistos[n.id]; });
    if (faltan.length) h += '<div class="prox"><b>🗺️ Más adelante</b>' + faltan.map(function (n) { return "<div>" + esc(n.nombre) + " · " + n.unidades.length + " unidades</div>"; }).join("") + "</div>";
    return h;
  }
  function vRepaso() {
    var ids = vencidosHoy(), c = curso(), n = ids.length, aprendidas = Object.keys(srsMap(db.aj.idioma)).length;
    var h = topBar() + '<h1 class="t">Repaso</h1>';
    if (!aprendidas) return h + '<div class="vacio"><b>Aún no hay nada que repasar</b>Completa tu primera lección y aquí aparecerán las palabras que toca recordar.</div>';
    h += '<div class="big"><div><b>' + n + "</b><span>Para repasar hoy</span></div><div><b>" + aprendidas + "</b><span>Aprendidas</span></div></div>";
    if (n) h += '<div class="card"><b>Repasar a tiempo es lo que fija el idioma en la memoria.</b><div class="st2" style="color:var(--mut);margin-top:4px;line-height:1.4">Lo que fallas vuelve pronto; lo que dominas, cada vez más espaciado (1, 3, 7, 21 y 60 días).</div></div><button class="btn" data-a="repasar">Repasar ' + Math.min(12, n) + " ahora</button>";
    else h += '<div class="vacio"><b>¡Todo al día! 🎉</b>Vuelve mañana: tus palabras te avisarán cuando toque repasarlas.</div>';
    return h;
  }
  function vPalabras() {
    var c = curso(), srs = srsMap(db.aj.idioma), h = topBar() + '<h1 class="t">Palabras</h1>', lista = [];
    if (c) c.unidades.forEach(function (u) { u.lecciones.forEach(function (L) { if (!hecha(L.id)) return; M.itemsDe(L).forEach(function (it) { if (it.tipo === "p") lista.push(it); }); }); });
    if (!lista.length) return h + '<div class="vacio"><b>Tu vocabulario aparecerá aquí</b>Cada palabra que aprendas se guarda con su pronunciación, significado y qué tan firme la tienes.</div>';
    var q = M.norm(S.vq); if (q) lista = lista.filter(function (it) { return M.norm(it.t).indexOf(q) >= 0 || M.norm(it.es).indexOf(q) >= 0; });
    h += '<input id="vq" placeholder="Buscar palabra…" value="' + esc(S.vq) + '" aria-label="Buscar palabra"><div class="card" style="margin-top:12px"><div class="st2" style="margin:0 0 4px">' + lista.length + " palabras</div>";
    lista.forEach(function (it) { var b = srs[it.id] ? srs[it.id].b : 0; h += '<div class="fila"><button class="chip" data-a="oirp" data-t="' + esc(it.t) + '" aria-label="Escuchar ' + esc(it.t) + '">🔊</button><div class="tx"><div class="tt">' + esc(it.t) + ' <span class="pron">' + esc(it.pron) + '</span></div><div class="st2">' + esc(it.es) + '</div></div><div aria-label="Firmeza ' + b + ' de 5" title="Firmeza">' + "●".repeat(b) + '<span style="color:var(--gris2)">' + "●".repeat(5 - b) + "</span></div></div>"; });
    return h + "</div>";
  }
  function vPerfil() {
    var c = curso(), hoyS = M.hoy(), srs = srsMap(db.aj.idioma), r = M.racha(diasMapa(), hoyS), hechas = Object.keys(db.lec).filter(function (id) { return db.lec[id].e >= 1; }).length, dom = Object.keys(srs).filter(function (k) { return srs[k].b >= 4; }).length;
    var h = topBar() + '<h1 class="t">Perfil</h1><div class="big"><div><b>' + r + "</b><span>Días de racha</span></div><div><b>" + xpTotal() + "</b><span>Puntos</span></div><div><b>" + hechas + "</b><span>Lecciones</span></div></div>";
    if (c) h += '<div class="card"><b>Dominio por unidad · ' + esc(idiOf(db.aj.idioma).n) + '</b><div class="st2" style="margin-bottom:8px">Qué tan firme está lo aprendido; baja si dejas de repasar.</div>' + c.unidades.map(function (u) { var ids = []; u.lecciones.forEach(function (L) { M.itemsDe(L).forEach(function (it) { ids.push(it.id); }); }); var d = M.dominio(ids, srs); return '<div class="fila"><div class="tx"><div class="tt">' + u.n + ". " + esc(u.titulo) + '</div></div><div class="bar" style="max-width:90px"><i style="width:' + d + '%"></i></div><b>' + d + "%</b></div>"; }).join("") + "</div>";
    h += '<div class="card"><div class="lbl" style="margin-top:0">Meta diaria</div><div class="seg">' + [1, 2, 3].map(function (n) { return '<button class="' + ((db.aj.meta || 1) === n ? "on" : "") + '" data-a="meta" data-v="' + n + '">' + n + (n === 1 ? " lección" : " lecciones") + "</button>"; }).join("") + '</div><label class="sw"><input type="checkbox" data-a="lento"' + (db.aj.lento ? " checked" : "") + '> Voz siempre lenta (para aprender)</label><label class="sw"><input type="checkbox" data-a="sonidos"' + (db.aj.sonido !== false ? " checked" : "") + '> Sonidos de acierto y error</label></div>';
    h += '<div class="card"><div class="lbl" style="margin-top:0">Acceso y datos</div><div id="acc"></div><div class="st2" style="margin:10px 0">' + esc(!cfg().token ? "Sin vincular" : S.sync || (db.sync.ok ? "Al día" : "Lista para sincronizar")) + " · pendientes: " + Object.keys(db.pend).length + '</div><div style="display:flex;gap:8px"><button class="btn sec" style="margin:0" data-a="sync">Sincronizar</button>' + (db.sync.url ? '<a class="btn sec" style="margin:0;text-decoration:none" target="_blank" rel="noopener" href="' + esc(db.sync.url) + '">Mi hoja</a>' : "") + '</div></div><div class="st2" style="text-align:center;margin:14px 0">Idiomas v' + VERSION + " · tu progreso se guarda en tu hoja «Fergard · Idiomas»</div>";
    return h;
  }
  var TABS = [["camino", "Camino"], ["repaso", "Repaso"], ["palabras", "Palabras"], ["perfil", "Perfil"]];
  function pintarTabs() { var n = vencidosHoy().length; $("#tabs").innerHTML = TABS.map(function (t) { return '<button class="' + (S.tab === t[0] ? "on" : "") + '" data-a="tab" data-t="' + t[0] + '" aria-current="' + (S.tab === t[0]) + '">' + ico(t[0]) + "<span>" + t[1] + (t[0] === "repaso" && n ? ' <b class="n">' + n + "</b>" : "") + "</span></button>"; }).join(""); }
  function pintar() {
    var a = $("#app"), sc = a.scrollTop, v = { camino: vCamino, repaso: vRepaso, palabras: vPalabras, perfil: vPerfil }[S.tab], foco = document.activeElement && document.activeElement.id === "vq" ? document.activeElement.selectionStart : -1;
    a.innerHTML = v(); a.scrollTop = sc; pintarTabs();
    if (S.tab === "perfil" && window.FergardAcceso && $("#acc")) FergardAcceso.panel($("#acc"));
    if (foco >= 0 && $("#vq")) { $("#vq").focus(); try { $("#vq").setSelectionRange(foco, foco); } catch (e) {} }
  }

  /* ---------- hojas ---------- */
  function abrir(html) { var m = $("#modal"); m.innerHTML = '<div class="caja"><div class="ctop"><div class="asa"></div><button class="cerrar" data-a="mcerrar" aria-label="Cerrar">×</button></div>' + html + "</div>"; m.hidden = false; m.onclick = function (e) { if (e.target === m) cerrar(); }; }
  function cerrar() { $("#modal").hidden = true; $("#modal").innerHTML = ""; }
  function hojaIdiomas() {
    var h = "<h3>Elige el idioma</h3>";
    IDI.forEach(function (i) { var def = S.ix && S.ix[i.id], tot = def ? def.niveles.reduce(function (a, n) { return a + n.unidades.length * 5; }, 0) : 15, hechas = Object.keys(db.lec).filter(function (id) { return id.indexOf(i.id + "-") === 0 && db.lec[id].e >= 1; }).length;
      h += '<button class="card" style="display:flex;align-items:center;gap:14px;width:100%;text-align:left;' + (i.id === db.aj.idioma ? "border-color:var(--pri)" : "") + '" data-a="setidi" data-v="' + i.id + '"><span style="font-size:34px">' + i.b + '</span><span style="flex:1"><b style="font-size:18px">' + esc(i.n) + '</b><br><span class="st2">' + esc(i.nat) + " · " + hechas + " de " + tot + ' lecciones</span></span>' + (i.id === db.aj.idioma ? "✓" : "") + "</button>"; });
    abrir(h);
  }
  function hojaGuia(k) {
    var u = curso().unidades[k], g = u.gramatica, pu = db.aj.puedo[u.id] || [];
    abrir('<h3>Unidad ' + u.n + " · " + esc(u.titulo) + '</h3><div class="st2" style="margin:-4px 0 8px">' + esc(u.resumen) + '</div><div class="lbl">Al terminar podrás…</div>' + u.puedo.map(function (t, i) { return '<label class="puedo"><input type="checkbox" data-a="puedo" data-u="' + k + '" data-i="' + i + '"' + (pu.indexOf(i) >= 0 ? " checked" : "") + "><span>" + esc(t) + "</span></label>"; }).join("") +
      '<div class="st2">Marca solo lo que de verdad puedas hacer sin mirar.</div><div class="lbl">Gramática · ' + esc(g.titulo) + '</div><div class="card"><div style="font-size:15.5px;line-height:1.5">' + esc(g.texto).replace(/\n/g, "<br>") + '</div><table class="tabla">' + g.tabla.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td><td>" + esc(r[2] || "") + "</td></tr>"; }).join("") + "</table>" + g.errores.map(function (e) { return '<div class="err">⚠️ ' + esc(e) + "</div>"; }).join("") +
      '</div><div class="lbl">Práctica fuera de la app</div><div class="card">' + u.practica.map(function (t) { return '<div class="tarea">🎯 ' + esc(t) + "</div>"; }).join("") + '</div><div class="st2">Estas tareas te acercan a las horas de estudio que pide cada nivel: la app enseña y repasa; hablar y escuchar de verdad se practica fuera.</div>');
  }
  function hojaNivel(nk) {
    var c = curso(), nv = c.niveles[nk], seq = secuencia(c), e = seq.filter(function (x) { return x.k === "niv" && x.nv === nk; })[0]; if (!e) return;
    if (e.estado === "bloq") { toast("Termina todas las unidades del nivel para abrir el examen final"); return; }
    var ex = db.exa[e.id]; abrir("<h3>🏆 Examen final · " + esc(nv.nombre) + '</h3><div class="card">40 preguntas mezcladas de todo el nivel: significado, escuchar, ordenar frases, completar y escribir.<br><br><b>Necesitas 85 % a la primera</b> para aprobar el nivel. Sin segundas oportunidades por pregunta.' + (ex ? "<br><br>Tu mejor resultado: <b>" + ex.p + " %</b>" + (ex.ok ? " · aprobado ✓" : "") : "") + '</div><button class="btn pri" data-a="empezarniv" data-nv="' + nk + '">' + (ex && ex.ok ? "Repetir examen" : "Empezar examen") + "</button>");
  }
  function hojaNodo(k, i) {
    var c = curso(), u = c.unidades[k], seq = secuencia(c), e = seq.filter(function (x) { return x.u === k && x.i === i; })[0];
    if (!e) return;
    if (e.estado === "bloq") { toast(e.k === "exa" ? "Termina las 5 lecciones de la unidad para abrir el examen" : "Termina la lección anterior para abrir esta"); return; }
    if (e.k === "exa") {
      var ex = db.exa[u.id]; abrir('<h3>👑 Examen de la unidad ' + u.n + '</h3><div class="card">20 preguntas mezcladas de toda la unidad: significado, escuchar, ordenar frases, completar y escribir.<br><br><b>Necesitas 85 % a la primera</b> para pasar. Aquí no hay segundas oportunidades por pregunta.' + (ex ? '<br><br>Tu mejor resultado: <b>' + ex.p + " %</b>" + (ex.ok ? " · aprobado ✓" : "") : "") + '</div><button class="btn pri" data-a="empezarexa" data-u="' + k + '">' + (ex && ex.ok ? "Repetir examen" : "Empezar examen") + "</button>"); return;
    }
    var L = u.lecciones[i], d = db.lec[L.id];
    abrir("<h3>" + esc(L.titulo) + '</h3><div class="card"><b>Aprenderás:</b> ' + esc(L.objetivo) + '<div class="st2" style="margin-top:8px">' + L.palabras.length + " palabras · " + L.frases.length + " frases · 1 diálogo · unos 8 minutos" + (d ? " · tu mejor: " + "★".repeat(d.e) + " " + d.p + " %" : "") + '</div></div><button class="btn" data-a="empezarlec" data-u="' + k + '" data-i="' + i + '">' + (d ? "Practicar de nuevo" : "Empezar") + "</button>");
  }

  /* ---------- reproductor ---------- */
  var P = null;
  function tarjetas(L) { var t = [{ k: "intro" }]; L.palabras.forEach(function (w) { t.push({ k: "pal", w: w }); }); t.push({ k: "frases" }); t.push({ k: "dial" }); return t; }
  function iniciar(modo, c, u, L, ejercicios) {
    P = { modo: modo, c: c, u: u, L: L, fase: modo === "lec" ? "tarj" : "ej", tarj: modo === "lec" ? tarjetas(L) : [], ti: 0, ses: M.crearSesion(ejercicios, { examen: modo === "exa" }), e: null, sel: null, tok: [], txt: "", par: null, fb: null, fin: null };
    cerrar(); $("#jug").hidden = false; if (P.fase === "ej") siguienteEj(); else pintarJ();
  }
  function salirJ() { P = null; $("#jug").hidden = true; $("#jug").innerHTML = ""; pintar(); }
  function siguienteEj() {
    P.e = M.actual(P.ses); P.sel = null; P.tok = []; P.txt = ""; P.fb = null; P.par = P.e && P.e.tipo === "parejas" ? { sel: null, hechos: {}, err: 0, mal: {} } : null; pintarJ();
    var e = P.e; if (e && (e.tipo === "escuchar" || e.tipo === "dictado" || (e.tipo === "elegir" && e.dir === "te"))) setTimeout(function () { hablar(e.audio); }, 250);
  }
  function jHead(pc) { return '<div class="jh"><button class="x" data-a="jx" aria-label="Salir de la lección">✕</button><div class="bar"><i style="width:' + pc + '%"></i></div></div>'; }
  function opcionesHtml(e) {
    return e.opciones.map(function (o, i) { var cls = "op"; if (P.fb) { if (o.ok) cls += " ok"; else if (P.sel === i) cls += " mal"; } else if (P.sel === i) cls += " s"; return '<button class="' + cls + '" data-a="op" data-i="' + i + '"' + (P.fb ? " disabled" : "") + ">" + esc(o.txt) + "</button>"; }).join("");
  }
  function audioBtn(txt) { return '<button class="sp" data-a="oir" aria-label="Escuchar">🔊</button><button class="lento" data-a="oirl">🐢 Más lento</button>'; }
  function ejHtml(e) {
    var h = "";
    if (e.tipo === "elegir") {
      h = '<div class="q"><small>' + (e.dir === "te" ? "¿Qué significa?" : "¿Cómo se dice en " + esc(idiOf(db.aj.idioma).n.toLowerCase()) + "?") + "</small></div>";
      h += e.dir === "te" ? '<div class="pal">' + esc(e.pregunta) + '</div><div class="prn">' + esc(e.pron) + '</div><button class="sp" data-a="oir" aria-label="Escuchar">🔊</button>' : '<div class="pal" style="font-size:30px">' + esc(e.pregunta) + "</div>";
      return h + opcionesHtml(e);
    }
    if (e.tipo === "escuchar") return '<div class="q"><small>Escucha y elige lo que oyes</small></div>' + audioBtn() + opcionesHtml(e);
    if (e.tipo === "hueco") {
      var sel = P.sel !== null ? e.opciones[P.sel].txt : "", f = esc(e.frase).replace("_____", '<span class="b">' + esc(sel || "    ") + "</span>");
      return '<div class="q"><small>Completa la frase</small></div><div class="hu">' + f + "<small>" + esc(e.ayuda) + "</small></div>" + opcionesHtml(e);
    }
    if (e.tipo === "ordenar") {
      var resp = P.tok.map(function (i, n) { return '<button class="tk" data-a="tq" data-n="' + n + '"' + (P.fb ? " disabled" : "") + ">" + esc(e.tokens[i]) + "</button>"; }).join(""), banco = e.tokens.map(function (t, i) { return P.tok.indexOf(i) >= 0 ? '<span class="tk us">' + esc(t) + "</span>" : '<button class="tk" data-a="tk" data-i="' + i + '"' + (P.fb ? " disabled" : "") + ">" + esc(t) + "</button>"; }).join("");
      return '<div class="q"><small>Escribe esto en ' + esc(idiOf(db.aj.idioma).n.toLowerCase()) + '</small>' + esc(e.pregunta) + '</div><div class="resp" aria-label="Tu respuesta">' + resp + '</div><div class="bank">' + banco + '</div>';
    }
    if (e.tipo === "parejas") {
      var izq = e.pares.map(function (p) { return '<button class="pc' + (P.par.hechos[p.item] ? " ok" : "") + (P.par.sel && P.par.sel.s === "l" && P.par.sel.id === p.item ? " s" : "") + '" data-a="par" data-s="l" data-id="' + esc(p.item) + '">' + esc(p.t) + "</button>"; }).join(""), porId = {}; e.pares.forEach(function (p) { porId[p.item] = p; });
      var der = e.orden.map(function (id) { return '<button class="pc' + (P.par.hechos[id] ? " ok" : "") + (P.par.sel && P.par.sel.s === "r" && P.par.sel.id === id ? " s" : "") + '" data-a="par" data-s="r" data-id="' + esc(id) + '">' + esc(porId[id].es) + "</button>"; }).join("");
      return '<div class="q"><small>Une cada palabra con su significado</small></div><div class="par"><div style="display:flex;flex-direction:column;gap:10px">' + izq + '</div><div style="display:flex;flex-direction:column;gap:10px">' + der + "</div></div>";
    }
    if (e.tipo === "escribir") return '<div class="q"><small>Escríbelo en ' + esc(idiOf(db.aj.idioma).n.toLowerCase()) + "</small>" + esc(e.pregunta) + '</div><input class="txt" id="jt" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Escribe aquí" value="' + esc(P.txt) + '"' + (P.fb ? " disabled" : "") + '>' + (e.pron && !P.fb ? '<button class="lento" data-a="pista">💡 Ver cómo suena</button>' : "") + '<div id="pista"></div>';
    if (e.tipo === "dictado") return '<div class="q"><small>Escribe lo que escuchas</small></div>' + audioBtn() + '<input class="txt" id="jt" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Escribe aquí" value="' + esc(P.txt) + '"' + (P.fb ? " disabled" : "") + ">";
    return "";
  }
  function listoParaComprobar() {
    var e = P.e; if (!e) return false;
    if (["elegir", "escuchar", "hueco"].indexOf(e.tipo) >= 0) return P.sel !== null; if (e.tipo === "ordenar") return P.tok.length > 0; if (e.tipo === "escribir" || e.tipo === "dictado") return !!P.txt.trim(); return false;
  }
  function pie() {
    if (P.fb) { var e = P.e, ok = P.fb.ok, det = "";
      if (!ok) { det = (e.tipo === "parejas" ? "Repasa estas parejas en tu próxima práctica." : "Respuesta correcta: <b>" + esc(e.correcta) + "</b>") + (e.pron && e.tipo !== "parejas" ? ' <span class="pron">' + esc(e.pron) + "</span>" : ""); }
      else if (P.fb.nota) det = esc(P.fb.nota); else if (e.traduccion) det = esc(e.traduccion);
      var msg = ok ? ["¡Muy bien!", "¡Correcto!", "¡Excelente!", "¡Eso es!"][P.ses.i % 4] : (P.modo === "exa" ? "Incorrecto" : "Casi… lo repetiremos");
      return '<div class="jf ' + (ok ? "ok" : "mal") + '"><div class="m">' + (ok ? "✓ " : "✗ ") + msg + '</div><div class="d">' + det + '</div><button class="btn ' + (ok ? "pri" : "bad") + '" style="margin-top:4px" data-a="sig">Continuar</button></div>'; }
    if (P.e && P.e.tipo === "parejas") return '<div class="jf"></div>';
    return '<div class="jf"><button class="btn" data-a="chk"' + (listoParaComprobar() ? "" : " disabled") + ">Comprobar</button></div>";
  }
  function pintarJ() {
    var j = $("#jug"); if (!P) return;
    if (P.fase === "tarj") { var t = P.tarj[P.ti], ult = P.ti === P.tarj.length - 1; j.innerHTML = jHead(Math.round(100 * P.ti / P.tarj.length)) + '<div class="jc">' + tarjHtml(t) + '</div><div class="jf"><button class="btn pri" data-a="tsig">' + (ult ? "¡A practicar!" : "Siguiente") + "</button></div>"; $(".jc", j).scrollTop = 0; return; }
    if (P.fase === "fin") { j.innerHTML = finHtml(); return; }
    var foco = document.activeElement && document.activeElement.id === "jt";
    j.innerHTML = jHead(Math.round(100 * P.ses.i / P.ses.cola.length)) + '<div class="jc">' + ejHtml(P.e) + "</div>" + pie();
    var t2 = $("#jt"); if (t2 && !P.fb && (foco || P.e.tipo === "escribir")) { try { t2.focus(); } catch (x) {} }
  }
  function tarjHtml(t) {
    var i = idiOf(db.aj.idioma);
    if (t.k === "intro") return '<div class="tarj intro"><div style="font-size:40px">' + i.b + "</div><h2>" + esc(P.L.titulo) + "</h2><p>" + esc(P.L.intro) + '</p><p><b>Al terminar:</b> ' + esc(P.L.objetivo) + '</p><p class="st2" style="color:var(--mut)">Primero verás cada palabra con su pronunciación. Toca 🔊 para escucharla y repítela en voz alta.</p></div>';
    if (t.k === "pal") { var w = t.w; setTimeout(function () { if (P && P.fase === "tarj") hablar(w.t); }, 250);
      return '<div class="tarj"><div class="st2">Palabra ' + (P.ti) + " de " + P.L.palabras.length + '</div><div class="pal">' + esc(w.t) + '</div><div class="prn">' + esc(w.pron) + '</div><button class="sp" data-a="oirp" data-t="' + esc(w.t) + '" aria-label="Escuchar">🔊</button><button class="lento" data-a="oirpl" data-t="' + esc(w.t) + '">🐢 Más lento</button><div class="es">' + esc(w.es) + "</div>" + (w.cog ? '<div class="cog">✨ Se parece al español</div>' : "") + (w.ej ? '<div class="ej"><b>' + esc(w.ej) + "</b><small>" + esc(w.ejes) + "</small></div>" : "") + (w.truco ? '<div class="trk">💡 ' + esc(w.truco) + "</div>" : "") + "</div>"; }
    if (t.k === "frases") return '<div class="tarj intro"><h2>Frases clave</h2>' + P.L.frases.map(function (f) { return '<div class="fila" style="align-items:flex-start"><button class="chip" data-a="oirp" data-t="' + esc(f.t) + '" aria-label="Escuchar">🔊</button><div class="tx"><div class="tt">' + esc(f.t) + '</div><div class="pron" style="font-size:14px">' + esc(f.pron) + '</div><div class="st2">' + esc(f.es) + "</div></div></div>"; }).join("") + "</div>";
    if (t.k === "dial") return '<div class="tarj intro"><h2>💬 ' + esc(P.L.dialogo.titulo) + '</h2><div class="dl">' + P.L.dialogo.lineas.map(function (l) { return '<button class="l ' + l.q + '" data-a="oirp" data-t="' + esc(l.t) + '" style="text-align:left"><b>' + esc(l.t) + "</b><small>" + esc(l.es) + "</small></button>"; }).join("") + '</div><div class="st2" style="margin-top:10px">Toca cada línea para escucharla.' + (P.L.nota ? "<br><br>📌 " + esc(P.L.nota) : "") + "</div></div>";
    return "";
  }
  function finHtml() {
    var f = P.fin, e = P.modo === "exa";
    var titulo = e ? (f.aprobado ? (P.nivel ? "¡Nivel aprobado! 🏆" : "¡Examen aprobado!") : "Aún no lo logras") : P.modo === "rep" ? "¡Repaso hecho!" : "¡Lección completada!";
    var sub = e && !f.aprobado ? "Necesitas 85 % a la primera. Repasa lo aprendido (📘 Guía y Repaso) e inténtalo de nuevo." : "";
    return '<div class="jc"><div class="fin"><div class="es" aria-label="' + f.est + ' estrellas">' + "★".repeat(f.est) + '<span style="color:var(--gris2)">' + "★".repeat(3 - f.est) + "</span></div><h2>" + titulo + '</h2><div class="st2">' + esc(sub) + '</div><div class="nums"><div><b>' + f.pct + ' %</b><span>A la primera</span></div><div><b>+' + f.xp + '</b><span>Puntos</span></div><div><b>🔥 ' + f.racha + "</b><span>Racha</span></div></div>" +
      (f.rev.length ? '<div class="lbl">Para repasar</div><div class="rev">' + f.rev.map(function (it) { return "<div><b>" + esc(it.t) + "</b> · " + esc(it.es) + "</div>"; }).join("") + "</div>" : '<div class="st2">¡Sin errores que repasar! 🎉</div>') + '</div></div><div class="jf"><button class="btn pri" data-a="jfin">Continuar</button></div>';
  }
  function terminarSesion() {
    var s = P.ses, pct = M.pctSesion(s), hoyS = M.hoy(), c = P.c, cat = c.cat, srs = srsMap(db.aj.idioma), xp, aprobado = false;
    M.registrarSesion(srs, s, cat, hoyS);
    var vistos = {}; s.cola.forEach(function (e) { String(e.item).split(",").forEach(function (id) { vistos[id] = 1; }); });
    var tocadas = {}; Object.keys(vistos).forEach(function (id) { if (!srs[id]) return; var lid = id.split("#")[0]; if (!db.lec[lid]) { if (P.modo === "lec" && lid === P.L.id) db.lec[lid] = { id: lid, e: 0, p: 0, n: 0 }; else return; } db.lec[lid].srs = db.lec[lid].srs || {}; db.lec[lid].srs[id] = [srs[id].b, srs[id].d]; tocadas[lid] = 1; });
    var est = M.estrellas(pct);
    if (P.modo === "lec") { var d = db.lec[P.L.id]; d.e = Math.max(d.e || 0, est); d.p = Math.max(d.p || 0, pct); d.n = (d.n || 0) + 1; d.f = hoyS; tocadas[P.L.id] = 1; xp = M.xpLeccion(pct); }
    else if (P.modo === "exa") { aprobado = M.apruebaExamen(pct); var xpA = P.nivel ? 50 : 25; var x = db.exa[P.u.id] || { id: P.u.id, p: 0, ok: false, n: 0 }; x.p = Math.max(x.p, pct); x.ok = x.ok || aprobado; x.n++; x.f = hoyS; db.exa[P.u.id] = x; touch("examen", x.id, x); xp = aprobado ? xpA : 5; est = aprobado ? M.estrellas(pct) : 1; }
    else xp = 5;
    Object.keys(tocadas).forEach(function (lid) { touch("leccion", lid, db.lec[lid]); });
    var dd = db.dia[hoyS] || { f: hoyS, xp: 0, n: 0 }; dd.xp += xp; if (P.modo === "lec") dd.n++; db.dia[hoyS] = dd; touch("dia", hoyS, dd);
    var rev = Object.keys(s.errores).map(function (id) { return cat[id]; }).filter(function (it) { return it && it.tipo === "p"; }).slice(0, 8);
    P.fin = { pct: pct, est: est, xp: xp, racha: M.racha(diasMapa(), hoyS), rev: rev, aprobado: aprobado }; P.fase = "fin"; sonido(true); pintarJ();
  }
  function comprobar() {
    var e = P.e, ok = false, nota = "", items = null;
    if (["elegir", "escuchar", "hueco"].indexOf(e.tipo) >= 0) ok = !!e.opciones[P.sel].ok;
    else if (e.tipo === "ordenar") ok = M.evaluar(P.tok.map(function (i) { return e.tokens[i]; }).join(" "), e.correcta).ok;
    else { var ev = M.evaluar(P.txt, e.correcta); ok = ev.ok; nota = ev.nota; }
    P.fb = { ok: ok, nota: nota, items: items }; sonido(ok); pintarJ();
    if (e.tipo === "hueco") hablar(e.completa); else if (e.tipo === "ordenar" || e.tipo === "escribir") hablar(e.correcta);
  }
  function continuar() { var fb = P.fb; M.responder(P.ses, fb.ok, fb.items); if (P.ses.fin) terminarSesion(); else siguienteEj(); }
  function parejaTap(s, id) {
    var p = P.par; if (p.hechos[id]) return;
    if (!p.sel || p.sel.s === s) { p.sel = { s: s, id: id }; pintarJ(); return; }
    if (p.sel.id === id) { p.hechos[id] = true; p.sel = null; sonido(true); }
    else { p.err++; p.mal[p.sel.id] = 1; p.mal[id] = 1; sonido(false); p.sel = null; }
    pintarJ();
    if (Object.keys(p.hechos).length === P.e.pares.length) { P.fb = { ok: p.err === 0, nota: "", items: Object.keys(p.mal) }; setTimeout(pintarJ, 250); }
  }

  /* ---------- actualización automática ---------- */
  function buscarActualizacion() {
    if (S.upd || !window.fetch) return;
    fetch("idiomas.js?nc=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
      var m = /VERSION = "([^"]+)"/.exec(t); if (!m || m[1] === VERSION) return; S.upd = m[1];
      var b = document.createElement("button"); b.id = "upd"; b.setAttribute("data-a", "actualizar"); b.innerHTML = "<b>Hay una versión nueva (" + esc(m[1]) + ")</b><span>Toca para actualizar</span>"; document.body.appendChild(b);
    }).catch(function () {});
  }

  /* ---------- acciones ---------- */
  var A = {
    tab: function (el) { S.tab = el.dataset.t; $("#app").scrollTop = 0; pintar(); }, mcerrar: cerrar,
    idi: hojaIdiomas,
    setidi: function (el) { db.aj.idioma = el.dataset.v; touch("ajustes", "a", db.aj); cerrar(); cargarCurso(db.aj.idioma).then(function () { pintar(); }); },
    guia: function (el) { hojaGuia(+el.dataset.u); },
    nodo: function (el) { if (el.dataset.nv !== undefined) hojaNivel(+el.dataset.nv); else hojaNodo(+el.dataset.u, +el.dataset.i); },
    empezarniv: function (el) { var c = curso(), nv = c.niveles[+el.dataset.nv], pu = { id: db.aj.idioma + "-" + nv.id, lecciones: [] }; nv.unidades.forEach(function (u) { pu.lecciones = pu.lecciones.concat(u.lecciones); }); iniciar("exa", c, pu, null, M.generarExamen(pu, Date.now() % 100000, 40)); P.nivel = true; },
    empezarlec: function (el) { var c = curso(), u = c.unidades[+el.dataset.u], L = u.lecciones[+el.dataset.i]; iniciar("lec", c, u, L, M.generarLeccion(L, u, Date.now() % 100000)); },
    empezarexa: function (el) { var c = curso(), u = c.unidades[+el.dataset.u]; iniciar("exa", c, u, null, M.generarExamen(u, Date.now() % 100000, 20)); },
    repasar: function () { var c = curso(), ids = vencidosHoy(); if (!ids.length) return; iniciar("rep", c, null, null, M.generarRepaso(ids, c.cat, Date.now() % 100000, 12)); },
    meta: function (el) { db.aj.meta = +el.dataset.v; touch("ajustes", "a", db.aj); pintar(); },
    lento: function (el) { db.aj.lento = el.checked; touch("ajustes", "a", db.aj); }, sonidos: function (el) { db.aj.sonido = el.checked; touch("ajustes", "a", db.aj); },
    puedo: function (el) { var u = curso().unidades[+el.dataset.u], a = db.aj.puedo[u.id] || [], i = +el.dataset.i, p = a.indexOf(i); if (el.checked && p < 0) a.push(i); if (!el.checked && p >= 0) a.splice(p, 1); db.aj.puedo[u.id] = a; touch("ajustes", "a", db.aj); },
    sync: function () { sync(true).then(pintar); },
    oirp: function (el) { hablar(el.dataset.t); }, oirpl: function (el) { hablar(el.dataset.t, true); },
    oir: function () { if (P && P.e) hablar(P.e.audio); }, oirl: function () { if (P && P.e) hablar(P.e.audio, true); },
    tsig: function () { if (P.ti < P.tarj.length - 1) { P.ti++; pintarJ(); } else { P.fase = "ej"; siguienteEj(); } },
    op: function (el) { if (P.fb) return; P.sel = +el.dataset.i; pintarJ(); if (P.e.tipo === "elegir" && P.e.dir === "et") hablar(P.e.opciones[P.sel].txt); },
    tk: function (el) { if (P.fb) return; P.tok.push(+el.dataset.i); pintarJ(); }, tq: function (el) { if (P.fb) return; P.tok.splice(+el.dataset.n, 1); pintarJ(); },
    par: function (el) { if (P.fb) return; parejaTap(el.dataset.s, el.dataset.id); },
    pista: function () { var d = $("#pista"); if (d && P.e.pron) d.innerHTML = '<div class="prn" style="margin-top:8px">' + esc(P.e.pron) + "</div>"; },
    chk: function () { if (!listoParaComprobar() || P.fb) return; comprobar(); },
    sig: function () { if (P.fb) continuar(); },
    jx: function () { if (P && P.fase === "fin") { A.jfin(); return; } if (confirm("¿Salir de la lección? Perderás el avance de esta práctica.")) salirJ(); },
    jfin: function () { salirJ(); },
    actualizar: function () {
      var fin = function () { location.reload(); };
      Promise.resolve().then(function () { return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : null; })
        .then(function () { return navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }) : null; }).then(fin, fin);
    }
  };
  document.addEventListener("click", function (e) { var el = e.target.closest("[data-a]"); if (!el) return; var f = A[el.dataset.a]; if (!f) return; if (el.type !== "checkbox") e.preventDefault(); e.stopPropagation(); f(el); });
  document.addEventListener("input", function (e) {
    if (e.target.id === "jt" && P) { P.txt = e.target.value; var b = $(".jf .btn[data-a=chk]"); if (b) b.disabled = !P.txt.trim(); }
    if (e.target.id === "vq") { S.vq = e.target.value; pintar(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "jt" && P) { e.preventDefault(); if (P.fb) A.sig(); else A.chk(); }
    if (e.key === "Escape" && !$("#modal").hidden) cerrar();
  });
  (function () {
    var y0 = null, dy = 0, caja = null, m = $("#modal");
    m.addEventListener("touchstart", function (e) { caja = e.target.closest(".caja"); if (!caja || caja.scrollTop > 0) { caja = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    m.addEventListener("touchmove", function (e) { if (!caja || y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { caja.style.transition = "none"; caja.style.transform = "translateY(" + dy + "px)"; } else dy = 0; }, { passive: true });
    m.addEventListener("touchend", function () { if (!caja) return; if (dy > 110) cerrar(); else { caja.style.transition = "transform .2s"; caja.style.transform = ""; } y0 = null; dy = 0; caja = null; });
  })();

  /* ---------- arranque ---------- */
  function boot() {
    window.ID_DEBUG = { db: function () { return db; }, S: S, A: A, P: function () { return P; }, M: M };
    cargarCurso(db.aj.idioma).then(function () { pintar(); return sync(false); }).then(function () { return cargarCurso(db.aj.idioma); }).then(function () { pintar(); buscarActualizacion(); }).catch(function () { $("#app").innerHTML = '<div class="vacio"><b>No se pudo cargar el curso</b>Abre la app con internet una vez.</div>'; });
        if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  FergardAcceso.iniciar({
    app: "idiomas", nombre: "Idiomas", clientId: CFG.CLIENT_ID, onListo: boot,
    tema: { bg: "#F1FAF9", fg: "#0B3B40", mut: "#3E6A6D", acento: "#0E7C86", btnBg: "#0E7C86", btnFg: "#FFFFFF", font: "'Trebuchet MS','Segoe UI',system-ui,sans-serif" },
    marca: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#0E7C86" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M20 9a2 2 0 0 1 1 2v5a1 1 0 0 1-1 1h-1v2l-3-2"/></svg>'
  });
})();
