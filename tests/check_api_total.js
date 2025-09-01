const fetch = require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/total', { timeout: 4000 });
    console.log('STATUS', res.status);
    const j = await res.json().catch(()=>null);
    console.log('BODY', j);
    process.exit(0);
  } catch (e) {
    console.error('ERR', e.message || e);
    process.exit(1);
  }
})();
