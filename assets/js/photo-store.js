/*
 * photo-store.js — dónde viven las fotos de "Dejá tu foto".
 *
 * Storage compartido entre TODOS los visitantes, vía Supabase
 * (Storage + tabla Postgres). Este proyecto es un sitio estático sin
 * build ni servidor propio (GitHub Pages), así que no existe ningún
 * mecanismo real de ".env" — nada procesa esos archivos antes de
 * publicar. La clave "anon" de Supabase está diseñada justamente para
 * vivir en código de cliente (queda visible en el navegador de
 * cualquiera igual): la protección real la dan las policies de Row
 * Level Security configuradas en Supabase, no el secreto de esta
 * clave. Por eso completar las dos constantes de acá abajo es
 * exactamente lo que corresponde en un proyecto así — nunca la
 * "service_role key", esa sí es privada y jamás debe estar en el
 * navegador.
 *
 * PASOS EN SUPABASE (una sola vez, antes de completar las constantes):
 *   1. Crear un proyecto gratis en https://supabase.com
 *   2. Abrir el SQL Editor del proyecto y ejecutar el script que está
 *      en supabase/setup.sql (crea el bucket público "visitor-photos",
 *      la tabla "visitor_photos" y las policies: cualquiera puede leer
 *      y subir, nadie puede borrar ni modificar lo ya subido).
 *   3. Ir a Project Settings > API y copiar:
 *        - "Project URL"      -> SUPABASE_URL
 *        - "anon public" key  -> SUPABASE_ANON_KEY
 *      (la "service_role" NO se toca acá).
 *   4. Pegar esos dos valores abajo. Con eso, esta misma página empieza
 *      a guardar y mostrar las fotos de todos los visitantes.
 *
 * Mientras estas dos constantes estén vacías, PhotoStore sigue
 * funcionando con localStorage (privado de este navegador) para que
 * la función se pueda probar, y la página lo avisa honestamente.
 */
var SUPABASE_URL = '';
var SUPABASE_ANON_KEY = '';

var PhotoStore = (function () {
  var LOCAL_KEY = 'mi-casa-deja-tu-foto';
  var BUCKET = 'visitor-photos';
  var TABLE = 'visitor_photos';

  var remoteEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  var client = remoteEnabled ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function localList() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function localSave(photo) {
    var list = localList();
    list.unshift(photo); // más reciente primero, igual que el modo remoto
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch (e) { /* localStorage lleno o bloqueado: la foto solo queda en memoria de esta sesión */ }
    return Promise.resolve(photo);
  }

  function dataURLToBlob(dataURL) {
    var parts = dataURL.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var binary = atob(parts[1]);
    var arr = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // nombre para MOSTRAR: solo letras (de cualquier idioma), números,
  // espacios, guiones y guion bajo — nada que pueda romper HTML o rutas
  function sanitizeDisplayName(raw) {
    var n = (raw || '').normalize('NFC').replace(/[^\p{L}\p{N} _-]/gu, '').trim();
    if (!n) n = 'img_' + Math.floor(Math.random() * 900 + 100);
    return n.slice(0, 24);
  }

  // versión "slug" del mismo nombre, para el archivo en el storage:
  // único y sin caracteres raros, aunque el nombre visible tenga tildes/espacios
  function slugify(name) {
    var s = name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return (s || 'foto').slice(0, 40);
  }

  return {
    isRemote: function () { return remoteEnabled; },

    list: function () {
      if (remoteEnabled) {
        return client
          .from(TABLE)
          .select('filename, image_url, created_at')
          .order('created_at', { ascending: false })
          .then(function (res) {
            if (res.error) throw res.error;
            return (res.data || []).map(function (row) {
              return { name: row.filename.replace(/\.jpg$/i, ''), image: row.image_url, created_at: row.created_at };
            });
          });
      }
      return Promise.resolve(localList());
    },

    save: function (rawName, dataURL) {
      var displayName = sanitizeDisplayName(rawName);
      var photo = { name: displayName, image: dataURL, created_at: new Date().toISOString() };

      if (remoteEnabled) {
        var storagePath = slugify(displayName) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.jpg';
        var blob = dataURLToBlob(dataURL);

        return client.storage.from(BUCKET)
          .upload(storagePath, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
          .then(function (uploadRes) {
            if (uploadRes.error) throw uploadRes.error;
            var pub = client.storage.from(BUCKET).getPublicUrl(storagePath);
            var publicUrl = pub && pub.data ? pub.data.publicUrl : '';
            return client.from(TABLE)
              .insert({ filename: displayName + '.jpg', image_url: publicUrl })
              .then(function (insertRes) {
                if (insertRes.error) throw insertRes.error;
                return { name: displayName, image: publicUrl, created_at: photo.created_at };
              });
          });
      }

      return localSave(photo);
    }
  };
})();
