// Prueba E2E básica usando Playwright
// Requisitos: node >=16, npm install playwright

const { chromium } = require('playwright');
const fetch = require('node-fetch');

(async () => {
  const BASE = 'http://127.0.0.1:5000';

  console.log('Iniciando E2E: abro dos navegadores...');
  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Helper para leer contador directamente desde Firebase Realtime DB (REST API)
  // Usamos la URL que aparece en templates/index.html
  const FIREBASE_DB_URL = 'https://turifa2025-7f3f1-default-rtdb.firebaseio.com/boletosVendidos.json';
  async function leerVendidos() {
    const res = await fetch(FIREBASE_DB_URL);
    if (!res.ok) return null;
    const val = await res.json();
    if (!val) return 0;
    if (Array.isArray(val)) return val.length;
    if (typeof val === 'object') return Object.keys(val).length;
    return 0;
  }

  try {
    const inicial = await leerVendidos();
    console.log('Vendidos inicial:', inicial);

    // Cargar páginas
    await Promise.all([pageA.goto(BASE), pageB.goto(BASE)]);

    // Seleccionar 1 boleto en cada página (usar botón azar)
    await pageA.fill('#numero-boletos', '1');
    await pageB.fill('#numero-boletos', '1');

    // Selección robusta: intentar el selector directo y si falla usar el helper expuesto por la app
    async function selectOrUseHelper(page, label) {
      try {
        await page.waitForSelector('#ticket-grid button', { timeout: 10000 });
        await page.click('#ticket-grid button');
      } catch (e) {
        // fallback: esperar a que testHelpers esté disponible y usarlo
        await page.waitForFunction(() => window.testHelpers && typeof window.testHelpers.selectFirstGridTicket === 'function', { timeout: 15000 });
        const sel = await page.evaluate(() => window.testHelpers.selectFirstGridTicket());
        if (!sel) throw new Error(label + ': helper no pudo seleccionar boleto');
      }
      // esperar que la UI muestre la selección
      await page.waitForFunction(() => document.querySelector('#boletos-seleccionados') && document.querySelector('#boletos-seleccionados').innerText.trim() !== '0', { timeout: 5000 });
      console.log(label, 'selección OK');
    }

    await Promise.all([
      selectOrUseHelper(pageA, 'A'),
      selectOrUseHelper(pageB, 'B')
    ]);

    // Rellenar formulario simple en ambas páginas
    await pageA.fill('#nombre', 'Tester A');
    await pageA.fill('#telefono', '04141234567');
    await pageA.fill('#email', 'a@test.com');
    await pageA.fill('#referencia', 'R-A');
    await pageA.fill('#monto', '130');
    await pageA.check('#acepto-terminos');

    await pageB.fill('#nombre', 'Tester B');
    await pageB.fill('#telefono', '04149876543');
    await pageB.fill('#email', 'b@test.com');
    await pageB.fill('#referencia', 'R-B');
    await pageB.fill('#monto', '130');
    await pageB.check('#acepto-terminos');

    // Capturar console logs para ayudar a diagnosticar fallos (Network, EmailJS, etc.)
    pageA.on('console', msg => console.log('A:', msg.type(), msg.text()));
    pageB.on('console', msg => console.log('B:', msg.type(), msg.text()));

    // Capturar requests/responses relevantes
    const watch = (page, label) => {
      page.on('request', req => {
        const url = req.url();
        if (url.includes('emailjs') || url.includes('firebase') || url.includes('boletosVendidos')) {
          console.log(`${label} REQ:`, req.method(), url);
        }
      });
      page.on('response', async res => {
        const url = res.url();
        if (url.includes('emailjs') || url.includes('firebase') || url.includes('boletosVendidos')) {
          let status = res.status();
          let text = '';
          try { text = await res.text(); } catch (e) {}
          console.log(`${label} RES:`, status, url, text ? ('BODY_LEN=' + text.length) : '');
        }
      });
    };
    watch(pageA, 'A');
    watch(pageB, 'B');

    // Enviar casi simultáneo
    await Promise.all([
      pageA.click('#button'),
      pageB.click('#button')
    ]);

  // Esperar para que Firebase/servidor/procesos asíncronos completen
  await new Promise(r => setTimeout(r, 9000));

    const final = await leerVendidos();
    console.log('Vendidos final:', final);

    const delta = final - inicial;
    console.log('Delta:', delta);

    if (delta >= 2) {
      console.log('TEST PASSED: Se registraron las compras.');
    } else {
      console.error('TEST FAILED: Parece que hubo conflicto o no se registraron ambas compras.');
      process.exitCode = 2;
    }

  } catch (err) {
    console.error('Error en E2E:', err);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
