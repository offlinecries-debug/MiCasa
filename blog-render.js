/*
  blog-render.js
  ---------------
  Lee las entradas de content/posts/*.json directamente del repo en GitHub
  (vía raw.githubusercontent.com, sin necesidad de servidor ni build step),
  descarta los borradores, las ordena de más reciente a más antigua, y arma
  la columna del blog usando el mismo lenguaje visual que ya definimos
  (metadato monoespaciado, fotos con rotación leve y textura sutil).

  Antes de usar esto en tu repo real, reemplazá GITHUB_USER y GITHUB_REPO
  por los tuyos.
*/

const GITHUB_USER = "offlinecries-debug";
const GITHUB_REPO = "MiCasa";
const GITHUB_BRANCH = "main";
const POSTS_PATH = "content/posts";

const API_LIST_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${POSTS_PATH}?ref=${GITHUB_BRANCH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${POSTS_PATH}/`;

// Rotación leve y estable por imagen: la misma foto siempre recibe la
// misma inclinación (no cambia en cada recarga), pero no todas las fotos
// reciben el mismo tratamiento entre sí.
function rotacionEstable(nombreArchivo) {
  let hash = 0;
  for (let i = 0; i < nombreArchivo.length; i++) {
    hash = (hash * 31 + nombreArchivo.charCodeAt(i)) % 1000;
  }
  // entre -1.1deg y 1.1deg, con ~40% de probabilidad de quedar derecha
  const bucket = hash % 5;
  if (bucket === 0) return 0;
  const signo = (hash % 2 === 0) ? 1 : -1;
  const magnitud = 0.4 + (hash % 8) / 10; // 0.4deg a 1.1deg
  return signo * magnitud;
}

function formatearFecha(iso) {
  const d = new Date(iso);
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const dia = dias[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia} · ${dd}.${mm}.${yyyy} · ${hh}:${min}`;
}

function renderBloque(bloque) {
  switch (bloque.type) {
    case "text":
      return `<p>${bloque.content}</p>`;

    case "photo": {
      const rot = rotacionEstable(bloque.src);
      const style = rot === 0 ? "" : ` style="transform: rotate(${rot}deg);"`;
      const caption = bloque.caption
        ? `<div class="entry-caption">${bloque.caption}</div>`
        : "";
      return `
        <div class="entry-photo"${style}>
          <img src="../${bloque.src}" alt="">
        </div>
        ${caption}`;
    }

    case "annotation":
      return `<div class="entry-annotation">${bloque.content}</div>`;

    case "file":
      return `
        <a class="entry-file" href="../${bloque.src}" target="_blank" rel="noopener">
          [ archivo adjunto · ${bloque.label || "ver documento"} ]
        </a>`;

    default:
      return "";
  }
}

function renderEntrada(post) {
  const bloquesHtml = (post.blocks || []).map(renderBloque).join("\n");
  return `
    <div class="entry">
      <div class="entry-meta">${formatearFecha(post.date)}</div>
      <h2>${post.title}</h2>
      ${bloquesHtml}
    </div>`;
}

async function cargarBlog() {
  const contenedor = document.getElementById("blog-entries");
  if (!contenedor) return;

  try {
    const listado = await fetch(API_LIST_URL).then(r => r.json());

    if (!Array.isArray(listado)) {
      contenedor.innerHTML = "<p>[ todavía no hay entradas publicadas ]</p>";
      return;
    }

    const archivosJson = listado.filter(f => f.name.endsWith(".json"));

    const posts = await Promise.all(
      archivosJson.map(f => fetch(RAW_BASE + f.name).then(r => r.json()))
    );

    const publicados = posts
      .filter(p => p.draft !== true)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (publicados.length === 0) {
      contenedor.innerHTML = "<p>[ todavía no hay entradas publicadas ]</p>";
      return;
    }

    contenedor.innerHTML = publicados.map(renderEntrada).join("\n");

  } catch (err) {
    console.error("No se pudieron cargar las entradas del blog:", err);
    contenedor.innerHTML = "<p>[ no se pudieron cargar las entradas ]</p>";
  }
}

document.addEventListener("DOMContentLoaded", cargarBlog);
