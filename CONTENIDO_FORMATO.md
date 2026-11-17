# Formato del contenido del curso (idiomas-app/data)

Cada **unidad** es un archivo JSON: `data/<idioma>/<nivel>-u<N>.json` (nivel en minúscula: `a1`, `a2`, `b1`, `b2`, `c1`) (idiomas: `en` inglés, `pt` portugués de Brasil, `it` italiano). El alumno es **hispanohablante (español de Perú)**; todas las explicaciones, traducciones y trucos van en **español**.

El motor genera los ejercicios solo (elegir significado, escuchar, emparejar, ordenar frase, completar hueco, escribir, dictado), así que el contenido debe ser **claro, correcto y muy pedagógico**: lo que se escriba aquí es lo que el alumno aprende.

## Estructura

```json
{
  "id": "en-a1-u1",   // <idioma>-<nivel>-u<N>
  "idioma": "en",
  "nivel": "A1",
  "n": 1,
  "titulo": "Saludos y presentaciones",
  "resumen": "Una frase en español: qué aprenderás en esta unidad.",
  "puedo": ["Saludar y despedirme.", "Decir mi nombre.", "…"],
  "gramatica": {
    "titulo": "El verbo to be (ser / estar)",
    "texto": "Explicación corta y amable en español. Párrafos separados por \\n. Máx. 900 caracteres.",
    "tabla": [["I am", "yo soy / estoy", "ai am"], ["you are", "tú eres / estás", "iu ar"]],
    "errores": ["Error típico de hispanohablantes y cómo evitarlo."]
  },
  "practica": ["Tarea FUERA de la app con minutos (escuchar, leer, decir en voz alta, escribir). 3 o 4 tareas."],
  "lecciones": [
    {
      "id": "en-a1-u1-l1",
      "n": 1,
      "titulo": "Hola y adiós",
      "objetivo": "Qué sabrá hacer el alumno al terminar esta lección (una frase).",
      "intro": "1 a 3 frases en español, tono cercano, con un truco para recordar.",
      "palabras": [
        { "t": "hello", "es": "hola", "pron": "jelóu", "ej": "Hello, Ana!", "ejes": "¡Hola, Ana!", "cog": false, "truco": "opcional: regla para recordarla" }
      ],
      "frases": [
        { "t": "Good morning!", "es": "¡Buenos días!", "pron": "gud mórnin" }
      ],
      "dialogo": {
        "titulo": "Nombre del diálogo",
        "lineas": [ { "q": "A", "t": "Good morning!", "es": "¡Buenos días!" } ]
      },
      "nota": "opcional: dato de uso o cultural que ayude"
    }
  ]
}
```

## Reglas obligatorias

1. **5 lecciones por unidad**, `n` de 1 a 5, ids `<idioma>-a1-u<N>-l<n>`. La lección 5 de cada unidad es de **repaso y consolidación** (mezcla lo anterior y añade lo que falte).
2. Por lección: **7 a 10 `palabras`**, **4 a 6 `frases`**, un `dialogo` de **4 a 6 líneas** (dos personas A y B) que use lo aprendido.
3. **Fácil de aprender:** progresión muy gradual. No uses en una lección palabras o estructuras que aún no se enseñaron (salvo las que aparezcan como parte de la misma lección). Las frases de lecciones posteriores pueden reutilizar lo anterior.
4. `pron` = **pronunciación figurada para hispanohablantes**, escrita con letras del español (ej.: *hello → jelóu*, *water → uóter*, portugués *obrigado → obrigádu*, italiano *ciao → chao*, *gelato → yelato*). Siempre con tilde en la sílaba fuerte. Obligatoria en `palabras` y `frases` (en `dialogo` no).
5. `ej` debe **contener exactamente la palabra `t`** (misma forma escrita) para poder generar «completar el hueco». Si la palabra no cabe en una frase natural, deja `ej` y `ejes` vacíos `""`.
6. `cog: true` cuando la palabra se parece al español (cognado), p. ej. *family, hotel, music*. Ayuda mucho a aprender rápido.
7. `t` únicos dentro de cada lección. Sin HTML, sin comillas tipográficas raras, sin saltos de línea dentro de `t`/`es`.
8. `es` = traducción **natural** al español latinoamericano (no literal). Si hay varias, usa la más común. Sin explicaciones largas.
9. Gramática: **una sola idea** por unidad, con tabla y 1–3 errores típicos de hispanohablantes. Sin jerga técnica; si usas un término (artículo, verbo auxiliar…), explícalo con un ejemplo.
10. Contenido **correcto y natural** del idioma (inglés estadounidense, **portugués de Brasil**, italiano estándar). Nada inventado. Nombres propios y países habituales para el público de Perú/Latinoamérica.
11. Debe haber **variedad de personas y situaciones** (trabajo, café, calle, familia), sin repetir el mismo ejemplo.

## Validación

Ejecuta `node tools/validar.js` desde `idiomas-app/` y corrige hasta que diga `TODO OK`.
