#!/usr/bin/env python3
"""
Script de diagnóstico para verificar la configuración del servidor
y la carga de archivos estáticos.
"""

import os
import sys
from flask import Flask, send_from_directory

# Crear app Flask para pruebas
app = Flask(__name__)

@app.route('/')
def test_page():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Server</title>
        <link rel="stylesheet" href="/static/style.css">
    </head>
    <body>
        <h1>Test de Servidor Flask</h1>
        <p>Si ves este texto con fondo naranja, el CSS está funcionando.</p>
        <img src="/static/Logo.png" alt="Logo" style="max-width: 100px;">
    </body>
    </html>
    '''

@app.route('/diagnostic')
def diagnostic():
    """Página de diagnóstico completo"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Diagnóstico Completo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
            .pass { background-color: #d4edda; }
            .fail { background-color: #f8d7da; }
        </style>
    </head>
    <body>
        <h1>Diagnóstico de Carga de Recursos</h1>
        
        <div class="test">
            <h3>Test 1: Carga de CSS</h3>
            <link rel="stylesheet" href="/static/style.css" onload="this.parentElement.classList.add('pass')" onerror="this.parentElement.classList.add('fail')">
            <p>Estado: <span id="css-status">Verificando...</span></p>
        </div>
        
        <div class="test">
            <h3>Test 2: Carga de Imagen</h3>
            <img src="/static/Logo.png" alt="Test" onload="this.parentElement.classList.add('pass')" onerror="this.parentElement.classList.add('fail')">
            <p>Estado: <span id="img-status">Verificando...</span></p>
        </div>
        
        <div class="test">
            <h3>Información del Servidor</h3>
            <ul>
                <li>Static folder: ''' + os.path.join(os.getcwd(), 'static') + '''</li>
                <li>Static files exist: ''' + str(os.path.exists('static')) + '''</li>
                <li>style.css exists: ''' + str(os.path.exists('static/style.css')) + '''</li>
                <li>Logo.png exists: ''' + str(os.path.exists('static/Logo.png')) + '''</li>
            </ul>
        </div>
    </body>
    </html>
    '''

@app.route('/static/<path:filename>')
def custom_static(filename):
    """Ruta personalizada para archivos estáticos con logging"""
    print(f"Solicitando archivo estático: {filename}")
    try:
        return send_from_directory('static', filename)
    except Exception as e:
        print(f"Error al servir {filename}: {e}")
        return f"Error: {e}", 404

if __name__ == '__main__':
    print("=== DIAGNÓSTICO DEL SERVIDOR ===")
    print(f"Directorio actual: {os.getcwd()}")
    print(f"Directorio static: {os.path.join(os.getcwd(), 'static')}")
    print(f"Archivos en static: {os.listdir('static') if os.path.exists('static') else 'No existe'}")
    
    print("\nIniciando servidor de diagnóstico...")
    print("Abre http://localhost:5000/diagnostic para ver el diagnóstico completo")
    app.run(debug=True, port=5000)
