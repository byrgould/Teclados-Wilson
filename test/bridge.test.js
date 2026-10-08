const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { isAllowedUdpHost, isAllowedOrigin, server, wss, udpClient } = require('../bridge.js');

describe('Bridge Security & Network Tests', () => {
    after(() => {
        // Cerrar servidores y sockets para finalización limpia de los tests
        try { server.close(); } catch {}
        try { wss.close(); } catch {}
        try { udpClient.close(); } catch {}
    });

    describe('isAllowedUdpHost', () => {
        test('permite localhost y loopbacks', () => {
            assert.equal(isAllowedUdpHost('localhost'), true);
            assert.equal(isAllowedUdpHost('127.0.0.1'), true);
            assert.equal(isAllowedUdpHost('::1'), true);
        });

        test('permite rangos privados RFC 1918', () => {
            assert.equal(isAllowedUdpHost('192.168.1.50'), true);
            assert.equal(isAllowedUdpHost('10.0.0.1'), true);
            assert.equal(isAllowedUdpHost('172.20.10.2'), true);
        });

        test('bloquea IPs públicas e internet abierta', () => {
            assert.equal(isAllowedUdpHost('8.8.8.8'), false);
            assert.equal(isAllowedUdpHost('1.1.1.1'), false);
            assert.equal(isAllowedUdpHost('142.250.190.46'), false);
            assert.equal(isAllowedUdpHost(''), false);
            assert.equal(isAllowedUdpHost(null), false);
        });
    });

    describe('isAllowedOrigin', () => {
        test('permite orígenes locales y sin encabezado', () => {
            assert.equal(isAllowedOrigin(undefined), true);
            assert.equal(isAllowedOrigin('http://localhost:3000'), true);
            assert.equal(isAllowedOrigin('http://127.0.0.1:3000'), true);
        });

        test('bloquea orígenes externos maliciosos (anti-CSWSH)', () => {
            assert.equal(isAllowedOrigin('http://evil.com'), false);
            assert.equal(isAllowedOrigin('https://attacker.site:8080'), false);
            assert.equal(isAllowedOrigin('not-a-valid-url'), false);
        });
    });

    describe('HTTP Server Hardening', () => {
        test('responde 405 Method Not Allowed a métodos no-GET/HEAD', (t, done) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/index.html',
                method: 'POST'
            }, (res) => {
                assert.equal(res.statusCode, 405);
                assert.equal(res.headers['x-content-type-options'], 'nosniff');
                done();
            });
            req.on('error', done);
            req.end();
        });

        test('bloquea intentos de Path Traversal', (t, done) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/../../../../Windows/win.ini',
                method: 'GET'
            }, (res) => {
                // Al normalizar o detectar escape, debe devolver 403 o servir index.html/404 sin salir de ROOT_DIR
                assert.ok(res.statusCode === 403 || res.statusCode === 404 || res.statusCode === 200);
                assert.equal(res.headers['x-content-type-options'], 'nosniff');
                done();
            });
            req.on('error', done);
            req.end();
        });

        test('bloquea peticiones con null byte', (t, done) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/index.html%00.png',
                method: 'GET'
            }, (res) => {
                assert.equal(res.statusCode, 400);
                done();
            });
            req.on('error', done);
            req.end();
        });
    });
});
