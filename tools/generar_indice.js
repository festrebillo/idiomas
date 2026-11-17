// Genera data/cursos.json (qué unidades existen por idioma y nivel) y la lista de archivos del service worker.
// Uso: node tools/generar_indice.js   (ejecutar cada vez que se añade una unidad)
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), data = path.join(raiz, 'data');
const plan = JSON.parse(fs.readFileSync(path.join(data, 'plan.json'), 'utf8'));
const out = {}, archivos = [];
for (const idioma of ['en', 'pt', 'it']) {
  const dir = path.join(data, idioma); if (!fs.existsSync(dir)) continue;
  const niveles = [];
  for (const n of plan.niveles) {
    const us = fs.readdirSync(dir).filter(f => new RegExp('^' + n.id + '-u\\d+\\.json$').test(f)).sort((a, b) => +a.match(/u(\d+)/)[1] - +b.match(/u(\d+)/)[1]);
    if (!us.length) continue;
    const ids = us.map(f => f.replace('.json', '')); us.forEach(f => archivos.push('data/' + idioma + '/' + f));
    niveles.push({ id: n.id, unidades: ids, total: n.unidades.length, completo: ids.length === n.unidades.length });
  }
  out[idioma] = { niveles };
}
fs.writeFileSync(path.join(data, 'cursos.json'), JSON.stringify(out, null, 2) + '\n');
const sw = path.join(raiz, 'sw.js'); let s = fs.readFileSync(sw, 'utf8');
const base = ['./', 'index.html', 'idiomas.css', 'idiomas.js', 'motor.js', 'acceso.js', 'config.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'data/cursos.json', 'data/plan.json'];
s = s.replace(/const FILES = \[[\s\S]*?\];/, 'const FILES = ' + JSON.stringify(base.concat(archivos)) + ';');
fs.writeFileSync(sw, s);
console.log(Object.keys(out).map(i => i + ': ' + out[i].niveles.map(n => n.id + ' ' + n.unidades.length + '/' + n.total + (n.completo ? ' ✓' : '')).join(' · ')).join('\n'));
