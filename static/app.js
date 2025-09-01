import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDxKd8tELNRPP4MoSSyG3sn_18z7Whd2Q",
    authDomain: "turifa2025-7f3f1.firebaseapp.com",
    databaseURL: "https://turifa2025-7f3f1-default-rtdb.firebaseio.com",
    projectId: "turifa2025-7f3f1",
    storageBucket: "turifa2025-7f3f1.appspot.com",
    messagingSenderId: "788208791145",
    appId: "1:788208791145:web:8611671eb1b196c4a5a78"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let TOTAL_BOLETOS = 10000; // will be fetched from server
const HOLD_MS = 5 * 60 * 1000; // 5 minutos

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Página cargada correctamente");

    const popup = document.getElementById("popup");
    const tasaDolar = 130; // VES per 1 USD (placeholder, admin will set real rate)
    const costoBoletoUSD = 1; // base price in USD
    const costoBoleto = costoBoletoUSD; // used for USD calculations
    const boletosSeleccionados = new Set();
    let boletosDisponibles = [];
    // Grid state
    let pageIndex = 0;
    let perPage = 100;
    // hold map: ticket -> {expires: timestamp, sessionId}
    const holds = new Map();

    const grid = document.getElementById('ticket-grid');
    const pageIndexEl = document.getElementById('page-index');
    const perPageEl = document.getElementById('per-page');
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');

    function renderGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        perPage = parseInt(perPageEl?.value || perPage);
        const start = pageIndex * perPage;
        const slice = boletosDisponibles.slice(start, start + perPage);
        slice.forEach(num => {
            const btn = document.createElement('button');
            btn.className = 'ticket-btn';
            btn.setAttribute('role', 'gridcell');
            btn.setAttribute('aria-label', `Boleto ${num}`);
            btn.dataset.num = num;
            btn.innerText = num;
            btn.tabIndex = 0;
            // disabled if not in available list (safety) or held by others
            const hold = holds.get(num);
            const now = Date.now();
            if (hold && hold.expires > now) {
                btn.disabled = true;
                btn.title = 'Temporalmente en hold';
                btn.classList.add('held');
            }
            btn.addEventListener('click', () => toggleTicket(num, btn));
            btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTicket(num, btn); } });
            grid.appendChild(btn);
        });
        pageIndexEl.innerText = pageIndex + 1;
    }

    function toggleTicket(num, btn) {
        // simple hold logic: if already selected, unselect and release hold
        if (boletosSeleccionados.has(num)) {
            boletosSeleccionados.delete(num);
            btn.classList.remove('selected');
            holds.delete(num);
        } else {
            boletosSeleccionados.add(num);
            btn.classList.add('selected');
            holds.set(num, { expires: Date.now() + HOLD_MS, sessionId: 'local' });
            // schedule release
            setTimeout(() => { if (holds.get(num) && holds.get(num).expires <= Date.now()) { holds.delete(num); renderGrid(); } }, HOLD_MS + 500);
        }
        document.getElementById('boletos-seleccionados').innerText = boletosSeleccionados.size;
        document.getElementById('boletos').value = Array.from(boletosSeleccionados).join(', ');
        // actualizar lista visual de números seleccionados
        const lista = document.getElementById('lista-numeros');
        if (lista) {
            lista.innerHTML = '';
            Array.from(boletosSeleccionados).forEach(n => { const li = document.createElement('li'); li.innerText = `Boleto: ${n}`; lista.appendChild(li); });
        }
        actualizarTotal();
    }

    prevBtn?.addEventListener('click', () => { if (pageIndex > 0) { pageIndex--; renderGrid(); } });
    nextBtn?.addEventListener('click', () => { if ((pageIndex + 1) * perPage < boletosDisponibles.length) { pageIndex++; renderGrid(); } });
    perPageEl?.addEventListener('change', () => { pageIndex = 0; renderGrid(); });

    function showPopup(message, duration = 3000) {
        popup.innerHTML = `<p>${message}</p>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), duration);
    }

    // Actualiza la UI de progreso
    function actualizarProgresoUI(vendidos) {
        // calcular porcentaje real (float) para la anchura de la barra
        const rawPctFloat = TOTAL_BOLETOS > 0 ? (vendidos / TOTAL_BOLETOS) * 100 : 0;
        const pct = Math.min(100, Math.max(0, rawPctFloat || 0));
        const fill = document.getElementById('sales-progress-fill');
        const vendidosCount = document.getElementById('vendidos-count');
        const totalCount = document.getElementById('total-count');
        if (fill) fill.style.width = pct + '%';
        if (vendidosCount) vendidosCount.innerText = vendidos;
        if (totalCount) totalCount.innerText = TOTAL_BOLETOS;

        const progressBar = document.getElementById('sales-progress');
        if (progressBar) {
            // aria-valuenow puede ser un float para accesibilidad
            progressBar.setAttribute('aria-valuenow', String(Number(pct.toFixed(2))));
            const pctEl = document.getElementById('sales-pct');
            if (pctEl) {
                // mostrar con 1 decimal si es <1, sino entero
                pctEl.innerText = (pct < 1 ? pct.toFixed(1) : Math.round(pct)) + '%';
            }
        }

        // micro-animations on milestones
        [25,50,75,100].forEach(m => {
            if (pct >= m && pct - 1 < m) {
                // fire simple confetti or glow
                const el = document.getElementById('sales-progress-fill');
                if (el) {
                    el.style.boxShadow = '0 8px 40px rgba(255,122,24,0.16)';
                    setTimeout(() => el.style.boxShadow = '', 900);
                }
            }
        });
    }

    document.getElementById("btn-premios").addEventListener("click", () => {
        showPopup("🎉 ¡Participa por $1,000 en efectivo! Compra tus boletos en USD o Bs y participa en el sorteo público.", 4000);
    });

    document.getElementById("btn-preguntas").addEventListener("click", () => {
        popup.innerHTML = `
            <p><strong>📅 ¿Cuándo será la fecha del sorteo?</strong><br>Cuando se haya vendido la mitad de los boletos, anunciaremos la fecha.</p>
            <p><strong>📩 ¿Cómo sé si estoy participando?</strong><br>Recibirás un correo de confirmación después de tu pago.</p>
            <p><strong>🏆 ¿Cómo se elegirá el número ganador?</strong><br>El sorteo se hará con la plataforma de La Lotería del Tachira.</p>
        `;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    document.getElementById("btn-contacto").addEventListener("click", () => {
        popup.innerHTML = `<a href="https://wa.me/584142677345" class="btn-whatsapp">📲 Contactar por WhatsApp</a>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    document.querySelectorAll("nav ul li a").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            button.classList.add("clicked");
            setTimeout(() => button.classList.remove("clicked"), 300);
        });
    });

    // Suscribe en tiempo real a cambios en boletosVendidos y actualiza UI/local cache
    function obtenerBoletosDisponibles() {
        const boletosRef = ref(db, "boletosVendidos");
        // Primero obtener snapshot inmediato para poblar la UI rápidamente
        get(boletosRef).then((snapshot) => {
            const vendidosRaw = snapshot.exists() ? snapshot.val() : [];
            let vendidos = [];
            if (Array.isArray(vendidosRaw)) {
                vendidos = vendidosRaw;
            } else if (vendidosRaw && typeof vendidosRaw === 'object') {
                vendidos = Object.keys(vendidosRaw);
            }
            actualizarProgresoUI(vendidos.length);
            boletosDisponibles = [];
            const vendidosSet = new Set(vendidos);
            for (let i = 0; i < TOTAL_BOLETOS; i++) {
                const num = i.toString().padStart(4, '0');
                if (!vendidosSet.has(num)) boletosDisponibles.push(num);
            }
            pageIndex = 0;
            renderGrid();
        }).catch((err) => {
            console.error("Error cargando boletos desde Firebase (get):", err);
            // fallback to public endpoint if exists
            fetch('/api/total').then(r => r.json()).then(j => {
                const vendidos = (j && typeof j.sold === 'number') ? j.sold : 0;
                actualizarProgresoUI(vendidos);
                boletosDisponibles = [];
                // generar boletos de 1..TOTAL_BOLETOS
                for (let i = 1; i <= TOTAL_BOLETOS; i++) {
                    const num = i.toString().padStart(4, '0');
                    boletosDisponibles.push(num);
                }
                pageIndex = 0;
                renderGrid();
            }).catch(() => {
                // last fallback: all available
                actualizarProgresoUI(0);
                boletosDisponibles = [];
                for (let i = 1; i <= TOTAL_BOLETOS; i++) {
                    boletosDisponibles.push(i.toString().padStart(4,'0'));
                }
                pageIndex = 0;
                renderGrid();
            });
        });

    // onValue garantiza actualizaciones en tiempo real y evita condiciones de carrera en la UI
        onValue(boletosRef, (snapshot) => {
            const vendidosRaw = snapshot.exists() ? snapshot.val() : [];
            // Normalizar a array de strings
            let vendidos = [];
            if (Array.isArray(vendidosRaw)) {
                vendidos = vendidosRaw;
            } else if (vendidosRaw && typeof vendidosRaw === 'object') {
                vendidos = Object.keys(vendidosRaw);
            }
            actualizarProgresoUI(vendidos.length);
            boletosDisponibles = [];
            const vendidosSet = new Set(vendidos);
            for (let i = 1; i <= TOTAL_BOLETOS; i++) {
                const num = i.toString().padStart(4, '0');
                if (!vendidosSet.has(num)) boletosDisponibles.push(num);
            }
            pageIndex = 0;
            renderGrid();
        }, (err) => {
            console.error("Error en onValue de Firebase:", err);
            // fallback: intentar obtener conteo desde backend /api/total
            fetch('/api/total').then(r => r.json()).then(j => {
                const vendidos = (j && typeof j.sold === 'number') ? j.sold : 0;
                actualizarProgresoUI(vendidos);
                boletosDisponibles = [];
                // no sabemos qué números están vendidos en fallback, mostrar todos y dejar que el backend rechace compras conflictivas
                for (let i = 1; i <= TOTAL_BOLETOS; i++) {
                    const num = i.toString().padStart(4, '0');
                    boletosDisponibles.push(num);
                }
                pageIndex = 0;
                renderGrid();
            }).catch(() => {
                // last fallback: assume 0 sold
                actualizarProgresoUI(0);
                boletosDisponibles = [];
                for (let i = 1; i <= TOTAL_BOLETOS; i++) {
                    boletosDisponibles.push(i.toString().padStart(4,'0'));
                }
                pageIndex = 0;
                renderGrid();
            });
        });

        const pref = localStorage.getItem('turifa_currency') || 'USD';
        const currencySelect = document.getElementById('currency');
        if (currencySelect) currencySelect.value = pref;
        currencySelect?.addEventListener('change', (e) => {
            localStorage.setItem('turifa_currency', e.target.value);
            actualizarTotal();
        });
    }

    // Use RATE if available otherwise fallback to tasaDolar variable
    function getRate() { return window.RATE || tasaDolar; }

    // Obtener total público desde backend y establecer TOTAL_BOLETOS
    async function fetchPublicTotal() {
        try {
            const r = await fetch('/api/total');
            if (!r.ok) return;
            const j = await r.json();
            if (j && typeof j.total === 'number') {
                TOTAL_BOLETOS = j.total;
                const totalCount = document.getElementById('total-count');
                if (totalCount) totalCount.innerText = TOTAL_BOLETOS;
            }
        } catch(e) {
            console.warn('No total endpoint', e);
        }
    }

    // polling fallback to keep sales updated if realtime fails
    setInterval(() => {
        fetch('/api/total').then(r => r.json()).then(j => {
            if (j && typeof j.sold === 'number') actualizarProgresoUI(j.sold);
        }).catch(()=>{});
    }, 8000);

    // ensure rate and currency pref loaded
    loadRateAndCurrency();

    function actualizarTotal() {
        // calcular cantidad: si hay tickets seleccionados usar ese número, sino usar el input
        let cantidad = boletosSeleccionados.size || parseInt(document.getElementById("numero-boletos").value) || 0;
        if (cantidad < 1) {
            // mostrar 0
            document.getElementById("total-bolivares").innerText = '0';
            const usdEl = document.getElementById('total-usd'); if (usdEl) usdEl.innerText = '0.00 USD';
            return;
        }
        const totalUSD = cantidad * costoBoletoUSD;
        const rate = getRate();
        const totalBs = Math.round(totalUSD * rate);
        const currency = localStorage.getItem('turifa_currency') || (document.getElementById('currency')?.value) || 'USD';
        if (currency === 'VES') {
            document.getElementById('total-bolivares').innerText = totalBs.toLocaleString('es-VE');
            const usdEl = document.getElementById('total-usd'); if (usdEl) usdEl.innerText = totalUSD.toFixed(2) + ' USD';
        } else {
            const usdEl = document.getElementById('total-usd'); if (usdEl) usdEl.innerText = totalUSD.toFixed(2) + ' USD';
            document.getElementById('total-bolivares').innerText = totalBs.toLocaleString('es-VE');
        }
    }

    document.getElementById("btn-azar").addEventListener("click", () => {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
        if (cantidad < 2) {
            showPopup('Debe seleccionar al menos 2 boletos (mínimo).',4000);
            return;
        }
        if (boletosDisponibles.length === 0) {
            showPopup("⚠️ Aún no se han cargado los boletos disponibles.", 4000);
            return;
        }

        boletosSeleccionados.clear();
        document.getElementById("lista-numeros").innerHTML = "";

        while (boletosSeleccionados.size < cantidad) {
            const random = boletosDisponibles[Math.floor(Math.random() * boletosDisponibles.length)];
            if (!boletosSeleccionados.has(random)) {
                boletosSeleccionados.add(random);
                const li = document.createElement("li");
                li.innerText = `Boleto: ${random}`;
                document.getElementById("lista-numeros").appendChild(li);
            }
        }

        document.getElementById("boletos-seleccionados").innerText = boletosSeleccionados.size;
        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");
        actualizarTotal();
    });

    document.getElementById("numero-boletos").addEventListener("input", actualizarTotal);

    document.querySelectorAll(".pago-opcion p").forEach(p => {
        p.addEventListener("click", () => {
            navigator.clipboard.writeText(p.innerText);
            showPopup("📋 Copiado al portapapeles");
        });
    });

    const btn = document.getElementById('button');

    document.getElementById('form').addEventListener('submit', function (event) {
        event.preventDefault();
        btn.value = 'Enviando...';
        // Recolectar datos y enviar al endpoint /purchase
        const nuevosBoletos = Array.from(boletosSeleccionados);
        if (nuevosBoletos.length < 2) {
            showPopup('Debes seleccionar al menos 2 boletos antes de comprar.',4000);
            btn.value = 'Confirmar Compra';
            return;
        }
        const payload = {
            nombre: document.getElementById('nombre').value,
            identificacion: document.getElementById('identificacion').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            referencia: document.getElementById('referencia').value,
            monto: document.getElementById('monto').value,
            boletos: nuevosBoletos
        };

        fetch('/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(async (res) => {
            btn.value = 'Confirmar Compra';
            if (res.status === 200) {
                const j = await res.json();
                showPopup('✅ Compra registrada. Boletos: ' + (j.reserved || []).join(', '), 4000);
                document.getElementById('form').reset();
                document.getElementById('lista-numeros').innerHTML = '';
                document.getElementById('boletos-seleccionados').innerText = '0';
                document.getElementById('total-bolivares').innerText = '0';
                // eliminar localmente
                (j.reserved || []).forEach(b => {
                    const idx = boletosDisponibles.indexOf(b);
                    if (idx !== -1) boletosDisponibles.splice(idx,1);
                });
                boletosSeleccionados.clear();
                // actualizar UI de progreso si nos dan la info
                if (j.reserved) obtenerBoletosDisponibles();
            } else if (res.status === 409) {
                const j = await res.json();
                showPopup('❌ No disponibles: ' + (j.error || 'tickets_unavailable'), 6000);
            } else {
                const j = await res.json().catch(()=>({}));
                showPopup('❌ Error al procesar la compra: ' + (j.error || res.status), 6000);
            }
        }).catch(err => {
            btn.value = 'Confirmar Compra';
            showPopup('❌ Error de red al enviar la compra.', 4000);
            console.error('Purchase error', err);
        });
    });

    // fetch total from server then populate grid
    fetchPublicTotal().then(() => obtenerBoletosDisponibles());
    // Helpers expuestos para pruebas E2E
    window.testHelpers = {
        selectFirstGridTicket: function() {
            const btn = document.querySelector('#ticket-grid button');
            if (!btn) return null;
            btn.click();
            return btn.dataset && btn.dataset.num ? btn.dataset.num : btn.innerText;
        },
        selectRandomTickets: function(n) {
            const buttons = Array.from(document.querySelectorAll('#ticket-grid button'));
            const picked = [];
            for (let i = 0; i < n && buttons.length; i++) {
                const idx = Math.floor(Math.random() * buttons.length);
                const b = buttons.splice(idx,1)[0];
                b.click();
                picked.push(b.dataset && b.dataset.num ? b.dataset.num : b.innerText);
            }
            return picked;
        }
    };
});
