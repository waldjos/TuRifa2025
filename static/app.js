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

    function obtenerBoletosDisponibles() {
        for (let i = 0; i < 10000; i++) {
            boletosDisponibles.push(i.toString().padStart(4, '0'));
        }
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

    document.getElementById('form')
        .addEventListener('submit', function (event) {
            event.preventDefault();
            btn.value = 'Enviando...';

            const serviceID = 'default_service';
            const templateID = 'template_vwsrjs3';

            emailjs.sendForm(serviceID, templateID, this)
                .then(() => {
                    btn.value = 'Confirmar Compra';
                    showPopup("✅ ¡Formulario enviado con éxito! Revisa tu correo.", 4000);
                    this.reset();
                    document.getElementById("lista-numeros").innerHTML = "";
                    document.getElementById("boletos-seleccionados").innerText = "0";
                    document.getElementById("total-bolivares").innerText = "0";

                    // Restar boletos seleccionados de los disponibles
                    boletosSeleccionados.forEach(boleto => {
                        const index = boletosDisponibles.indexOf(boleto);
                        if (index !== -1) {
                            boletosDisponibles.splice(index, 1);
                        }
                    });

                    boletosSeleccionados.clear();
                }, (err) => {
                    btn.value = 'Confirmar Compra';
                    showPopup("❌ Ocurrió un error al enviar. Intenta más tarde.", 4000);
                    console.error("❌ Error al enviar:", err);
                });
        });

    obtenerBoletosDisponibles();
});