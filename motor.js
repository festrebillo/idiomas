/* Motor del curso de idiomas: genera ejercicios a partir del contenido, corrige, calcula repaso espaciado, estrellas y racha.
   Funciones puras (sin pantalla): se prueban con node (fergard-api/test_motor.js). */
(function (root) {
  "use strict";
  var INTERVALOS = [0, 1, 3, 7, 21, 60];   // días hasta el próximo repaso según la «caja» (0 a 5)
  var UMBRAL_EXAMEN = 85;

  /* ---------- utilidades ---------- */
  function rng(semilla) { var s = (semilla >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function mezclar(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sinTildes(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function norm(s) { return sinTildes(String(s || "").toLowerCase().replace(/[’‘`´]/g, "'")).replace(/'/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function fstr(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function hoy() { return fstr(new Date()); }
  function sumarDias(f, n) { var a = f.split("-"), d = new Date(+a[0], +a[1] - 1, +a[2]); d.setDate(d.getDate() + n); return fstr(d); }
  function unicos(arr, clave) { var v = {}, o = []; arr.forEach(function (x) { var k = clave(x); if (!v[k]) { v[k] = 1; o.push(x); } }); return o; }

  /* ---------- corrección de respuestas escritas ---------- */
  function evaluar(resp, correcta) {   // acepta mayúsculas, puntuación y apóstrofes distintos; avisa si faltaron tildes
    var a = norm(resp), b = norm(correcta);
    if (!a) return { ok: false, nota: "" };
    if (a !== b) return { ok: false, nota: "" };
    var sensible = function (s) { return String(s || "").toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,;:!?¿¡"]/g, "").replace(/\s+/g, " ").trim(); };
    var nota = sensible(resp).replace(/'/g, "") !== sensible(correcta).replace(/'/g, "") ? "Ojo con las tildes: " + correcta : "";
    return { ok: true, nota: nota };
  }

  /* ---------- catálogo de ítems (palabras y frases con id estable) ---------- */
  function itemsDe(L) {
    var o = []; (L.palabras || []).forEach(function (w, i) { o.push({ id: L.id + "#p" + i, tipo: "p", t: w.t, es: w.es, pron: w.pron || "", ej: w.ej || "", ejes: w.ejes || "", lec: L.id }); });
    (L.frases || []).forEach(function (f, i) { o.push({ id: L.id + "#f" + i, tipo: "f", t: f.t, es: f.es, pron: f.pron || "", ej: "", ejes: "", lec: L.id }); });
    return o;
  }
  function indexar(unidades) { var m = {}; unidades.forEach(function (u) { u.lecciones.forEach(function (L) { itemsDe(L).forEach(function (it) { it.uni = u.id; m[it.id] = it; }); }); }); return m; }

  /* ---------- generación de ejercicios ---------- */
  function distractoresEs(it, pool, r, n) {   // significados incorrectos distintos del correcto
    var c = mezclar(pool.filter(function (x) { return x.id !== it.id && norm(x.es) !== norm(it.es) && norm(x.t) !== norm(it.t); }), r), out = [], vistos = {};
    vistos[norm(it.es)] = 1;
    for (var i = 0; i < c.length && out.length < n; i++) { var k = norm(c[i].es); if (!vistos[k]) { vistos[k] = 1; out.push(c[i]); } }
    return out;
  }
  function distractoresT(it, pool, r, n) {
    var c = mezclar(pool.filter(function (x) { return x.id !== it.id && norm(x.t) !== norm(it.t); }), r), out = [], vistos = {};
    vistos[norm(it.t)] = 1;
    for (var i = 0; i < c.length && out.length < n; i++) { var k = norm(c[i].t); if (!vistos[k]) { vistos[k] = 1; out.push(c[i]); } }
    return out;
  }
  function exElegir(it, pool, r, dir) {
    if (dir === "te") {
      var d = distractoresEs(it, pool, r, 3), op = mezclar([{ txt: it.es, ok: true, item: it.id }].concat(d.map(function (x) { return { txt: x.es, ok: false, item: x.id }; })), r);
      return { tipo: "elegir", dir: "te", item: it.id, pregunta: it.t, pron: it.pron, audio: it.t, opciones: op, correcta: it.es };
    }
    var d2 = distractoresT(it, pool, r, 3), op2 = mezclar([{ txt: it.t, ok: true, item: it.id }].concat(d2.map(function (x) { return { txt: x.t, ok: false, item: x.id }; })), r);
    return { tipo: "elegir", dir: "et", item: it.id, pregunta: it.es, audio: null, opciones: op2, correcta: it.t };
  }
  function exEscuchar(it, pool, r) {
    var d = distractoresT(it, pool, r, 3), op = mezclar([{ txt: it.t, ok: true, item: it.id }].concat(d.map(function (x) { return { txt: x.t, ok: false, item: x.id }; })), r);
    return { tipo: "escuchar", item: it.id, audio: it.t, opciones: op, correcta: it.t, traduccion: it.es };
  }
  function exHueco(it, pool, r) {
    if (!it.ej) return null;
    var re = new RegExp("(^|[^\\p{L}])(" + it.t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")($|[^\\p{L}])", "iu"), m = re.exec(it.ej); if (!m) return null;
    var hallada = m[2], inicio = m.index + m[1].length, frase = it.ej.slice(0, inicio) + "_____" + it.ej.slice(inicio + hallada.length);
    var d = distractoresT(it, pool.filter(function (x) { return x.tipo === "p" && x.t.split(/\s+/).length === it.t.split(/\s+/).length; }), r, 3);
    if (d.length < 3) { var ya = {}; d.forEach(function (x) { ya[norm(x.t)] = 1; }); distractoresT(it, pool.filter(function (x) { return x.tipo === "p"; }), r, 8).forEach(function (x) { if (d.length < 3 && !ya[norm(x.t)]) { ya[norm(x.t)] = 1; d.push(x); } }); }
    var may = hallada.charAt(0) !== hallada.charAt(0).toLowerCase() && inicio === 0, op = mezclar([{ txt: hallada, ok: true, item: it.id }].concat(d.map(function (x) { var t = x.t; return { txt: may ? t.charAt(0).toUpperCase() + t.slice(1) : t.charAt(0).toLowerCase() + t.slice(1), ok: false, item: x.id }; })), r);
    return { tipo: "hueco", item: it.id, frase: frase, completa: it.ej, ayuda: it.ejes, audio: it.ej, opciones: op, correcta: hallada };
  }
  function exOrdenar(it, pool, r) {
    var toks = it.t.split(/\s+/), claves = {}; toks.forEach(function (t) { claves[norm(t)] = 1; });
    var otros = []; pool.forEach(function (x) { if (x.tipo === "f" && x.id !== it.id) x.t.split(/\s+/).forEach(function (t) { var k = norm(t); if (k && !claves[k]) { claves[k] = 1; otros.push(t); } }); });
    var extra = mezclar(otros, r).slice(0, toks.length > 3 ? 2 : 1);
    return { tipo: "ordenar", item: it.id, pregunta: it.es, pron: it.pron, audio: it.t, tokens: mezclar(toks.concat(extra), r), correcta: it.t };
  }
  function exEscribir(it, r) { return { tipo: "escribir", item: it.id, pregunta: it.es, pron: it.pron, audio: null, correcta: it.t }; }
  function exDictado(it) { return { tipo: "dictado", item: it.id, audio: it.t, correcta: it.t, traduccion: it.es }; }
  function exParejas(grupo, r) { return { tipo: "parejas", item: grupo.map(function (x) { return x.id; }).join(","), pares: grupo.map(function (x) { return { t: x.t, es: x.es, item: x.id }; }), orden: mezclar(grupo.map(function (x) { return x.id; }), r) }; }

  function generarLeccion(L, unidad, semilla) {   // ≈ 22 a 26 ejercicios, cada palabra aparece al menos 2 veces
    var r = rng(semilla || 7), items = itemsDe(L), P = items.filter(function (x) { return x.tipo === "p"; }), F = items.filter(function (x) { return x.tipo === "f"; });
    var poolU = []; (unidad && unidad.lecciones ? unidad.lecciones : [L]).forEach(function (l) { poolU = poolU.concat(itemsDe(l)); });
    var pool = P.concat(F).concat(poolU.filter(function (x) { return x.lec !== L.id; }));
    var poolP = pool.filter(function (x) { return x.tipo === "p"; }), poolF = pool.filter(function (x) { return x.tipo === "f"; });
    var ex = [], i;
    var ordenP = mezclar(P, r);
    // fase 1: reconocer (elegir y escuchar)
    ordenP.forEach(function (it, k) { ex.push(k % 3 === 2 ? exEscuchar(it, poolP, r) : exElegir(it, poolP, r, "te")); });
    // fase 2: emparejar
    var mitad = Math.ceil(P.length / 2); if (P.length >= 4) { ex.push(exParejas(P.slice(0, mitad), r)); ex.push(exParejas(P.slice(mitad), r)); }
    // fase 3: recordar (del español a la lengua, y huecos)
    mezclar(P, r).slice(0, Math.min(6, P.length)).forEach(function (it, k) { var h = k % 2 === 0 ? exHueco(it, poolP, r) : null; ex.push(h || exElegir(it, poolP, r, "et")); });
    // fase 4: frases
    mezclar(F, r).slice(0, 4).forEach(function (it) { ex.push(exOrdenar(it, poolF.length ? poolF : F, r)); });
    // fase 5: escribir y dictado
    mezclar(P, r).slice(0, Math.min(3, P.length)).forEach(function (it) { ex.push(exEscribir(it, r)); });
    mezclar(F, r).slice(0, 2).forEach(function (it) { ex.push(exDictado(it)); });
    return ex;
  }

  function generarExamen(unidad, semilla, n) {   // examen de unidad: mezcla las 5 lecciones, sin segundas oportunidades por pregunta
    var r = rng(semilla || 11), items = [], pool = []; unidad.lecciones.forEach(function (L) { items = items.concat(itemsDe(L)); });
    pool = items; var P = items.filter(function (x) { return x.tipo === "p"; }), F = items.filter(function (x) { return x.tipo === "f"; }), ex = [], tipos = ["elegir_te", "escuchar", "elegir_et", "hueco", "ordenar", "escribir", "dictado"];
    var cand = mezclar(P.concat(F), r), k = 0; n = n || 20;
    for (var i = 0; i < cand.length && ex.length < n; i++) {
      var it = cand[i], tipo = tipos[(k++) % tipos.length], e = null;
      if (it.tipo === "p") { if (tipo === "elegir_te") e = exElegir(it, P, r, "te"); else if (tipo === "elegir_et") e = exElegir(it, P, r, "et"); else if (tipo === "escuchar") e = exEscuchar(it, P, r); else if (tipo === "hueco") e = exHueco(it, P, r); else if (tipo === "escribir") e = exEscribir(it, r); }
      else { if (tipo === "ordenar") e = exOrdenar(it, F, r); else if (tipo === "dictado") e = exDictado(it); else if (tipo === "escribir") e = exEscribir(it, r); }
      if (!e) e = it.tipo === "p" ? exElegir(it, P, r, "te") : exOrdenar(it, F, r);
      ex.push(e);
    }
    return ex;
  }

  function generarRepaso(ids, catalogo, semilla, max) {   // ejercicios de repaso para ítems vencidos
    var r = rng(semilla || 3), items = ids.map(function (id) { return catalogo[id]; }).filter(Boolean), pool = Object.keys(catalogo).map(function (k) { return catalogo[k]; }), P = pool.filter(function (x) { return x.tipo === "p"; }), ex = [];
    mezclar(items, r).slice(0, max || 12).forEach(function (it, k) {
      if (it.tipo === "p") ex.push(k % 3 === 0 ? exEscribir(it, r) : k % 3 === 1 ? exEscuchar(it, P, r) : exElegir(it, P, r, "te"));
      else ex.push(k % 2 ? exDictado(it) : exOrdenar(it, pool.filter(function (x) { return x.tipo === "f"; }), r));
    });
    return ex;
  }

  /* ---------- sesión: cola de ejercicios con reintento de errores ---------- */
  function crearSesion(ejercicios, opciones) {
    opciones = opciones || {};
    return { cola: ejercicios.slice(), i: 0, total: ejercicios.length, primeros: 0, intentos: 0, errores: {}, vistos: {}, examen: !!opciones.examen, fin: false };
  }
  function actual(s) { return s.cola[s.i] || null; }
  function responder(s, correcto, itemsFallados) {   // itemsFallados: ids de ítems que causaron el error (para repaso)
    var e = actual(s); if (!e) return s;
    var primera = !s.vistos[s.i + ":" + e.tipo + ":" + e.item];
    if (!e.reintento) { s.intentos++; if (correcto) s.primeros++; }
    if (!correcto) { (itemsFallados && itemsFallados.length ? itemsFallados : String(e.item).split(",")).forEach(function (id) { s.errores[id] = (s.errores[id] || 0) + 1; }); if (!s.examen && !e.reintento) { var c = {}; for (var k in e) c[k] = e[k]; c.reintento = true; s.cola.push(c); } else if (!s.examen && e.reintento) { var c2 = {}; for (var k2 in e) c2[k2] = e[k2]; s.cola.push(c2); } }
    s.i++; if (s.i >= s.cola.length) s.fin = true; return s;
  }
  function pctSesion(s) { return s.intentos ? Math.round(100 * s.primeros / s.intentos) : 0; }
  function estrellas(pct) { return pct >= 90 ? 3 : pct >= 75 ? 2 : 1; }
  function xpLeccion(pct) { return 10 + (pct >= 90 ? 5 : pct >= 75 ? 2 : 0); }
  function apruebaExamen(pct) { return pct >= UMBRAL_EXAMEN; }

  /* ---------- repetición espaciada ---------- */
  function siguienteEstado(est, ok, hoyS) {
    var b = est && typeof est.b === "number" ? est.b : 0; b = ok ? Math.min(5, b + 1) : 0;
    return { b: b, d: sumarDias(hoyS || hoy(), INTERVALOS[b]) };
  }
  function registrarSesion(srs, s, catalogo, hoyS) {   // actualiza el estado de cada ítem tocado: acierto a la primera = sube, error = vuelve a la caja 0
    Object.keys(s.errores).forEach(function (id) { if (catalogo[id]) srs[id] = siguienteEstado(srs[id], false, hoyS); });
    var vistos = {}; s.cola.forEach(function (e) { String(e.item).split(",").forEach(function (id) { vistos[id] = 1; }); });
    Object.keys(vistos).forEach(function (id) { if (catalogo[id] && !s.errores[id]) srs[id] = siguienteEstado(srs[id], true, hoyS); });
    return srs;
  }
  function vencidos(srs, hoyS) { return Object.keys(srs).filter(function (id) { return srs[id] && srs[id].d <= hoyS; }).sort(function (a, b) { return srs[a].d < srs[b].d ? -1 : 1; }); }
  function dominio(ids, srs) {   // 0-100: qué tan firme está lo aprendido (cajas 0 a 5)
    var vis = ids.filter(function (id) { return srs[id]; }); if (!vis.length) return 0;
    return Math.round(100 * vis.reduce(function (a, id) { return a + srs[id].b; }, 0) / (vis.length * 5));
  }

  /* ---------- racha ---------- */
  function racha(dias, hoyS) {   // dias: { 'YYYY-MM-DD': true }. Hoy sin actividad todavía no rompe la racha.
    var f = dias[hoyS] ? hoyS : sumarDias(hoyS, -1), n = 0; while (dias[f]) { n++; f = sumarDias(f, -1); } return n;
  }

  var api = { INTERVALOS: INTERVALOS, UMBRAL_EXAMEN: UMBRAL_EXAMEN, rng: rng, mezclar: mezclar, norm: norm, hoy: hoy, sumarDias: sumarDias, evaluar: evaluar, itemsDe: itemsDe, indexar: indexar,
    generarLeccion: generarLeccion, generarExamen: generarExamen, generarRepaso: generarRepaso, crearSesion: crearSesion, actual: actual, responder: responder, pctSesion: pctSesion, estrellas: estrellas,
    xpLeccion: xpLeccion, apruebaExamen: apruebaExamen, siguienteEstado: siguienteEstado, registrarSesion: registrarSesion, vencidos: vencidos, dominio: dominio, racha: racha };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.IMotor = api;
})(typeof window !== "undefined" ? window : this);
