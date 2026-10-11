# Guía de Conexión Mac - iPad (Modo Concierto)

Esta guía explica paso a paso cómo conectar tu iPad a la Mac por cable USB para tocar los Teclados Wilson con latencia cero. Contás con dos escenarios detallados según tu entorno de trabajo.

---

## Escenario 1: En Casa / Ensayo (Mac conectada a Wi-Fi, iPad por cable USB)
*Usá este método cuando estés en tu casa o estudio y tu Mac tenga conexión a internet activa, pero quieras que el iPad envíe los datos estrictamente por el cable físico para no tener retraso inalámbrico.*

### Paso 1: Configurar "Compartir Internet" en la Mac (Solo una vez)
1. Conectá el iPad a la Mac usando el cable USB-Lightning original.
2. En tu Mac, hacé clic en el menú Apple () > **Configuración del Sistema** (o Preferencias).
3. Andá a **General** > **Compartir**.
4. Buscá **Compartir Internet** y hacé clic en el ícono de información "i" (o Detalles) a su derecha:
   - **Compartir conexión desde:** Wi-Fi
   - **Hacia las computadoras usando:** Marcá la casilla **iPad USB** (o iPhone USB).
5. Dale a "Aceptar" y encendé el interruptor principal de **Compartir Internet** (si pide confirmación, seleccioná "Iniciar").

### Paso 2: Aislar el iPad
1. En el iPad, abrí la app **Configuración** y **apagá el Wi-Fi**. Esto fuerza a que todo el tráfico viaje exclusivamente a través del cable físico.

### Paso 3: Arrancar los Servidores en la Mac
Abrí la Terminal en tu Mac con dos pestañas (`Cmd + T` para la segunda):

- **Pestaña 1 (Teclados visuales):**
  ```bash
  cd /Users/byron/Documents/tecladosXen/wilson-t41-hex-keyboard-main/hexgrid-workspace
  python3 -m http.server 8080
  ```
- **Pestaña 2 (Estación midiControl):**
  ```bash
  cd /Users/byron/Documents/tecladosXen/midiControl
  npm start
  ```

### Paso 4: Abrir las pantallas
1. **En la Mac:** Abrí Safari y entrá a:
   👉 `http://localhost:3000` (MIDI & OSC Console).
2. **En el iPad:** Abrí Safari y entrá a la IP directa del cable:
   👉 **`http://192.168.2.1:8080/index.html`**
3. En el panel de **OSC Connection** del teclado, dejá **Target IP** en `127.0.0.1` (la Mac se reenvía el OSC a sí misma) y ¡a tocar!

---

## Escenario 2: 100% Offline (El Día del Concierto - Sin Wi-Fi ni Internet)
*Este es el método definitivo para tocar en vivo en un teatro, sala o festival donde no hay Wi-Fi o donde apagás todas las radios inalámbricas para evitar interferencias.*

### El Secreto Técnico (Cómo funciona):
No necesitás Wi-Fi, ni routers, ni configurar "Compartir Internet". Al enchufar el cable, Apple crea automáticamente una red privada punto a punto de cable llamada **IPv6 Link-Local**. En esta red, tu Mac se anuncia solita con el nombre **`Byrons-MacBook-Pro.local`** (Bonjour).

### Paso 1: Conectar los equipos y apagar radios
1. Conectá el iPad a la Mac con el cable USB-Lightning original.
2. **En el iPad:** Abrí la app **Configuración** y **apagá el Wi-Fi y el Bluetooth**.
3. **En la Mac:** Podés apagar el Wi-Fi si querés; no hace falta tener ninguna conexión inalámbrica activa.

### Paso 2: Arrancar los Servidores en la Mac
Abrí la Terminal en tu Mac en dos pestañas separadas:

- **Pestaña 1 (Teclados visuales):**
  ```bash
  cd /Users/byron/Documents/tecladosXen/wilson-t41-hex-keyboard-main/hexgrid-workspace
  python3 -m http.server 8080
  ```
  *(Importante: Ejecutarlo tal cual, sin flags como `--bind`, para que escuche en modo dual `::` y acepte el cable).*

- **Pestaña 2 (Estación midiControl):**
  ```bash
  cd /Users/byron/Documents/tecladosXen/midiControl
  npm start -- --host=::
  ```
  *(Crucial: El parámetro `--host=::` le ordena al servidor WebSocket escuchar en todas las interfaces de cable IPv6 del iPad).*

### Paso 3: Abrir las pantallas y tocar en vivo
1. **En la Mac:** Abrí Safari y entrá a:
   👉 `http://localhost:3000` (Consola de Monitoreo).
2. **En el iPad:**
   - Abrí Safari en una **Pestaña Privada** (Modo Incógnito / Privado). Esto es fundamental para evitar que Safari intente forzar HTTPS con candado por error.
   - Escribí exactamente la siguiente dirección en la barra:
     👉 **`http://Byrons-MacBook-Pro.local:8080/index.html`**
     *(Asegurate de incluir `http://` sin la letra "s" y terminar en `/index.html`)*.
3. **En el panel OSC del teclado:**
   - Dejá **Target IP** en **`127.0.0.1`**.
   - Verificá que el puerto UDP sea el de tu sintetizador (ej. `57120` para SuperCollider).
   - Marcá la casilla de **Habilitar OSC** y empezá a tocar.

---

## Preguntas Frecuentes y Consejos Rápidos

- **¿Por qué en el iPad uso Pestaña Privada en el Escenario 2?**
  Las versiones modernas de Safari intentan autocompletar con `https://` (cifrado). Como Python es un servidor local simple (HTTP sin candado), el intento de HTTPS generaría un error `400 Bad Request`. La pestaña privada garantiza que Safari respete `http://` plano.
- **¿Por qué el Target IP siempre es 127.0.0.1?**
  Porque el iPad le entrega las notas al servidor `midiControl` en tu Mac, y luego es la propia Mac la que le despacha el OSC internamente a SuperCollider o tu DAW dentro de la misma máquina.
