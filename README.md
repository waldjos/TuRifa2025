# TuRifa2025 - E2E Tests

Instrucciones rápidas para ejecutar la aplicación y las pruebas E2E localmente.

Prerequisitos:
- Python 3.11+
- Node 18+

Pasos:

1. Crear entorno Python e instalar dependencias:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

2. Instalar dependencias Node y Playwright:

```powershell
npm install
npx playwright install --with-deps
```

3. Levantar el servidor Flask:

```powershell
python app.py
```

4. Ejecutar la prueba E2E (en otra terminal):

```powershell
npm run e2e
```

Notas:
- El test usa la Realtime DB pública configurada en `templates/index.html`.
 - El test usa la Realtime DB pública configurada en `templates/index.html`.
 - Los endpoints `/reserve` y `/__vendidos_count` existen para facilitar pruebas locales; considere removerlos en producción.

Control de endpoints de prueba
-----------------------------

Estos endpoints de ayuda están deshabilitados por defecto. Para habilitarlos localmente establezca la variable de entorno `ALLOW_TEST_ENDPOINTS` a `1`, `true` o `yes` antes de ejecutar la app. Ejemplo (PowerShell):

```powershell
$env:ALLOW_TEST_ENDPOINTS = '1'; python app.py
```

En producción manténgalos deshabilitados (no establecer o poner `0`/`false`).

Control de moneda y tasa
------------------------

La UI permite elegir moneda (USD o Bs). La tasa de cambio (Bs por 1 USD) se obtiene de `/api/rates` y puede actualizarla el admin desde la ruta protegida (POST) con `{'rate': 130}`. Localmente la preferencia de moneda se guarda en `localStorage` (`turifa_currency`).

Ejemplo: obtener la tasa actual

```powershell
curl http://localhost:5000/api/rates
```

Ejemplo: actualizar la tasa (admin autenticado en sesión)

```powershell
curl -X POST http://localhost:5000/api/rates -H "Content-Type: application/json" -d '{"rate": 140}'
```

