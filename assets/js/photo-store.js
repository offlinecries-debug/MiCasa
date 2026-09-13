/*
 * photo-store.js — dónde viven las fotos de "Dejá tu foto".
 *
 * Este proyecto es un sitio estático (sin servidor propio), así que no
 * hay ningún backend ya configurado. Para que las fotos sean COMPARTIDAS
 * entre visitantes (persona A deja una, persona B la ve y deja la
 * suya) hace falta conectar un backend real — no se puede simular eso
 * solo con localStorage, porque cada navegador tiene el suyo propio.
 *
 * Mientras SUPABASE_URL/SUPABASE_ANON_KEY estén vacíos, PhotoStore
 * guarda todo en localStorage (PRIVADO de este navegador, se lo dice
 * a la persona en la propia página, ver deja-tu-foto en index.html)
 * para que la función se pueda usar y probar igual.
 *
 * Para conectar Supabase (gratis, sin backend propio que mantener):
 *   1. Crear un proyecto en https://supabase.com
 *   2. Crear un bucket de Storage público llamado "visitor-photos"
 *   3. Crear una tabla "visitor_photos" con columnas:
 *        id          uuid, default gen_random_uuid(), primary key
 *        name        text
 *        image_url   text
 *        created_at  timestamptz, default now()
 *   4. Habilitar Row Level Security en la tabla y agregar dos policies:
 *        - INSERT para el rol "anon" (cualquiera puede dejar su foto)
 *        - SELECT para el rol "anon" (cualquiera puede ver la colección)
 *      En Storage, el bucket público ya permite lectura; agregar una
 *      policy de INSERT para "anon" también en el bucket.
 *   5. Completar acá abajo SUPABASE_URL y SUPABASE_ANON_KEY con los
 *      valores de Project Settings > API (la "anon public key", NUNCA
 *      la "service_role" — esa no va en código de cliente).
 * Con eso completado, esta misma página empieza a guardar y mostrar
 * las fotos de todos los visitantes sin tocar nada más.
 */
var SUPABASE_URL = '';
var SUPABASE_ANON_KEY = '';

var PhotoStore = (function () {
  var LOCAL_KEY = 'mi-casa-deja-tu-foto';
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
    list.push(photo);
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

  return {
    isRemote: function () { return remoteEnabled; },

    list: function () {
      if (remoteEnabled) {
        return client
          .from('visitor_photos')
          .select('name, image_url, created_at')
          .order('created_at', { ascending: true })
          .then(function (res) {
            return (res.data || []).map(function (row) {
              return { name: row.name, image: row.image_url, created_at: row.created_at };
            });
          });
      }
      return Promise.resolve(localList());
    },

    save: function (name, dataURL) {
      var photo = { name: name, image: dataURL, created_at: new Date().toISOString() };

      if (remoteEnabled) {
        var fileName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
        var blob = dataURLToBlob(dataURL);
        return client.storage.from('visitor-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' })
          .then(function () {
            var pub = client.storage.from('visitor-photos').getPublicUrl(fileName);
            var publicUrl = pub && pub.data ? pub.data.publicUrl : '';
            return client.from('visitor_photos').insert({ name: name, image_url: publicUrl }).then(function () {
              return { name: name, image: publicUrl, created_at: photo.created_at };
            });
          });
      }

      return localSave(photo);
    }
  };
})();
