// ✅ Integración completa con Firebase y EmailJS sin romper funcionalidades existentes

// Firebase SDK (compat)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js";

const firebaseConfig = {
    apiKey: "AIzaSyDxk6BELtNRPP4MoSsyG3sn_18z7WdhzQ",
    authDomain: "turifa2025-7f3f1.firebaseapp.com",
    databaseURL: "https://turifa2025-7f3f1-default-rtdb.firebaseio.com",
    projectId: "turifa2025-7f3f1",
    storageBucket: "turifa2025-7f3f1.appspot.com",
    messagingSenderId: "788207591145",
    appId: "1:788207591145:web:8611671eb1b8196c4a5a78"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Variables del sistema
const popup = document.getElementById("popup");
const tasaDolar = 100;
const costoBoleto = 2;
const boletosSeleccionados = new Set();
let boletosDisponibles = [];

function showPopup(message, duration = 3000) {
    popup.innerHTML = `<p>${message}</p>`;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), duration);
}

// Eventos de navegación
["btn-premios", "btn-preguntas", "btn-contacto"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => {
        e.preventDefault();
        const mensajes = {
            "btn-premios": "🎉 ¿Te quieres ganar dos motos nuevas? 🚀 Compra YA y estarás participando por un Yamaha DT175 y un Empire RK200",
            "btn-preguntas": `
                <p><strong>📅 ¿Cuándo será la fecha del sorteo?</strong><br>Cuando se haya vendido la mitad de los boletos, anunciaremos la fecha.</p>
                <p><strong>📩 ¿Cómo sé si estoy participando?</strong><br>Recibirás un correo de confirmación después de tu pago.</p>
                <p><strong>🏆 ¿Cómo se elegirá el número ganador?</strong><br>El sorteo se hará con la plataforma de La Lotería de Medellín.</p>
            `,
            "btn-contacto": `<a href="https://wa.me/584142726023" class="btn-whatsapp">📲 Contactar por WhatsApp</a>`
        };
        popup.innerHTML = `<p>${mensajes[id]}</p>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });
});

// Animación al hacer clic en nav

document.querySelectorAll("nav ul li a").forEach(button => {
    button.addEventListener("click", e => {
        e.preventDefault();
        button.classList.add("clicked");
        setTimeout(() => button.classList.remove("clicked"), 300);
    });
});

function actualizarTotal() {
    let cantidad = parseInt(document.getElementById("numero-boletos").value);
    if (cantidad < 2) {
        cantidad = 2;
        document.getElementById("numero-boletos").value = 2;
    }
    const totalBs = cantidad * costoBoleto * tasaDolar;
    document.getElementById("total-bolivares").innerText = totalBs.toLocaleString("es-VE");
}

// Copiar datos de pago

document.querySelectorAll(".pago-opcion p").forEach(p => {
    p.addEventListener("click", () => {
        navigator.clipboard.writeText(p.innerText);
        showPopup("📋 Copiado al portapapeles");
    });
});

// Obtener boletos disponibles desde Firebase
async function obtenerBoletosDisponibles() {
    const snapshot = await get(ref(database, 'boletosVendidos'));
    const vendidos = snapshot.exists() ? snapshot.val() : [];
    const total = 10000;
    boletosDisponibles = [];
    for (let i = 0; i < total; i++) {
        const num = i.toString().padStart(4, '0');
        if (!vendidos.includes(num)) {
            boletosDisponibles.push(num);
        }
    }
}

// Selección aleatoria de boletos

document.getElementById("btn-azar").addEventListener("click", () => {
    let cantidad = parseInt(document.getElementById("numero-boletos").value);
    if (boletosDisponibles.length === 0) {
        showPopup("⚠️ Aún no se han cargado los boletos disponibles.", 4000);
        return;
    }

    boletosSeleccionados.clear();
    document.getElementById("lista-numeros").innerHTML = "";

    while (boletosSeleccionados.size < cantidad) {
        const random = boletosDisponibles[Math.floor(Math.random() * boletosDisponibles.length)];
        boletosSeleccionados.add(random);
    }

    boletosSeleccionados.forEach(boleto => {
        const li = document.createElement("li");
        li.innerText = `Boleto: ${boleto}`;
        document.getElementById("lista-numeros").appendChild(li);
    });

    document.getElementById("boletos-seleccionados").innerText = boletosSeleccionados.size;
    document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");
    actualizarTotal();
});

document.getElementById("numero-boletos").addEventListener("input", actualizarTotal);

// Envío del formulario con EmailJS + guardar en Firebase
const btn = document.getElementById("button");


document.getElementById("form").addEventListener("submit", async function (event) {
    event.preventDefault();
    btn.value = "Enviando...";

    // Validación de términos
    if (!document.getElementById("acepto-terminos").checked) {
        showPopup("⚠️ Debes aceptar los términos y condiciones.", 4000);
        btn.value = "Confirmar Compra";
        return;
    }

    try {
        await emailjs.sendForm("default_service", "template_vwsrjs3", this);
        showPopup("✅ ¡Formulario enviado con éxito! Revisa tu correo.", 4000);

        const nuevosBoletos = Array.from(boletosSeleccionados);
        const refBoletos = ref(database, 'boletosVendidos');
        const snapshot = await get(refBoletos);
        let actuales = snapshot.exists() ? snapshot.val() : [];
        const actualizados = [...actuales, ...nuevosBoletos];

        await set(refBoletos, actualizados);

        this.reset();
        document.getElementById("lista-numeros").innerHTML = "";
        document.getElementById("boletos-seleccionados").innerText = "0";
        document.getElementById("total-bolivares").innerText = "0";
        boletosSeleccionados.clear();

        await obtenerBoletosDisponibles();
    } catch (err) {
        showPopup("❌ Ocurrió un error al enviar. Intenta más tarde.", 4000);
        console.error("❌ Error:", err);
    } finally {
        btn.value = "Confirmar Compra";
    }
});

// Inicialización
obtenerBoletosDisponibles();