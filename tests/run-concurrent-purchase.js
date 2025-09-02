const fetch = require('node-fetch');

(async () => {
  const BASE = 'http://127.0.0.1:5000';
  const ticketsA = ['2000'];
  const ticketsB = ['2000'];

  console.log('Lanzando 2 compras concurrentes para el mismo ticket');
  // Intentar limpiar estado previo si endpoint de test disponible
  try {
    await fetch(BASE + '/__clear', { method: 'POST' });
  } catch(e) {}

  const payloadA = { nombre: 'A', telefono: '1', email: 'a@a.com', boletos: ticketsA, referencia: 'A', monto: 130 };
  const payloadB = { nombre: 'B', telefono: '2', email: 'b@b.com', boletos: ticketsB, referencia: 'B', monto: 130 };

  const pA = fetch(BASE + '/purchase', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payloadA) });
  const pB = fetch(BASE + '/purchase', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payloadB) });

  const [rA, rB] = await Promise.all([pA, pB]);
  console.log('Status A', rA.status, 'Status B', rB.status);
  const jA = await rA.json().catch(()=>null);
  const jB = await rB.json().catch(()=>null);
  console.log('Body A', jA);
  console.log('Body B', jB);

  if ((rA.status === 200 && rB.status === 200) || (rA.status === 200 && rB.status === 409) || (rA.status === 409 && rB.status === 200)) {
    console.log('TEST OK');
    process.exit(0);
  }
  console.error('TEST FAILED');
  process.exit(2);
})();
