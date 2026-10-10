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

## Escenario 2: 100% Offline (Ni la Mac ni el iPad tienen Wi-Fi)
*Este es el escenario "a prueba de balas" ideal para el día del concierto en vivo. No requiere configurar direcciones IP ni opciones de "Compartir Internet". Al conectar el cable USB, Apple crea una red privada e inquebrantable automáticamente (tecnología Bonjour).*

### Paso 1: Apagar las radios (Cero interferencias)
1. Conectá el iPad a la Mac con el cable USB-Lightning.
2. En tu Mac, apagá el Wi-Fi desde el ícono de la barrita superior.
3. En el iPad, abrí la app **Configuración** y apagá el Wi-Fi y el Bluetooth. 
*(De esta forma bloqueás cualquier distracción inalámbrica. No van a saltar notificaciones raras ni va a haber caídas de señal).*

### Paso 2: Iniciar los Servidores
1. **Abrí la Terminal en la Mac**.
2. **Arrancá el servidor de los teclados** copiando, pegando este comando y tocando Enter:
   ```bash
   cd /Users/byron/Documents/tecladosXen/wilson-t41-hex-keyboard-main/hexgrid-workspace
   python3 -m http.server 8080
   ```
3. **Arrancá la Estación MIDI**. Apretá `Cmd + T` para abrir otra pestaña en la terminal, pegá esto y tocá Enter:
   ```bash
   cd /Users/byron/Documents/tecladosXen/midiControl
   npm start
   ```

### Paso 3: Abrir las pantallas y arrancar el show
1. **En la Mac:** Abrí Safari y escribí `http://localhost:3000` para tener tu monitor MIDI a la vista.
2. **En el iPad:** Abrí Safari y escribí la "dirección mágica" de tu computadora por el puerto 8080:
   
   👉 **`http://Byrons-MacBook-Pro.local:8080`**

*(Al no haber Wi-Fi, la red privada del cable usará este nombre exacto para encontrar la Mac en fracciones de segundo. Elegí el teclado que vayas a usar, ¡y que empiece el concierto!)*
