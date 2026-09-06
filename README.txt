CÓMO USAR ESTE SITIO
=====================

Estructura:
  index.html          -> portfolio (página principal)
  blog.html            -> listado de posts
  posts/               -> cada entrada del blog es un archivo .html
  posts/post-template.html -> plantilla vacía para copiar
  style.css            -> todos los estilos (colores, tipografía, layout)

1) EDITAR TU PORTFOLIO
  Abrí index.html. Cambiá "Tu Nombre", la frase de intro, y los
  ítems de la lista (.index-item) por tus proyectos reales.

2) PUBLICAR UN POST NUEVO
  a. Copiá posts/post-template.html
  b. Renombralo con la fecha, ej: posts/2026-09-12-mi-dia.html
  c. Adentro del archivo, cambiá:
       - el <title>
       - la fecha (.date)
       - el título (<h1>)
       - el contenido (.post-body, un párrafo por <p>)
  d. Abrí blog.html y agregá un bloque nuevo .post-list-item
     arriba de todo (copiá el bloque de ejemplo y cambiá el link,
     la fecha, el título y el resumen).

3) COLORES Y TIPOGRAFÍA
  Todo vive en style.css, arriba de todo en :root. Si querés
  cambiar la paleta, solo tocás esas variables (--paper, --ink,
  --sage, --periwinkle) y se actualiza en todo el sitio.

4) SUBIRLO A INTERNET (gratis)
  Opción más simple: GitHub Pages
    1. Creá un repositorio en GitHub y subí esta carpeta.
    2. Andá a Settings > Pages > Source, elegí la rama principal.
    3. En unos minutos tu sitio queda en
       https://tu-usuario.github.io/nombre-repo

  Opción alternativa: Netlify o Vercel
    1. Arrastrá esta carpeta a app.netlify.com/drop (sin ni
       siquiera usar GitHub) o conectá el repo desde Vercel.
    2. Te da un link tipo tunombre.netlify.app al instante.

  Dominio propio (opcional): comprás el dominio en Namecheap
  y lo apuntás desde el panel de GitHub Pages / Netlify / Vercel.

5) LA FIRMA (el garabato del SVG)
  El pequeño trazo dibujado arriba del nombre, en el sidebar, es
  un SVG editable a mano (buscá <svg class="mark"> en cada
  archivo html). Si sabés dibujar en Figma o Illustrator, podés
  exportar tu propio trazo como SVG y reemplazar ese bloque.
