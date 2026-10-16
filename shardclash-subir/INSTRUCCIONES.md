# Cómo poner Shard Clash en internet

El modo **Amigo** necesita un servidor (`server.js`). Ese mismo servidor también
entrega el juego, así que con publicarlo una sola vez ya tienes:

- un link para abrir el juego desde cualquier celular,
- las salas para jugar con tu amigo.

Archivos de esta carpeta:

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El juego completo |
| `server.js` | El servidor de salas (Node.js) |
| `package.json` | Le dice al hosting cómo arrancar el servidor |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Para instalarlo como app y jugar sin internet |
| `art/` | Tus dibujos opcionales |

---

## Opción A (recomendada): Render.com, gratis

### 1. Sube la carpeta a GitHub
1. Crea una cuenta en <https://github.com>.
2. Arriba a la derecha, toca **+ → New repository**. Ponle de nombre `shardclash`, márcalo como **Public** y toca **Create repository**.
3. En la página del repositorio toca **uploading an existing file**.
4. Arrastra **todos los archivos de esta carpeta**, menos la carpeta `node_modules` si existe.
5. Toca **Commit changes**.

### 2. Publícalo en Render
1. Crea una cuenta en <https://render.com>. Puedes entrar con tu cuenta de GitHub.
2. Toca **New + → Web Service** y elige tu repositorio `shardclash`.
3. Configura:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Toca **Create Web Service** y espera 2 o 3 minutos.
5. Render te da un link parecido a `https://shardclash-xxxx.onrender.com`. **Ese es tu juego.**

### 3. Juega con tu amigo
1. Los dos abren el link en el celular.
2. Van a la pestaña **Amigo** (abajo a la derecha) y escriben su nombre.
3. Uno toca **CREAR SALA** y le pasa el código de 4 letras al otro.
4. El otro escribe el código y toca **UNIRSE**. La partida empieza sola.

> En el plan gratis, Render "duerme" el servidor si nadie lo usa por 15 minutos.
> La primera vez que lo abras después de eso puede tardar unos 30 a 50 segundos en cargar.

Para instalarlo como app: en Chrome (Android) abre el menú ⋮ y toca
**Añadir a pantalla de inicio**. En iPhone (Safari) toca **Compartir** y luego
**Agregar a inicio**.

### Actualizar el juego después
Sube los archivos nuevos al mismo repositorio de GitHub (**Add file → Upload files**).
Render lo vuelve a publicar solo en 1 o 2 minutos.

---

## Opción B: probarlo en tu casa (misma red WiFi)

1. Instala **Node.js (versión LTS)** desde <https://nodejs.org>.
2. Abre una terminal en esta carpeta y ejecuta:

   ```bash
   npm install
   ```

   ```bash
   npm start
   ```

3. En tu PC abre <http://localhost:3000>.
4. Para que tu amigo entre desde su celular **en la misma WiFi**:
   - Busca la IP de tu PC con el comando `ipconfig`. Es la "Dirección IPv4", por ejemplo `192.168.1.25`.
   - En el celular abre `http://192.168.1.25:3000`.
   - Si no carga, permite Node.js en el **Firewall de Windows** (la primera vez Windows lo pregunta; elige "Redes privadas").

Esto solo funciona dentro de tu casa. Para jugar con alguien en otro lugar usa la Opción A.

---

## Reglas del modo Amigo
- Todas las tropas están a **nivel 12** (máximo). No cuentan los niveles de tu Cuartel, para que sea parejo.
- Cada ronda hay **15 segundos** para elegir. Si se acaba el tiempo, se elige una tropa al azar.
- Cada jugador tiene 5 corazones y quien pierde la ronda pierde uno.
- Si alguien se sale o se desconecta, la partida termina para los dos.
- Las partidas en línea no dan fama.
