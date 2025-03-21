from flask import Flask, render_template, request, flash, jsonify, send_from_directory
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv('FLASK_SECRET_KEY', '1234567890')

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = app.config['MAIL_USERNAME']

mail = Mail(app)

# Lista de boletos vendidos
boletos_vendidos = set()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send_email', methods=['POST'])
def send_email():
    try:
        nombre = request.form['nombre']
        identificacion = request.form['identificacion']
        telefono = request.form['telefono']
        email = request.form['email']
        boletos = request.form['boletos']
        comprobante = request.files['comprobante']

        # Crear el mensaje de correo
        msg = Message('Nuevo mensaje de contacto',
                      sender=app.config['MAIL_USERNAME'],
                      recipients=[app.config['MAIL_USERNAME']])
        msg.body = f"Nombre: {nombre}\nIdentificación: {identificacion}\nTeléfono: {telefono}\nEmail: {email}\nBoletos: {boletos}".encode('utf-8')

        # Adjuntar el comprobante de pago
        if comprobante:
            msg.attach(comprobante.filename, comprobante.content_type, comprobante.read())

        # Enviar el mensaje
        mail.send(msg)

        # Actualizar la lista de boletos vendidos
        boletos_list = [int(boleto) for boleto in boletos.split(',')]
        boletos_vendidos.update(boletos_list)

        flash("Mensaje enviado correctamente.", "success")
    except Exception as e:
        print(f"Error: {e}")
        flash("Ocurrió un error al enviar el mensaje. Intenta de nuevo más tarde.", "danger")

    return render_template('index.html')

@app.route('/boletos_disponibles', methods=['GET'])
def boletos_disponibles():
    boletos_disponibles = list(set(range(1, 10001)) - boletos_vendidos)
    return jsonify(boletos_disponibles)

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == "__main__":
    app.run(debug=True)