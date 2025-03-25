from flask import Flask, render_template, jsonify, send_from_directory
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', '1234567890')

# Lista de boletos vendidos
boletos_vendidos = set()

@app.route('/')
def index():
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
