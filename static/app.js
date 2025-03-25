document.addEventListener("DOMContentLoaded", () => {
    console.log("Página cargada correctamente");

    const popup = document.getElementById("popup");

    const tasaDolar = 80; // Tasa de cambio en bolívares
    const costoBoleto = 2; // Costo del boleto en dólares
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
        button.addEventListener("click", (event) => {
            event.preventDefault();
            button.classList.add("clicked");
            setTimeout(() => button.classList.remove("clicked"), 300);
        });
    });

    function obtenerBoletosDisponibles() {
        fetch('/boletos_disponibles')
            .then(response => response.json())
            .then(data => {
                boletosDisponibles = data;
            })
            .catch(error => console.error('Error al obtener los boletos disponibles:', error));
    }

    function actualizarTotal() {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
        if (cantidad < 2) {
            document.getElementById("numero-boletos").value = 2;
            cantidad = 2;
        }
        const totalBs = cantidad * costoBoleto * tasaDolar;
        document.getElementById("total-bolivares").innerText = totalBs.toLocaleString();
    }

    document.getElementById("btn-azar").addEventListener("click", () => {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);

        if (boletosDisponibles.length === 0) {
            showPopup("⚠️ Aún no se han cargado los boletos disponibles. Intenta de nuevo en unos segundos.", 4000);
            return;
        }

        boletosSeleccionados.clear();
        document.getElementById("lista-numeros").innerHTML = "";

        while (boletosSeleccionados.size < cantidad) {
            let numRifa = boletosDisponibles[Math.floor(Math.random() * boletosDisponibles.length)];
            if (!boletosSeleccionados.has(numRifa)) {
                boletosSeleccionados.add(numRifa);
                let listItem = document.createElement("li");
                listItem.innerText = `Boleto: ${numRifa}`;
                document.getElementById("lista-numeros").appendChild(listItem);
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

    // ✅ Usamos función tradicional para mantener el contexto de 'this'
    document.getElementById("datos-form").addEventListener("submit", function (event) {
        event.preventDefault();

        const termsChecked = document.getElementById("acepto-terminos").checked;
        if (!termsChecked) {
            showPopup("⚠️ Debes aceptar los términos y condiciones.", 4000);
            return;
        }

        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");

        emailjs.sendForm("service_yq2pt2d", "template_zm3k4bo", this)
            .then(function () {
                showPopup("✅ ¡Formulario enviado con éxito! Revisa tu correo.", 4000);
                document.getElementById("datos-form").reset();
                document.getElementById("lista-numeros").innerHTML = "";
                document.getElementById("boletos-seleccionados").innerText = "0";
                document.getElementById("total-bolivares").innerText = "0";
                boletosSeleccionados.clear();
            }, function (error) {
                console.error("Error:", error);
                showPopup("❌ Ocurrió un error al enviar. Intenta más tarde.", 4000);
            });
    });

    obtenerBoletosDisponibles();
});
