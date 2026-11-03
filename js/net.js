'use strict';
// Online versus: one host and one guest, joined by a short room code over a WebRTC data channel (PeerJS).
// PeerJS's free public broker only introduces the two browsers; after that the game traffic goes straight between them.
// Dev overrides: ?ph=host&pp=port&pk=path to use a local PeerServer; window.MTFPS_ICE = [...] to add a TURN server.
const NET = (function () {
  const PREFIX = 'mtfps-', ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const q = new URLSearchParams(location.search);
  let peer = null, conn = null, role = null, code = '';
  const api = { onStatus: () => {}, onMessage: () => {}, onOpen: () => {}, onClose: () => {} };

  const cfg = () => {
    const c = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }].concat(window.MTFPS_ICE || []) } };
    if (q.get('ph')) { c.host = q.get('ph'); c.port = +q.get('pp') || 9000; c.path = q.get('pk') || '/'; c.secure = false; }
    return c;
  };
  const newCode = () => { let s = ''; for (let i = 0; i < 4; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; };

  function wire(c) {
    conn = c;
    c.on('open', () => { api.onStatus('Connected'); api.onOpen(role); });
    c.on('data', d => api.onMessage(d));
    c.on('close', () => { if (conn === c) { conn = null; api.onClose(); } });
    c.on('error', e => api.onStatus('Connection error: ' + (e.type || e)));
  }

  api.supported = () => typeof Peer === 'function';
  api.active = () => !!(conn && conn.open);
  api.role = () => role;
  api.code = () => code;

  api.host = function () {
    api.leave(); role = 'host';
    const tryCode = (left) => {
      code = newCode();
      peer = new Peer(PREFIX + code, cfg());
      peer.on('open', () => api.onStatus('ROOM ' + code + ' — waiting for a friend…', code));
      peer.on('connection', c => {
        if (conn && conn.open) { c.on('open', () => c.close()); return; }    // room is full
        wire(c);
      });
      peer.on('error', e => {
        if (e.type === 'unavailable-id' && left > 0) { peer.destroy(); tryCode(left - 1); return; }
        api.onStatus('Could not create a room: ' + (e.type || e));
      });
    };
    tryCode(5);
  };

  api.join = function (raw) {
    api.leave(); role = 'guest';
    code = String(raw || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) { api.onStatus('Enter the 4-character room code'); return; }
    api.onStatus('Connecting to ' + code + '…');
    peer = new Peer(cfg());
    peer.on('open', () => {
      const c = peer.connect(PREFIX + code, { serialization: 'json', reliable: true });
      wire(c);
      setTimeout(() => { if (conn === c && !c.open) { api.onStatus('No answer from room ' + code + ' (wrong code, or a network that blocks direct connections)'); } }, 12000);
    });
    peer.on('error', e => api.onStatus(e.type === 'peer-unavailable' ? 'No room with code ' + code : 'Connection problem: ' + (e.type || e)));
  };

  api.send = m => { if (conn && conn.open) conn.send(m); };
  api.leave = function () {
    const c = conn; conn = null; role = null;
    try { c && c.close(); } catch (e) {}
    try { peer && peer.destroy(); } catch (e) {}
    peer = null;
  };
  return api;
})();
