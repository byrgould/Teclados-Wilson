/**
 * HexGrid Module
 * 
 * Generates and renders a grid of 478 interactive hexagons.
 * Flat-top orientation.
 * 
 * Future extensions:
 * - zones.js: color zone assignments
 * - osc.js: OSC protocol integration
 * - ui.js: interactive UI controls
 */

/**
 * HexGrid Module
 * 
 * Este módulo es el motor gráfico principal ("Engine") para los teclados.
 * Dibuja una cuadrícula de hexágonos usando SVG. No contiene lógica musical,
 * es un componente agnóstico ("dumb component") que es controlado por
 * los módulos específicos (ej. edo53.js, partch.js).
 */
const HexGrid = {
  // 1. HexGrid config
  /**
   * Configuración central de la grilla geométrica.
   * Modificar 'cols' y 'rows' alterará la proporción de la pantalla.
   */
  config: {
    
    size: 20,              // Radius of the hexagon
    cols: 39,              // Ampliado a 39 columnas
    rows: 25,              // 25 filas para mantener la proporción 4:3 (iPad)
    totalCells: 975,       // 39 cols x 25 rows = 975 celdas
    
    // Default Styling
    defaultColor: '#1E1E24',
    hoverColor: '#3F88C5',
    activeColor: '#D00000',
    strokeColor: '#0E0E12',
    strokeWidth: 2
  },

  hexagons: [],
  activeNotesMap: new Map(), // Tracks active overlapping notes by noteFloat

  // 2. HexGrid.generate() -> creates the hexagon array with metadata
  generate() {
    this.hexagons = [];
    let count = 0;
    
    // Generate grid coordinates
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (count >= this.config.totalCells) break;
        
        this.hexagons.push({
          id: `hex-${col}-${row}`,
          col: col,
          row: row,
          index: count,
          zoneData: null
        });
        count++;
      }
    }
    return this.hexagons;
  },

  // 3. HexGrid.render(containerEl) -> draws the hexagons as SVG
  render(containerEl) {
    if (!containerEl) {
      console.error('HexGrid.render: containerEl is missing.');
      return;
    }

    const { size, cols, rows, defaultColor, strokeColor, strokeWidth, hoverColor } = this.config;
    
    // Flat-top geometry distances
    const hexWidth = 2 * size;
    const hexHeight = Math.sqrt(3) * size;
    const xSpacing = 1.5 * size;
    const ySpacing = hexHeight;

    // Calculate total SVG size to accommodate the grid
    const svgWidth = (cols - 1) * xSpacing + hexWidth;
    const svgHeight = (rows - 1) * ySpacing + hexHeight + (hexHeight / 2);

    // Generate points for a single flat-top hexagon centered at 0,0
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const px = size * Math.cos(angle_rad);
      const py = size * Math.sin(angle_rad);
      points.push(`${px},${py}`);
    }
    const polygonPoints = points.join(' ');

    // Create SVG Canvas
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `-10 -10 ${svgWidth + 20} ${svgHeight + 20}`);
    svg.style.display = 'block';
    
    // Wrapper group
    const g = document.createElementNS(svgNS, 'g');
    
    // Render each hexagon
    this.hexagons.forEach(hex => {
      const { col, row } = hex;
      
      // Calculate x,y position
      const cx = col * xSpacing + size;
      // Stagger odd columns by half a hex height
      const yOffset = (col % 2 === 1) ? hexHeight / 2 : 0;
      const cy = row * ySpacing + yOffset + hexHeight / 2;

      // Wrapper group for the hex
      const hexGroup = document.createElementNS(svgNS, 'g');
      hexGroup.setAttribute('transform', `translate(${cx}, ${cy})`);

      const polygon = document.createElementNS(svgNS, 'polygon');
      polygon.setAttribute('id', hex.id);
      polygon.setAttribute('points', polygonPoints);
      polygon.setAttribute('fill', defaultColor);
      polygon.setAttribute('stroke', strokeColor);
      polygon.setAttribute('stroke-width', strokeWidth);
      
      // Styles for interaction
      polygon.style.cursor = 'pointer';
      polygon.style.transition = 'fill 0.15s ease, stroke 0.15s ease';

      // Text Node
      const textNode = document.createElementNS(svgNS, 'text');
      textNode.setAttribute('text-anchor', 'middle');
      textNode.setAttribute('dominant-baseline', 'central');
      textNode.setAttribute('fill', '#ffffff');
      textNode.setAttribute('pointer-events', 'none'); // Para no robar el hover/click
      textNode.style.fontFamily = "'Arial Narrow', 'Inter', sans-serif";
      textNode.style.fontSize = '12px';
      textNode.style.fontWeight = 'normal';
      textNode.textContent = hex.text || '';
      
      // Save reference in the hex object for fast dynamic updates
      hex.textNode = textNode;
      hex.polygon = polygon;

      // State management for pressed status
      let isPressed = false;
      let activeNoteKey = null;
      let activeNoteFloat = null;

      let isHovering = false;

      const turnOn = () => {
        if (isPressed) return;
        isPressed = true;
        hex.isPressed = true;
        polygon.setAttribute('fill', HexGrid.config.activeColor);
        console.log(`[HexGrid] Note ON -> id: ${hex.id}, col: ${col}, row: ${row}, index: ${hex.index}`);
        
        if (HexGrid.onHexClickCallback) {
          HexGrid.onHexClickCallback({ id: hex.id, col: col, row: row });
        }

        // --- OSC & MIDI BINDING (NOTE ON) ---
        if (hex.noteDegree !== undefined && (typeof window.dispatchOSC === 'function' || typeof window.dispatchMIDI === 'function')) {
          const edo = typeof window.getActiveEdo === 'function' ? window.getActiveEdo() : 12;
          const base = typeof window.getOscBaseFloat === 'function' ? window.getOscBaseFloat() : 0.0;
          const noteFloat = base + parseFloat(hex.noteDegree) + (parseInt(hex.noteOctave || 0) * edo);
          
          activeNoteFloat = noteFloat;
          activeNoteKey = noteFloat.toFixed(5);
          
          const currentCount = HexGrid.activeNotesMap.get(activeNoteKey) || 0;
          
          if (currentCount === 0) {
            // if (typeof window.dispatchOSC === 'function') {
            //   window.dispatchOSC('/mnote', 'ff', [activeNoteFloat, 127.0]);
            // }
            if (typeof window.dispatchMIDI === 'function') {
              const userBase = parseInt(window.userBaseMidiNote !== undefined ? window.userBaseMidiNote : 60, 10);
              const pureDegree = parseFloat(hex.noteDegree) + (parseInt(hex.noteOctave || 0) * edo);
              const midiNote = Math.max(0, Math.min(127, Math.round(userBase + pureDegree)));
              window.dispatchMIDI('noteon', midiNote, 127, activeNoteFloat);
            }
          } else {
            console.log(`[HexGrid] Note ON Suppressed (Overlap) -> id: ${hex.id}, noteFloat: ${activeNoteFloat}`);
          }
          HexGrid.activeNotesMap.set(activeNoteKey, currentCount + 1);
        }

        // Temporary Monitor Update
        const monitor = document.getElementById('id-monitor');
        if (monitor) {
          monitor.textContent = `ID: ${hex.id} | Col: ${col} | Row: ${row}`;
          monitor.classList.add('active');
        }

        // TODO: Enviar dato de encendido
      };

      const turnOff = () => {
        if (!isPressed) return;
        isPressed = false;
        hex.isPressed = false;
        
        if (hex.isHighlighted) {
          polygon.setAttribute('fill', 'rgba(255, 234, 0, 0.4)');
          // Stroke is already #ffea00, managed by Highlight system
        } else {
          if (isHovering) {
            polygon.setAttribute('fill', hex.bgColor || hoverColor);
          } else {
            polygon.setAttribute('fill', hex.bgColor || defaultColor);
          }
        }
        
        console.log(`[HexGrid] Note OFF -> id: ${hex.id}`);
        
        // --- OSC & MIDI BINDING (NOTE OFF) ---
        if (activeNoteKey !== null && activeNoteFloat !== null && (typeof window.dispatchOSC === 'function' || typeof window.dispatchMIDI === 'function')) {
          const currentCount = HexGrid.activeNotesMap.get(activeNoteKey) || 0;
          
          if (currentCount > 0) {
            const newCount = currentCount - 1;
            HexGrid.activeNotesMap.set(activeNoteKey, newCount);
            
            if (newCount === 0) {
              // if (typeof window.dispatchOSC === 'function') {
              //   window.dispatchOSC('/mnote', 'ff', [activeNoteFloat, 0.0]);
              // }
              if (typeof window.dispatchMIDI === 'function') {
                const edo = typeof window.getActiveEdo === 'function' ? window.getActiveEdo() : 12;
                const base = typeof window.getOscBaseFloat === 'function' ? window.getOscBaseFloat() : 0.0;
                const userBase = parseInt(window.userBaseMidiNote !== undefined ? window.userBaseMidiNote : 60, 10);
                const pureDegree = (activeNoteFloat - base); // Reverse engineering pure degree from activeNoteFloat
                const midiNote = Math.max(0, Math.min(127, Math.round(userBase + pureDegree)));
                window.dispatchMIDI('noteoff', midiNote, 0, activeNoteFloat);
              }
            } else {
              console.log(`[HexGrid] Note OFF Suppressed (Overlap) -> id: ${hex.id}, noteFloat: ${activeNoteFloat}`);
            }
          }
          
          activeNoteKey = null;
          activeNoteFloat = null;
        }
        
        // Temporary Monitor Update
        const monitor = document.getElementById('id-monitor');
        if (monitor) {
          monitor.textContent = `ID: --`;
          monitor.classList.remove('active');
        }

        // TODO: Enviar dato de apagado
      };

      hex.turnOn = turnOn;
      hex.turnOff = turnOff;

      // Mouse Events
      polygon.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Previene selección de texto
        turnOn();
      });

      polygon.addEventListener('mouseup', (e) => {
        e.preventDefault();
        turnOff();
      });

      // Hover interaction logic
      polygon.addEventListener('mouseenter', () => {
        isHovering = true;
        
        // Crear borde de ayuda visual en la capa superior sin alterar el DOM original
        if (this.hoverLayer) {
          this.hoverLayer.innerHTML = '';
          const duplicate = document.createElementNS(svgNS, 'polygon');
          duplicate.setAttribute('points', polygonPoints);
          duplicate.setAttribute('fill', 'none');
          duplicate.setAttribute('stroke', '#ffffff');
          duplicate.setAttribute('stroke-width', '3');
          duplicate.setAttribute('transform', hexGroup.getAttribute('transform'));
          this.hoverLayer.appendChild(duplicate);
        }

        if (!isPressed && !hex.bgColor && !hex.isHighlighted) {
          polygon.setAttribute('fill', hoverColor);
        }
      });
      
      polygon.addEventListener('mouseleave', () => {
        isHovering = false;
        if (this.hoverLayer) {
          this.hoverLayer.innerHTML = '';
        }
        
        // Restaurar estado visual del relleno
        if (hex.isHighlighted) {
          if (!isPressed) {
            polygon.setAttribute('fill', 'rgba(255, 234, 0, 0.4)');
          }
        } else {
          if (!isPressed) {
            polygon.setAttribute('fill', hex.bgColor || defaultColor);
          }
        }
        
        turnOff(); // Apagar si sale con el clic apretado
      });

      // Touch Events (para móviles/tablets)
      polygon.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Previene scroll al tocar
        turnOn();
      });

      polygon.addEventListener('touchend', (e) => {
        e.preventDefault();
        turnOff();
      });

      polygon.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        turnOff();
      });

      hexGroup.appendChild(polygon);
      hexGroup.appendChild(textNode);
      g.appendChild(hexGroup);
    });

    const hoverLayer = document.createElementNS(svgNS, 'g');
    hoverLayer.setAttribute('id', 'hover-layer');
    hoverLayer.style.pointerEvents = 'none';

    const viewportGroup = document.createElementNS(svgNS, 'g');
    viewportGroup.setAttribute('id', 'viewport-group');
    viewportGroup.appendChild(g);
    viewportGroup.appendChild(hoverLayer);

    svg.appendChild(viewportGroup);
    this.hoverLayer = hoverLayer;

    // ----- CAMERA LOGIC (Pan & Zoom) -----
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    const viewBoxW = svgWidth + 20;
    const viewBoxH = svgHeight + 20;
    
    let updateTransform = () => {
      zoom = Math.max(1, Math.min(zoom, 10)); // max 10x
      
      if (zoom === 1) {
        panX = 0;
        panY = 0;
      } else {
        const maxPanX = 10 * (zoom - 1);
        const minPanX = (viewBoxW - 10) * (1 - zoom);
        const maxPanY = 10 * (zoom - 1);
        const minPanY = (viewBoxH - 10) * (1 - zoom);
        
        panX = Math.min(maxPanX, Math.max(minPanX, panX));
        panY = Math.min(maxPanY, Math.max(minPanY, panY));
      }
      
      viewportGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
    };

    // Zoom (Wheel + Ctrl) and Trackpad Pan
    svg.addEventListener('wheel', (e) => {
      e.preventDefault(); // Evita scroll de página y swipe en Mac
      
      // Si estamos en modo de ejecución, bloqueamos la cámara completamente
      if (document.body.classList.contains('performance-mode')) return;
      
      if (e.ctrlKey || e.metaKey) {
        const rect = svg.getBoundingClientRect();
        const ratioX = viewBoxW / rect.width;
        const ratioY = viewBoxH / rect.height;
        const svgMouseX = (e.clientX - rect.left) * ratioX - 10;
        const svgMouseY = (e.clientY - rect.top) * ratioY - 10;
        
        const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(1, Math.min(zoom * scaleFactor, 10));
        
        const actualScale = newZoom / zoom;
        panX = svgMouseX - (svgMouseX - panX) * actualScale;
        panY = svgMouseY - (svgMouseY - panY) * actualScale;
        
        zoom = newZoom;
        updateTransform();
      } else {
        if (zoom > 1) {
          const rect = svg.getBoundingClientRect();
          const ratioX = viewBoxW / rect.width;
          const ratioY = viewBoxH / rect.height;
          panX -= (e.deltaX * ratioX);
          panY -= (e.deltaY * ratioY);
          updateTransform();
        }
      }
    }, { passive: false });

    // --- Mouse & Touch Segregated Event System ---
    let isMousePanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // 1. Mouse Events (Desktop)
    svg.addEventListener('mousedown', (e) => {
      if (document.body.classList.contains('performance-mode')) return;
      if (e.target === svg || e.target.classList.contains('hover-layer') || e.target.tagName === 'g') {
        isMousePanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        svg.style.cursor = 'grabbing';
      }
    });

    svg.addEventListener('mousemove', (e) => {
      if (!isMousePanning || zoom <= 1 || document.body.classList.contains('performance-mode')) return;
      
      const rect = svg.getBoundingClientRect();
      const ratioX = viewBoxW / rect.width;
      const ratioY = viewBoxH / rect.height;
      
      panX += (e.clientX - lastMouseX) * ratioX;
      panY += (e.clientY - lastMouseY) * ratioY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      updateTransform();
    });

    const stopMousePan = () => {
      isMousePanning = false;
      svg.style.cursor = 'default';
    };
    svg.addEventListener('mouseup', stopMousePan);
    svg.addEventListener('mouseleave', stopMousePan);

    // 2. Touch Events (iPad / Mobile)
    let initialPinchDist = 0;
    let initialPinchZoom = 1;
    let lastTouchPanX = 0;
    let lastTouchPanY = 0;
    let isTouchPanning = false;

    svg.addEventListener('touchstart', (e) => {
      if (document.body.classList.contains('performance-mode')) return;
      
      // Detener cualquier evento nativo del navegador si tocamos el SVG / fondo
      if (e.target === svg || e.target.tagName === 'g' || e.target.classList.contains('hover-layer')) {
        e.preventDefault(); 
      }

      if (e.touches.length === 1) {
        isTouchPanning = true;
        lastTouchPanX = e.touches[0].clientX;
        lastTouchPanY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isTouchPanning = false; // Cancelar paneo instantáneamente
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = zoom;
      }
    }, { passive: false });

    svg.addEventListener('touchmove', (e) => {
      if (document.body.classList.contains('performance-mode')) return;
      
      // Prohibir terminantemente al navegador interferir con el gesto
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 1 && isTouchPanning && zoom > 1) {
        const rect = svg.getBoundingClientRect();
        const ratioX = viewBoxW / rect.width;
        const ratioY = viewBoxH / rect.height;
        
        panX += (e.touches[0].clientX - lastTouchPanX) * ratioX;
        panY += (e.touches[0].clientY - lastTouchPanY) * ratioY;
        lastTouchPanX = e.touches[0].clientX;
        lastTouchPanY = e.touches[0].clientY;
        updateTransform();
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = currentDist / initialPinchDist;
        zoom = initialPinchZoom * scale;
        zoom = Math.max(minZoom, Math.min(zoom, maxZoom));
        clampPan();
        updateTransform();
      }
    }, { passive: false });

    const stopTouch = (e) => {
      if (e.touches.length < 2) {
        initialPinchDist = 0; // Apagar matemática de zoom
      }
      if (e.touches.length === 0) {
        isTouchPanning = false;
      } else if (e.touches.length === 1) {
        // Transición fluida de vuelta a paneo
        isTouchPanning = true;
        lastTouchPanX = e.touches[0].clientX;
        lastTouchPanY = e.touches[0].clientY;
      }
    };
    svg.addEventListener('touchend', stopTouch);
    svg.addEventListener('touchcancel', stopTouch);

    containerEl.innerHTML = ''; // Clear container
    containerEl.appendChild(svg);
  },

  // 4. HexGrid.getHex(col, row) -> returns hexagon data object
  getHex(col, row) {
    return this.hexagons.find(h => h.col === col && h.row === row) || null;
  },

  // 5. HexGrid.setZone(hexIds[], zoneData) -> stub for future implementation
  setZone(hexIds, zoneData) {
    console.log(`[HexGrid] setZone called with ${hexIds.length} hexes. Data:`, zoneData);
    // TODO: implement logic in future iterations
  },

  // 6. HexGrid.setText(id, text) -> updates the text of a specific hexagon
  setText(id, text) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex) {
      hex.text = text;
      if (hex.textNode) {
        // Safe DOM construction: parse tspan elements without raw innerHTML
        if (/<tspan[\s>]/i.test(text)) {
          const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`;
          const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
          const parsedText = parsed.querySelector('text');
          while (hex.textNode.firstChild) hex.textNode.removeChild(hex.textNode.firstChild);
          if (parsedText) {
            while (parsedText.firstChild) hex.textNode.appendChild(parsedText.firstChild);
          }
        } else {
          hex.textNode.textContent = text;
        }
      }
    } else {
      console.warn(`[HexGrid] setText: hex with id ${id} not found.`);
    }
  },

  // 6.5. HexGrid.setNoteData(id, degree, octave) -> updates text and stores OSC metadata
  setNoteData(id, degree, octave) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex) {
      hex.text = degree.toString();
      hex.noteDegree = parseInt(degree);
      hex.noteOctave = parseInt(octave);
      if (hex.textNode) {
        hex.textNode.textContent = degree.toString();
      }
    }
  },

  getNoteOctave(id) {
    const hex = this.hexagons.find(h => h.id === id);
    return hex ? hex.noteOctave : undefined;
  },

  // 7. HexGrid.clearAllText() -> removes text and metadata from all hexagons
  clearAllText() {
    this.hexagons.forEach(hex => {
      hex.text = '';
      hex.noteDegree = undefined;
      hex.noteOctave = undefined;
      if (hex.textNode) {
        hex.textNode.textContent = '';
      }
    });
  },

  // 7. Erv Wilson Coordinate System
  // Walks across the hex grid using Wilson's X (Bottom-Right) and Y (Top-Right) axes
  wilsonWalk(startCol, startRow, stepsX, stepsY) {
    let c = startCol;
    let r = startRow;
    
    // Eje X de Wilson: diagonal Bottom-Right (o Top-Left si es negativo)
    for (let i = 0; i < Math.abs(stepsX); i++) {
      let dir = Math.sign(stepsX);
      if (dir > 0) { // Bottom-Right
        r = (c % 2 !== 0) ? r + 1 : r;
        c += 1;
      } else { // Top-Left
        r = (c % 2 !== 0) ? r : r - 1;
        c -= 1;
      }
    }

    // Eje Y de Wilson: diagonal Top-Right (o Bottom-Left si es negativo)
    for (let i = 0; i < Math.abs(stepsY); i++) {
      let dir = Math.sign(stepsY);
      if (dir > 0) { // Top-Right
        r = (c % 2 !== 0) ? r : r - 1;
        c += 1;
      } else { // Bottom-Left
        r = (c % 2 !== 0) ? r + 1 : r;
        c -= 1;
      }
    }
    
    return { col: c, row: r };
  },

  // 7.5. Inverse Wilson Kinematics: from geometric coords to Wilson dx, dy
  getWilsonVector(startCol, startRow, endCol, endRow) {
    const isOdd = c => Math.abs(c % 2) === 1;
    const start_cy = startRow + (isOdd(startCol) ? 0.5 : 0);
    const end_cy = endRow + (isOdd(endCol) ? 0.5 : 0);
    
    const deltaCol = endCol - startCol;
    const delta_cy = end_cy - start_cy;
    
    // Derived from solving the Top-Right and Bottom-Right basis vectors
    const dx = (deltaCol + 2 * delta_cy) / 2;
    const dy = (deltaCol - 2 * delta_cy) / 2;
    
    return { dx, dy };
  },

  // 8. HexGrid.getHexByWilsonCoords(startId, stepsX, stepsY)
  getHexByWilsonCoords(startId, stepsX, stepsY) {
    const startHex = this.hexagons.find(h => h.id === startId);
    if (!startHex) {
      console.error(`[HexGrid] getHexByWilsonCoords: startId ${startId} not found.`);
      return null;
    }
    
    const targetCoords = this.wilsonWalk(startHex.col, startHex.row, stepsX, stepsY);
    return this.getHex(targetCoords.col, targetCoords.row);
  },

  // --- MÉTODOS DE ESTADO Y AJUSTE VISUAL ---
  getMappedNotes() {
    return this.hexagons.filter(h => h.textNode && h.textNode.textContent !== '');
  },

  getText(id) {
    const hex = this.hexagons.find(h => h.id === id);
    return hex && hex.textNode ? hex.textNode.textContent : '';
  },

  clearText(id) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex && hex.textNode) {
      hex.textNode.textContent = '';
    }
  },

  setHexColor(id, color) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex && hex.polygon) {
      hex.bgColor = color;
      hex.polygon.setAttribute('fill', color);
    }
  },

  getHexColor(id) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex && hex.polygon) {
      return hex.polygon.getAttribute('fill');
    }
    return null;
  },

  resetAllColors() {
    this.hexagons.forEach(h => {
      h.bgColor = null;
      if (h.polygon) {
        h.polygon.setAttribute('fill', '#1a1f2b'); // The default dark background color
      }
    });
  },

  highlightHex(id) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex && hex.polygon) {
      hex.polygon.setAttribute('stroke', '#ffff00');
      hex.polygon.setAttribute('stroke-width', '3');
    }
  },

  removeHighlightHex(id) {
    const hex = this.hexagons.find(h => h.id === id);
    if (hex && hex.polygon) {
      hex.polygon.setAttribute('stroke', this.config.strokeColor);
      hex.polygon.setAttribute('stroke-width', this.config.strokeWidth.toString());
    }
  },

  removeAllHighlights() {
    this.hexagons.forEach(h => {
      if (h.polygon) {
        h.polygon.setAttribute('stroke', this.config.strokeColor);
        h.polygon.setAttribute('stroke-width', this.config.strokeWidth.toString());
      }
    });
  },

  // 9. Corrección de octavas: Mueve el contenido de una celda n octavas (7 en X, 5 en Y)
  shiftOctave(textValue, octavesUp) {
    // Buscar la celda que tiene el texto
    const hex = this.hexagons.find(h => h.text === textValue);
    if (!hex) {
      console.warn(`[HexGrid] shiftOctave: no se encontró la celda con valor ${textValue}`);
      return;
    }
    
    // Calculamos el vector de la octava multiplicado por la cantidad de octavas a subir/bajar
    const stepsX = 7 * octavesUp;
    const stepsY = 5 * octavesUp;
    const newHex = this.getHexByWilsonCoords(hex.id, stepsX, stepsY);
    
    if (newHex) {
      // Limpiamos el texto original
      this.setText(hex.id, "");
      // Escribimos en el destino
      this.setText(newHex.id, textValue);
      // Retornamos el nuevo hex para confirmar
      return newHex;
    } else {
      console.error(`[HexGrid] shiftOctave: Destino fuera del tablero para el valor ${textValue}`);
      return null;
    }
  },

  // 8. Event System para la Interfaz de Usuario
  onHexClickCallback: null,
  onHexClick(callback) {
    this.onHexClickCallback = callback;
  },

  // 9. All Notes Panic & Lifecycle Management
  // Libera todas las teclas encendidas tanto visualmente como disparando Note OFF / Panic
  releaseAllNotes() {
    this.hexagons.forEach(hex => {
      if (hex.isPressed && typeof hex.turnOff === 'function') {
        hex.turnOff();
      }
    });
    this.activeNotesMap.clear();

    if (typeof window !== 'undefined') {
      if (typeof window.dispatchOSC === 'function') {
        window.dispatchOSC('/allnotesoff', '', []);
      }
      if (typeof window.dispatchMIDI === 'function') {
        // Enviar Control Change 123 (All Notes Off) en canal 1 por defecto
        window.dispatchMIDI('controlchange', 123, 0);
      }
    }
  },

  // 10. Page Visibility Lifecycle Listener
  // Pausa segura y corte de notas colgadas cuando Safari/Chrome pasa a segundo plano o se bloquea la pantalla
  initVisibilityHandler(targetDoc = (typeof document !== 'undefined' ? document : null), targetWin = (typeof window !== 'undefined' ? window : null)) {
    if (!targetDoc || this._boundDoc === targetDoc) return;
    this._boundDoc = targetDoc;
    
    targetDoc.addEventListener('visibilitychange', () => {
      if (targetDoc.hidden) {
        console.log('[HexGrid Lifecycle] Page hidden/minimized: Disparando All Notes Off');
        this.releaseAllNotes();
      }
    });

    if (targetWin) {
      targetWin.addEventListener('blur', () => {
        console.log('[HexGrid Lifecycle] Window blur: Asegurando liberación de notas activas');
        this.releaseAllNotes();
      });
    }
  }
};

// Auto-inicializar ciclo de vida si corre en entorno de navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  HexGrid.initVisibilityHandler();
}

export default HexGrid;

// ==========================================
// MIDI CONFIGURATION & UI INJECTION
// ==========================================
if (typeof window !== 'undefined') {
  const getStorageItem = (key, fallback) => {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  };

  window.userBaseMidiNote = parseInt(getStorageItem('userBaseMidiNote', '60'), 10);
  window.userMidiChannel = parseInt(getStorageItem('userMidiChannel', '1'), 10);

  // Global MIDI dispatcher (overrides specific ones if any)
  window.dispatchMIDI = function(eventType, noteNumber, velocity, noteFloat) {
      if (window.oscStatus && window.oscStatus.linked && window.oscStatus.socket && window.oscStatus.socket.readyState === 1) {
          window.oscStatus.socket.send(JSON.stringify({
              type: "midi",
              event: eventType,
              channel: window.userMidiChannel,
              note: noteNumber,
              velocity: velocity,
              noteFloat: noteFloat
          }));
      }
  };
}

// UI Injector
if (typeof document !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
      const uiPanel = document.getElementById('ui-panel');
      if (!uiPanel) return;

      const midiConfigContainer = document.createElement('div');
      midiConfigContainer.style.marginTop = '15px';
      midiConfigContainer.style.paddingTop = '15px';
      midiConfigContainer.style.borderTop = '1px solid rgba(255,255,255,0.2)';
      midiConfigContainer.innerHTML = `
          <div class="ui-title">Configuración MIDI (Salida)</div>
          <div class="input-group" style="display: flex; gap: 10px; margin-bottom: 5px;">
              <div style="flex: 1;">
                  <label style="font-size: 0.8rem; color: #ccc;">Canal MIDI</label>
                  <select id="global-midi-channel" style="width: 100%; padding: 4px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
                      ${Array.from({length: 16}, (_, i) => '<option value="' + (i+1) + '">' + (i+1) + '</option>').join('')}
                  </select>
              </div>
              <div style="flex: 1;">
                  <label style="font-size: 0.8rem; color: #ccc;">Base Nota (Grado 0)</label>
                  <input type="number" id="global-midi-base" min="0" max="127" style="width: 100%; padding: 4px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
              </div>
          </div>
          <div style="font-size: 0.75rem; color: #888;">
              El Canal MIDI y la Nota Base determinan qué envía este teclado al Bridge / midiControl.
          </div>
      `;
      
      uiPanel.appendChild(midiConfigContainer);

      const chSelect = document.getElementById('global-midi-channel');
      const baseInput = document.getElementById('global-midi-base');

      chSelect.value = window.userMidiChannel;
      baseInput.value = window.userBaseMidiNote;

      chSelect.addEventListener('change', (e) => {
          window.userMidiChannel = parseInt(e.target.value, 10);
          localStorage.setItem('userMidiChannel', window.userMidiChannel);
      });

      baseInput.addEventListener('change', (e) => {
          window.userBaseMidiNote = parseInt(e.target.value, 10);
          localStorage.setItem('userBaseMidiNote', window.userBaseMidiNote);
      });
  });
}
