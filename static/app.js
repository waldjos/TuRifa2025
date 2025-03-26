// app.js COMPLETO CON FIREBASE INTEGRADO

// Firebase config e inicialización
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyQkXd8LLEtNRPP4MoSSyG3sn_18z7WdhzQ",
  authDomain: "turifa2025-7f3f1.firebaseapp.com",
  projectId: "turifa2025-7f3f1",
  storageBucket: "turifa2025-7f3f1.appspot.com",
  messagingSenderId: "788208791145",
  appId: "1:788208791145:web:8611671eb1b8196c4a5a78",
  measurementId: "G-F1YWVCMNJXP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- LÓGICA PRINCIPAL -------------------
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Página cargada correctamente");

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

  // Animación y navegación
  document.getElementById("btn-premios").addEventListener("click", () => {
    showPopup("🎉 ¿Te quieres ganar dos motos nuevas? 🚀 Compra YA y estarás participando por un Yamaha DT175 y un Empire RK200", 4000);
  });

  document.getElementById("btn-preguntas").addEventListener("click", () => {
    popup.innerHTML = `
      <p><strong>📅 ¿Cuándo será la fecha del sorteo?</strong><br>Cuando se haya vendido la mitad de los boletos, anunciaremos la fecha.</p>
      <p><strong>📩 ¿Cómo sé si estoy participando?</strong><br>Recibirás un correo de confirmación después de tu pago.</p>
      <p><strong>🏆 ¿Cómo se elegirá el número ganador?</strong><br>El sorteo se hará con la plataforma de La Lotería de Medellín.</p>
    `;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 6000);
  });

  document.getElementById("btn-contacto").addEventListener("click", () => {
    popup.innerHTML = `<a href="https://wa.me/584142726023" class="btn-whatsapp">📲 Contactar por WhatsApp</a>`;
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

  // Obtener boletos disponibles (del 1 al 10000, excluyendo vendidos en Firebase)
  async function obtenerBoletosDisponibles() {
    const vendidosSnap = await getDocs(collection(db, "boletosVendidos"));
    const vendidos = new Set();
    vendidosSnap.forEach(doc => {
      const datos = doc.data();
      if (Array.isArray(datos.boletos)) {
        datos.boletos.forEach(b => vendidos.add(parseInt(b)));
      }
    });

    boletosDisponibles = Array.from({ length: 10000 }, (_, i) => i + 1).filter(b => !vendidos.has(b));
    console.log("🎟️ Boletos disponibles:", boletosDisponibles.length);
  }

  function actualizarTotal() {
    let cantidad = parseInt(document.getElementById("numero-boletos").value);
    if (cantidad < 2) {
      cantidad = 2;
      document.getElementById("numero-boletos").value = 2;
    }
    const totalBs = cantidad * costoBoleto * tasaDolar;
    document.getElementById("total-bolivares").innerText = totalBs.toLocaleString("es-VE");
  }

  document.getElementById("btn-azar").addEventListener("click", () => {
    let cantidad = parseInt(document.getElementById("numero-boletos").value);
    if (boletosDisponibles.length === 0) {
      showPopup("⚠️ Aún no se han cargado los boletos disponibles.", 4000);
      return;
    }

    boletosSeleccionados.clear();
    document.getElementById("lista-numeros").innerHTML = "";

    while (boletosSeleccionados.size < cantidad && boletosDisponibles.length > 0) {
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

  // Envío y registro de formulario
  const btn = document.getElementById('button');
  const form = document.getElementById('form');

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    btn.value = 'Enviando...';

    const selectedBoletos = Array.from(boletosSeleccionados);
    if (selectedBoletos.length === 0) {
      showPopup("⚠️ Selecciona tus boletos antes de enviar.");
      return;
    }

    // Enviar correo con EmailJS
    emailjs.sendForm("service_yq2pt2d", "template_vwsrjs3", this)
      .then(async () => {
        // Guardar en Firebase
        await addDoc(collection(db, "boletosVendidos"), {
          nombre: form.nombre.value,
          identificacion: form.identificacion.value,
          telefono: form.telefono.value,
          email: form.email.value,
          referencia: form.referencia.value,
          monto: form.monto.value,
          boletos: selectedBoletos
        });

        // Limpiar formulario
        form.reset();
        document.getElementById("lista-numeros").innerHTML = "";
        document.getElementById("boletos-seleccionados").innerText = "0";
        document.getElementById("total-bolivares").innerText = "0";
        boletosSeleccionados.clear();

        showPopup("✅ ¡Formulario enviado y boletos registrados exitosamente!", 4000);
        btn.value = "Confirmar Compra";
        await obtenerBoletosDisponibles();
      })
      .catch((err) => {
        console.error("❌ Error al enviar:", err);
        showPopup("❌ Error al enviar. Intenta más tarde.", 4000);
        btn.value = "Confirmar Compra";
      });
  });

  await obtenerBoletosDisponibles();
});