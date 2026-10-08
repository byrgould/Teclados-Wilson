const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

describe('HexGrid Lifecycle & Microtonal Kinematics Tests', () => {
    let dom;
    let window;
    let document;
    let HexGrid;

    beforeEach(async () => {
        dom = new JSDOM(`<!DOCTYPE html><html><body><div id="grid-container"></div></body></html>`, {
            url: 'http://localhost:3000/'
        });
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        global.DOMParser = window.DOMParser;
        global.TextEncoder = require('util').TextEncoder;

        const mod = await import('../hexgrid.js');
        HexGrid = mod.default;
    });

    test('wilsonWalk y getWilsonVector calculan cinemática bidireccional correctamente', () => {
        HexGrid.config.cols = 10;
        HexGrid.config.rows = 10;
        HexGrid.config.totalCells = 100;
        HexGrid.generate();
        
        // Caminata desde (0,0) con dx=2, dy=1
        const target = HexGrid.wilsonWalk(0, 0, 2, 1);
        assert.ok(target.col >= 0 && target.row >= 0);

        // Vector inverso
        const vector = HexGrid.getWilsonVector(0, 0, target.col, target.row);
        assert.equal(vector.dx, 2);
        assert.equal(vector.dy, 1);
    });

    test('setText sanitiza y renderiza tspan de forma segura sin raw innerHTML', () => {
        const container = document.getElementById('grid-container');
        HexGrid.config.cols = 3;
        HexGrid.config.rows = 3;
        HexGrid.config.totalCells = 9;
        HexGrid.generate();
        HexGrid.render(container);

        const hex = HexGrid.hexagons[0];
        assert.ok(hex);

        // Actualizar con markup tspan seguro
        HexGrid.setText(hex.id, '<tspan dy="-0.3em">53</tspan>');
        assert.equal(hex.textNode.children.length, 1);
        assert.equal(hex.textNode.children[0].tagName.toLowerCase(), 'tspan');
        assert.equal(hex.textNode.children[0].textContent, '53');
    });

    test('releaseAllNotes dispara Note Off y limpia activeNotesMap', () => {
        const container = document.getElementById('grid-container');
        HexGrid.config.cols = 3;
        HexGrid.config.rows = 3;
        HexGrid.config.totalCells = 9;
        HexGrid.generate();
        HexGrid.render(container);

        let oscCalls = [];
        window.dispatchOSC = (addr, types, args) => {
            oscCalls.push({ addr, types, args });
        };

        const hex = HexGrid.hexagons[0];
        hex.noteDegree = 12;
        hex.noteOctave = 0;

        // Encender nota
        hex.turnOn();
        assert.equal(hex.isPressed, true);
        assert.equal(HexGrid.activeNotesMap.size > 0, true);

        // Disparar liberación general
        HexGrid.releaseAllNotes();
        assert.equal(hex.isPressed, false);
        assert.equal(HexGrid.activeNotesMap.size, 0);

        // Debe registrar la nota apagada y el panic /allnotesoff
        const panicCall = oscCalls.find(c => c.addr === '/allnotesoff');
        assert.ok(panicCall, 'Debe haber disparado /allnotesoff');
    });

    test('Page Visibility API apaga notas cuando document.hidden es true', () => {
        const container = document.getElementById('grid-container');
        HexGrid.config.cols = 3;
        HexGrid.config.rows = 3;
        HexGrid.config.totalCells = 9;
        HexGrid.generate();
        HexGrid.render(container);

        let oscPanic = false;
        window.dispatchOSC = (addr) => {
            if (addr === '/allnotesoff') oscPanic = true;
        };

        HexGrid.initVisibilityHandler(document, window);

        const hex = HexGrid.hexagons[1];
        hex.turnOn();
        assert.equal(hex.isPressed, true);

        // Simular que el usuario apaga la pantalla del iPad o minimiza la pestaña
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new window.Event('visibilitychange'));

        assert.equal(hex.isPressed, false);
        assert.equal(oscPanic, true);
    });
});
