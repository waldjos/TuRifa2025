# Test de Diagnóstico - Carga de CSS

## Pasos para diagnosticar el problema de carga de estilos CSS

### Opción 1: Test en el navegador (Recomendado)
1. **Abre el archivo `test_css_loading.html`** directamente en tu navegador
2. **Ejecuta cada test** haciendo clic en los botones
3. **Observa los resultados** que aparecen en pantalla
4. **Revisa la consola** del navegador (F12 → Console) para ver errores detallados

### Opción 2: Test con servidor Flask
1. **Ejecuta el script de diagnóstico:**
   ```bash
   python diagnostic_server.py
   ```
2. **Abre tu navegador** en: http://localhost:5000/diagnostic
3. **Observa los resultados** en la página de diagnóstico

### Opción 3: Verificación manual
1. **Verifica que los archivos existen:**
   ```bash
   ls -la static/
   ```
2. **Verifica la ruta del CSS** en `templates/index.html`:
   - Debe ser: `{{ url_for('static', filename='style.css') }}`
3. **Verifica permisos de archivos:**
   ```bash
   ls -la static/style.css
   ```

## Problemas Comunes y Soluciones

### 1. Cache del navegador
- **Solución:** Presiona `Ctrl+F5` o `Ctrl+Shift+R` para forzar recarga
- **Alternativa:** Abre en modo incógnito

### 2. Ruta incorrecta
- **Verifica:** Que el archivo `style.css` esté en la carpeta `static/`
- **Verifica:** Que la ruta en HTML sea correcta

### 3. Errores de sintaxis en CSS
- **Valida:** Usa https://jigsaw.w3.org/css-validator/
- **Revisa:** Comentarios o caracteres especiales

### 4. Servidor no sirve archivos estáticos
- **Verifica:** Configuración de Flask:
  ```python
  app = Flask(__name__, static_folder='static')
  ```

### 5. Extensiones del navegador
- **Desactiva:** AdBlockers o extensiones de privacidad
- **Prueba:** En modo incógnito

## Comandos útiles para verificar

```bash
# Verificar estructura de archivos
find . -name "*.css" -o -name "*.html"

# Verificar contenido del CSS
head -20 static/style.css

# Verificar servidor Flask
python -c "from app import app; app.run(debug=True)"
```

## Resultados esperados

✅ **CSS cargando correctamente:**
- El fondo del header debe ser naranja (#ff9100)
- Los enlaces deben ser de color naranja
- El logo debe tener efecto hover

❌ **CSS no cargando:**
- Todo el texto aparece en negro sobre fondo blanco
- No hay estilos visibles
- La página parece sin formato

## Si el problema persiste

1. **Copia los errores** de la consola del navegador
2. **Comparte los resultados** de los tests
3. **Verifica la configuración** del servidor
4. **Prueba con un CSS mínimo** para aislar el problema
