document.addEventListener("DOMContentLoaded", () => {
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

    // Navegación
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

    // Obtener boletos disponibles desde backend
    function obtenerBoletosDisponibles() {
        fetch('/boletos_disponibles')
            .then(res => res.json())
            .then(data => boletosDisponibles = data)
            .catch(err => console.error("Error al cargar boletos:", err));
    }

    // Calcular total en Bs
    function actualizarTotal() {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
        if (cantidad < 2) {
            cantidad = 2;
            document.getElementById("numero-boletos").value = 2;
        }
        const totalBs = cantidad * costoBoleto * tasaDolar;
        document.getElementById("total-bolivares").innerText = totalBs.toLocaleString("es-VE");
    }

    // Seleccionar boletos
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

    // Copiar métodos de pago
    document.querySelectorAll(".pago-opcion p").forEach(p => {
        p.addEventListener("click", () => {
            navigator.clipboard.writeText(p.innerText);
            showPopup("📋 Copiado al portapapeles");
        });
    });

    // Enviar formulario con EmailJS
    const btn = document.getElementById("button");
    const form = document.getElementById("form");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        btn.value = "Enviando...";

        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");

        emailjs.sendForm("default_service", "template_vwsrjs3", form)
            .then(() => {
                btn.value = "Confirmar Compra";
                showPopup("✅ ¡Formulario enviado con éxito! Revisa tu correo.", 4000);
                form.reset();
                document.getElementById("lista-numeros").innerHTML = "";
                document.getElementById("boletos-seleccionados").innerText = "0";
                document.getElementById("total-bolivares").innerText = "0";
                boletosSeleccionados.clear();
            }, (err) => {
                console.error("❌ Error al enviar:", err);
                btn.value = "Confirmar Compra";
                showPopup("❌ Ocurrió un error al enviar. Intenta más tarde.", 4000);
            });
    });

    // Inicializar boletos disponibles
    obtenerBoletosDisponibles();
});
