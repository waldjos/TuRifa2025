document.addEventListener("DOMContentLoaded", () => {
    console.log("Página cargada correctamente");

    const popup = document.getElementById("popup");

    const tasaDolar = 80; // Tasa de cambio en bolívares
    const costoBoleto = 2; // Costo del boleto en dólares
    const boletosSeleccionados = new Set();
    let boletosDisponibles = [];

    // Mostrar animaciones emergentes
    function showPopup(message, duration = 3000) {
        popup.innerHTML = `<p>${message}</p>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), duration);
    }

    // Botón "Premios"
    document.getElementById("btn-premios").addEventListener("click", () => {
        showPopup("🎉 ¿Te quieres ganar dos motos nuevas? 🚀 Compra YA y estarás participando por un Yamaha DT175 y un Empire RK200", 4000);
    });

    // Botón "Preguntas"
    document.getElementById("btn-preguntas").addEventListener("click", () => {
        popup.innerHTML = `
            <p><strong>📅 ¿Cuándo será la fecha del sorteo?</strong><br>Cuando se haya vendido la mitad de los boletos, anunciaremos la fecha.</p>
            <p><strong>📩 ¿Cómo sé si estoy participando?</strong><br>Recibirás un correo de confirmación después de tu pago.</p>
            <p><strong>🏆 ¿Cómo se elegirá el número ganador?</strong><br>El sorteo se hará con la plataforma de La Lotería de Medellín.</p>
        `;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    // Botón "Contacto"
    document.getElementById("btn-contacto").addEventListener("click", () => {
        popup.innerHTML = `<a href="https://wa.me/584142726023" class="btn-whatsapp">📲 Contactar por WhatsApp</a>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    // Efecto de clic en el menú
    document.querySelectorAll("nav ul li a").forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            button.classList.add("clicked");
            setTimeout(() => button.classList.remove("clicked"), 300);
        });
    });

    // Obtener lista de boletos disponibles desde el servidor
    function obtenerBoletosDisponibles() {
        fetch('/boletos_disponibles')
            .then(response => response.json())
            .then(data => {
                boletosDisponibles = data;
            })
            .catch(error => console.error('Error al obtener los boletos disponibles:', error));
    }

    // Actualizar total en bolívares
    function actualizarTotal() {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
        if (cantidad < 2) {
            document.getElementById("numero-boletos").value = 2;
            cantidad = 2;
        }
        const totalBs = cantidad * costoBoleto * tasaDolar;
        document.getElementById("total-bolivares").innerText = totalBs.toLocaleString();
    }

    // Selección aleatoria de boletos
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

    // Cambios en el número de boletos
    document.getElementById("numero-boletos").addEventListener("input", actualizarTotal);

    // Copiado automático en métodos de pago
    document.querySelectorAll(".pago-opcion p").forEach(p => {
        p.addEventListener("click", () => {
            navigator.clipboard.writeText(p.innerText);
            showPopup("📋 Copiado al portapapeles");
        });
    });

    // Validación y envío del formulario
    document.getElementById("datos-form").addEventListener("submit", (event) => {
        const termsChecked = document.getElementById("acepto-terminos").checked;
        if (!termsChecked) {
            event.preventDefault();
            showPopup("⚠️ Debes aceptar los términos y condiciones.", 4000);
            return;
        }

        // Asegura que los boletos se actualicen justo antes del envío
        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");
    });
});