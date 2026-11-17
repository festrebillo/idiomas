// Valida los archivos de contenido del curso: node tools/validar.js [carpeta-opcional]
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..', 'data');
let errores = 0, avisos = 0, unidades = 0, lecciones = 0, palabras = 0, frases = 0;
const err = (f, m) => { errores++; console.log('ERROR ' + f + ': ' + m); };
const avi = (f, m) => { avisos++; console.log('aviso ' + f + ': ' + m); };
const idiomas = ['en', 'pt', 'it'];
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const limpio = (s) => typeof s === 'string' && s.trim() === s && s.length > 0 && !/[<>\n\r\t]/.test(s);
const filtro = process.argv[2];
for (const id of idiomas) {
  const dir = path.join(raiz, id); if (!fs.existsSync(dir)) continue;
  for (const arch of fs.readdirSync(dir).filter(x => /^a1-u\d+\.json$/.test(x)).sort()) {
    if (filtro && !(id + '/' + arch).includes(filtro)) continue;
    const F = id + '/' + arch; let u;
    try { u = JSON.parse(fs.readFileSync(path.join(dir, arch), 'utf8')); } catch (e) { err(F, 'JSON inválido: ' + e.message); continue; }
    unidades++;
    const n = +arch.match(/u(\d+)/)[1];
    if (u.id !== id + '-a1-u' + n) err(F, 'id esperado ' + id + '-a1-u' + n + ' y es ' + u.id);
    if (u.idioma !== id || u.nivel !== 'A1' || u.n !== n) err(F, 'idioma/nivel/n incorrectos');
    if (!limpio(u.titulo) || !limpio(u.resumen)) err(F, 'titulo/resumen vacíos o con caracteres no permitidos');
    if (!Array.isArray(u.puedo) || u.puedo.length < 4 || u.puedo.length > 6) err(F, '«puedo» debe tener 4 a 6 elementos');
    const g = u.gramatica || {};
    if (!limpio(g.titulo) || typeof g.texto !== 'string' || g.texto.length < 60 || g.texto.length > 1100) err(F, 'gramatica.texto debe tener 60 a 1100 caracteres');
    if (!Array.isArray(g.tabla) || g.tabla.length < 3 || g.tabla.some(r => !Array.isArray(r) || r.length < 2 || r.some(c => typeof c !== 'string' || !c))) err(F, 'gramatica.tabla: mínimo 3 filas [t, es, (pron)]');
    if (!Array.isArray(g.errores) || g.errores.length < 1 || g.errores.length > 3) err(F, 'gramatica.errores: 1 a 3');
    if (!Array.isArray(u.practica) || u.practica.length < 3 || u.practica.length > 4) err(F, '«practica»: 3 o 4 tareas');
    if (!Array.isArray(u.lecciones) || u.lecciones.length !== 5) { err(F, 'deben ser exactamente 5 lecciones'); continue; }
    const vistas = new Set();
    u.lecciones.forEach((L, i) => {
      lecciones++; const P = F + ' L' + (i + 1);
      if (L.id !== id + '-a1-u' + n + '-l' + (i + 1) || L.n !== i + 1) err(P, 'id/n incorrectos');
      if (!limpio(L.titulo) || !limpio(L.objetivo) || typeof L.intro !== 'string' || L.intro.length < 20) err(P, 'titulo/objetivo/intro incompletos');
      const W = L.palabras || [], Fr = L.frases || [];
      if (W.length < 7 || W.length > 10) err(P, 'palabras: 7 a 10 (hay ' + W.length + ')');
      if (Fr.length < 4 || Fr.length > 6) err(P, 'frases: 4 a 6 (hay ' + Fr.length + ')');
      const ts = new Set();
      W.forEach((w, k) => {
        palabras++;
        if (!limpio(w.t) || !limpio(w.es) || !limpio(w.pron)) err(P, 'palabra ' + (k + 1) + ' sin t/es/pron válidos');
        if (w.t && ts.has(norm(w.t))) err(P, 'palabra repetida: ' + w.t); ts.add(norm(w.t || ''));
        if (w.ej) { if (!limpio(w.ejes)) err(P, 'palabra «' + w.t + '» tiene ej pero no ejes');
          if (!new RegExp('(^|[^\\p{L}])' + w.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'iu').test(w.ej)) err(P, 'el ejemplo de «' + w.t + '» no contiene la palabra tal cual: «' + w.ej + '»'); }
        if (w.cog !== undefined && typeof w.cog !== 'boolean') err(P, 'cog debe ser true/false');
        vistas.add(norm(w.t || ''));
      });
      Fr.forEach((f, k) => { frases++; if (!limpio(f.t) || !limpio(f.es) || !limpio(f.pron)) err(P, 'frase ' + (k + 1) + ' sin t/es/pron válidos'); if (f.t && f.t.split(/\s+/).length < 2) avi(P, 'frase de una palabra: ' + f.t); });
      const D = L.dialogo || {}; const lin = D.lineas || [];
      if (!limpio(D.titulo) || lin.length < 4 || lin.length > 6) err(P, 'dialogo: titulo y 4 a 6 líneas');
      lin.forEach((l, k) => { if (!['A', 'B'].includes(l.q) || !limpio(l.t) || !limpio(l.es)) err(P, 'línea ' + (k + 1) + ' del diálogo inválida'); });
      if (L.nota !== undefined && typeof L.nota !== 'string') err(P, 'nota debe ser texto');
    });
  }
}
console.log('\nUnidades ' + unidades + ' · lecciones ' + lecciones + ' · palabras ' + palabras + ' · frases ' + frases + ' · avisos ' + avisos);
console.log(errores ? errores + ' ERRORES' : 'TODO OK'); process.exit(errores ? 1 : 0);
