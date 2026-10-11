# Guía de Conexión Mac - iPad (Modo Concierto)

Esta guía explica paso a paso cómo conectar tu iPad a la Mac por cable USB para tocar los Teclados Wilson sin latencia. Tenés dos escenarios dependiendo de si tu Mac tiene conexión a internet o no.

---

## Escenario 1: La Mac tiene Wi-Fi, el iPad se conecta por cable USB
*Usá este método si necesitás que tu Mac siga conectada a internet (para descargar algo o ver una página de referencia), pero querés que el iPad envíe las notas MIDI directo por el cable para tener cero latencia.*

### Paso 1: Configurar "Compartir Internet" en la Mac (Una sola vez)
1. Conectá tu iPad a la Mac usando el cable USB-Lightning original.
2. En tu Mac, hacé clic en el menú Apple () arriba a la izquierda > **Configuración del Sistema** (o Preferencias del Sistema).
3. Andá a la sección **General** > **Compartir**.
4. Buscá la opción **Compartir Internet** (pero todavía no prendas el interruptor principal). Hacé clic en el icono de información "i" (o Detalles) que está a su derecha.
5. Configurá lo siguiente:
   - **Compartir conexión desde:** Wi-Fi
   - **Hacia las computadoras usando:** Marcá la casilla que dice "iPad USB" (o "iPhone USB").
6. Dale a "Aceptar" y ahora sí, encendé el interruptor general de **Compartir Internet**. Si te pide confirmación, dale a "Iniciar".

### Paso 2: Aislar el iPad
1. En el iPad, abrí la app **Configuración** y **apagá el Wi-Fi** (esto es crucial para forzar que los datos viajen por el cable y no se escapen por el aire).

### Paso 3: Iniciar los Servidores
1. **Abrí la Terminal en la Mac**.
2. **Arrancá el servidor de los teclados visuales** copiando, pegando este comando y tocando Enter:
   ```bash
   cd /Users/byron/Documents/tecladosXen/wilson-t41-hex-keyboard-main/hexgrid-workspace
   python3 -m http.server 8080
   ```
3. **Arrancá la Estación MIDI**. Apretá `Cmd + T` para abrir otra pestaña en la misma terminal, pegá esto y tocá Enter:
   ```bash
   cd /Users/byron/Documents/tecladosXen/midiControl
   npm start
   ```

### Paso 4: Abrir las pantallas y hacer música
1. **En la Mac:** Abrí Safari y escribí `http://localhost:3000` para ver la consola de monitoreo de la estación MIDI.
2. **En el iPad:** Abrí Safari y escribí `http://192.168.2.1:8080` (Este es el IP estándar de la red del cable). Seleccioná tu teclado y empezá a tocar.

---

## Escenario 2: 100% Offline (El Día del Concierto - Sin Internet ni Routers)
*Este es el método infalible para cuando estás en una sala o teatro sin conexión a internet y querés latencia cero por cable USB sin interferencias.*

### El Secreto Técnico (Importante entender esto):
- Para estar "offline", tu Mac **NO necesita estar conectada a ningún router de Wi-Fi ni a internet**.
- Sin embargo, el interruptor de Wi-Fi de la Mac debe permanecer **ENCENDIDO** (aunque no esté conectado a ninguna red) para que macOS mantenga activo el motor de red del cable USB (`192.168.2.1`). Si desactivás el Wi-Fi de la Mac por completo, macOS apaga el cable.
- El iPad, en cambio, sí debe tener sus antenas totalmente apagadas para forzar el paso por el cable.

### Paso 1: Configurar las conexiones
1. Conectá el iPad a la Mac con el cable USB-Lightning original.
2. **En tu Mac:** Asegurate de que "Compartir Internet" siga activo (como se configuró en el Escenario 1). El Wi-Fi de la Mac puede estar encendido pero **desconectado de cualquier red** (no hace falta internet).
3. **En el iPad:** Abrí la app **Configuración** y **apagá el Wi-Fi y el Bluetooth**. (Esto garantiza que no haya interferencias y todo el tráfico vaya 100% por el cable físico).

### Paso 2: Iniciar los Servidores en la Mac
1. **Terminal Pestaña 1 (Teclados):**
   ```bash
   cd /Users/byron/Documents/tecladosXen/wilson-t41-hex-keyboard-main/hexgrid-workspace
   python3 -m http.server 8080
   ```
2. **Terminal Pestaña 2 (MidiControl):**
   ```bash
   cd /Users/byron/Documents/tecladosXen/midiControl
   npm start
   ```

### Paso 3: Abrir las pantallas
1. **En la Mac:** Abrí Safari y entrá a:
   👉 `http://localhost:3000` (Consola de Monitoreo).
2. **En el iPad:** Abrí Safari y entrá **directamente por el número IP del cable** (no uses nombres .local):
   👉 **`http://192.168.2.1:8080`**

*(Al usar `192.168.2.1`, el iPad no necesita internet ni servicios de búsqueda: se comunica directamente por el cable en fracciones de milisegundo. En el panel OSC del teclado, dejá el Target IP en `127.0.0.1` y ¡a tocar!)*

