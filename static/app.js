document.addEventListener("DOMContentLoaded", () => {
    console.log("Página cargada correctamente");

    const popup = document.getElementById("popup");

    const tasaDolar = 80; // Tasa de cambio en bolívares
    const costoBoleto = 2; // Cambia el costo del boleto a $2
    const maxBoletos = 10000;
    const boletosSeleccionados = new Set();
    let boletosDisponibles = [];

    // Función para mostrar animaciones emergentes
    function showPopup(message, duration = 3000) {
        popup.innerHTML = `<p>${message}</p>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), duration);
    }

    // Botón "Premios" - Mensaje animado
    document.getElementById("btn-premios").addEventListener("click", () => {
        showPopup("🎉 ¿Te quieres ganar dos motos nuevas? 🚀 Compra YA y estarás participando por un Yamaha DT175 y un Empire RK200", 4000);
    });

    // Botón "Preguntas" - Mostrar preguntas frecuentes con animación
    document.getElementById("btn-preguntas").addEventListener("click", () => {
        popup.innerHTML = `
            <p><strong>📅 ¿Cuándo será la fecha del sorteo?</strong><br>Cuando se haya vendido la mitad de los boletos, anunciaremos la fecha.</p>
            <p><strong>📩 ¿Cómo sé si estoy participando?</strong><br>Recibirás un correo de confirmación después de tu pago.</p>
            <p><strong>🏆 ¿Cómo se elegirá el número ganador?</strong><br>El sorteo se hará con la plataforma de La Loteria de Medellin.</p>
        `;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    // Botón "Contacto" - Redirige a WhatsApp
    document.getElementById("btn-contacto").addEventListener("click", () => {
        popup.innerHTML = `<a href="https://wa.me/584142726023" class="btn-whatsapp">📲 Contactar por WhatsApp</a>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 6000);
    });

    // Animación al hacer clic en los botones del menú
    document.querySelectorAll("nav ul li a").forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            button.classList.add("clicked");
            setTimeout(() => button.classList.remove("clicked"), 300);
        });
    });

    // Obtener la lista de boletos disponibles desde el servidor
    function obtenerBoletosDisponibles() {
        fetch('/boletos_disponibles')
            .then(response => response.json())
            .then(data => {
                boletosDisponibles = data;
            })
            .catch(error => console.error('Error al obtener los boletos disponibles:', error));
    }

    // Actualizar total en bolívares en tiempo real
    function actualizarTotal() {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
        if (cantidad < 2) {
            document.getElementById("numero-boletos").value = 2; // Evita que seleccionen menos de 2 boletos
            cantidad = 2;
        }
        let totalBs = cantidad * costoBoleto * tasaDolar;
        document.getElementById("total-bolivares").innerText = totalBs.toLocaleString();
    }

    // Generar números de rifa aleatorios
    document.getElementById("btn-azar").addEventListener("click", () => {
        let cantidad = parseInt(document.getElementById("numero-boletos").value);
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
        actualizarTotal();

        // Actualizar el campo visible con los boletos seleccionados
        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");
    });

    // Detectar cambios en la cantidad de boletos y actualizar el total en bolívares
    document.getElementById("numero-boletos").addEventListener("input", actualizarTotal);

    // Efecto en los métodos de pago (copia automática al hacer clic)
    document.querySelectorAll(".pago-opcion p").forEach(p => {
        p.addEventListener("click", () => {
            navigator.clipboard.writeText(p.innerText);
            showPopup("📋 Copiado al portapapeles");
        });
    });

    // Animación al confirmar pago
    document.getElementById("datos-form").addEventListener("submit", (event) => {
        const termsChecked = document.getElementById("acepto-terminos").checked;
        if (!termsChecked) {
            event.preventDefault(); // Evita que el formulario se envíe automáticamente
            showPopup("⚠️ Debes aceptar los términos y condiciones.", 4000);
            return;
        }

        // Actualizar el campo visible con los boletos seleccionados antes de enviar el formulario
        document.getElementById("boletos").value = Array.from(boletosSeleccionados).join(", ");

        // Mostrar mensaje de verificación
        popup.innerHTML = `<p>🕒 Su transacción está siendo verificada. En breve le enviaremos un correo.</p>`;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 5000);
    });

    // Obtener la lista de boletos disponibles al cargar la página
    obtenerBoletosDisponibles();
});