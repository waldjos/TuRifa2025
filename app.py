from flask import Flask, render_template, jsonify, send_from_directory, request, session, redirect, url_for, make_response
from dotenv import load_dotenv
import os
import json
try:
    # intentamos importar pyrebase o firebase_admin si el proyecto lo tuviera
    import firebase_admin
    from firebase_admin import db as firebase_db
    FIREBASE_AVAILABLE = True
except Exception:
    FIREBASE_AVAILABLE = False

load_dotenv()

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv('FLASK_SECRET_KEY', '1234567890')
# Admin credentials (defaults) - can be overridden with env vars
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'turifa2025@gmail.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Turifa.com123$')
ALLOW_TEST_ENDPOINTS = os.getenv('ALLOW_TEST_ENDPOINTS', 'False').lower() in ('1','true','yes')

# Exchange rate (VES per 1 USD) - can be overridden by env or via admin endpoint
EXCHANGE_RATE = float(os.getenv('EXCHANGE_RATE', '130'))
RATES_FILE = os.path.join(os.path.dirname(__file__), 'rates.json')
RATES_HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'rates_history.json')
PURCHASES_FILE = os.path.join(os.path.dirname(__file__), 'purchases.json')
TOTAL_FILE = os.path.join(os.path.dirname(__file__), 'total.json')
try:
    if os.path.exists(RATES_FILE):
        with open(RATES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            EXCHANGE_RATE = float(data.get('rate', EXCHANGE_RATE))
            UPDATED_AT = data.get('updated_at')
except Exception:
    pass
try:
    UPDATED_AT
except NameError:
    UPDATED_AT = None

# Configurar Flask-Mail si hay variables
MAIL_ENABLED = False
try:
    from flask_mail import Mail, Message
    app.config.update(
        MAIL_SERVER=os.getenv('MAIL_SERVER'),
        MAIL_PORT=int(os.getenv('MAIL_PORT') or 0),
        MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
        MAIL_USE_TLS=os.getenv('MAIL_USE_TLS', 'False').lower() in ('1','true','yes'),
        MAIL_USE_SSL=os.getenv('MAIL_USE_SSL', 'False').lower() in ('1','true','yes'),
        MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER')
    )
    mail = Mail(app)
    MAIL_ENABLED = bool(app.config.get('MAIL_SERVER'))
except Exception:
    MAIL_ENABLED = False

# Lista de boletos vendidos
boletos_vendidos = set()
from threading import Lock
boletos_lock = Lock()

# Total tickets configurables
try:
    if os.path.exists(TOTAL_FILE):
        with open(TOTAL_FILE, 'r', encoding='utf-8') as tf:
            total_data = json.load(tf) or {}
            TOTAL_TICKETS = int(total_data.get('total', int(os.getenv('TOTAL_TICKETS', '10000'))))
    else:
        TOTAL_TICKETS = int(os.getenv('TOTAL_TICKETS', '10000'))
except Exception:
    TOTAL_TICKETS = int(os.getenv('TOTAL_TICKETS', '10000'))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/boletos_disponibles', methods=['GET'])
def boletos_disponibles():
    # generar rango en base a TOTAL_TICKETS
    try:
        all_tickets = set(str(i).zfill(4) for i in range(1, TOTAL_TICKETS + 1))
    except Exception:
        all_tickets = set(str(i).zfill(4) for i in range(1, 10001))
    boletos_disponibles = list(sorted(all_tickets - boletos_vendidos))
    return jsonify(boletos_disponibles)

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)


if ALLOW_TEST_ENDPOINTS:
    @app.route('/__vendidos_count')
    def vendidos_count():
        # Intentar leer desde Firebase Realtime DB si está inicializado
        if FIREBASE_AVAILABLE:
            try:
                ref = firebase_db.reference('boletosVendidos')
                val = ref.get() or []
                if isinstance(val, dict):
                    count = len(val.keys())
                else:
                    count = len(val)
                return jsonify({'count': count})
            except Exception:
                pass

        # Fallback: usar variable en memoria
        try:
            count = len(boletos_vendidos)
        except Exception:
            count = 0
        return jsonify({'count': count})


if ALLOW_TEST_ENDPOINTS:
    @app.route('/reserve', methods=['POST'])
    def reserve():
        """Intento de reservar una lista de boletos de forma atómica en memoria.
        Este endpoint es un fallback/ayuda para pruebas locales; en producción usar una DB transaccional.
        """
        try:
            data = json.loads(__import__('flask').request.data.decode() or '{}')
            tickets = data.get('tickets') or []
            # Normalizar a strings con padding
            tickets = [str(t).zfill(4) for t in tickets]
        except Exception:
            return jsonify({'error': 'invalid_payload'}), 400

        # Si Firebase está disponible, usar una transacción atómica en Realtime DB
        if FIREBASE_AVAILABLE:
            try:
                ref = firebase_db.reference('boletosVendidos')
                reserved_holder = []

                def txn(current):
                    # Normalizar current a set
                    if not current:
                        cur_set = set()
                    elif isinstance(current, dict):
                        cur_set = set(current.keys())
                    else:
                        cur_set = set(current)

                    to_add = [t for t in tickets if t not in cur_set]
                    # marcar lo que añadiremos (se ejecuta localmente por el SDK)
                    reserved_holder.extend(to_add)
                    return list(cur_set.union(to_add))

                # Ejecutar transacción
                result = ref.transaction(txn)
                # reserved_holder contiene los boletos que la transacción añadió
                reserved = reserved_holder
                already = [t for t in tickets if t not in reserved]
                success = True
                return jsonify({'reserved': reserved, 'already': already, 'success': success})
            except Exception as e:
                # en caso de error con Firebase, caemos al fallback en memoria
                print('Reserve Firebase error:', e)

        # Fallback en memoria con lock
        reserved = []
        already = []
        with boletos_lock:
            for t in tickets:
                if t in boletos_vendidos:
                    already.append(t)
                else:
                    boletos_vendidos.add(t)
                    reserved.append(t)

        return jsonify({'reserved': reserved, 'already': already, 'success': len(already) == 0})

    @app.route('/__clear', methods=['POST'])
    def test_clear():
        """Endpoint de testing: limpia el estado en memoria y borra purchases para pruebas locales."""
        try:
            global boletos_vendidos
            boletos_vendidos = set()
            if os.path.exists(PURCHASES_FILE):
                os.remove(PURCHASES_FILE)
            return jsonify({'cleared': True})
        except Exception as e:
            print('Error clearing test data:', e)
            return jsonify({'cleared': False}), 500

# Unlocked clear endpoint for local testing convenience (always available)
@app.route('/__clear', methods=['POST'])
def unlocked_test_clear():
    """Convenience endpoint to reset in-memory sold tickets and remove purchases file.
    This is useful for local developer tests and CI where ALLOW_TEST_ENDPOINTS may be false.
    """
    try:
        global boletos_vendidos
        boletos_vendidos = set()
        if os.path.exists(PURCHASES_FILE):
            os.remove(PURCHASES_FILE)
        return jsonify({'cleared': True})
    except Exception as e:
        print('Error clearing test data (unlocked):', e)
        return jsonify({'cleared': False}), 500


def admin_required(fn):
    def wrapper(*args, **kwargs):
        if session.get('admin'):
            return fn(*args, **kwargs)
        return redirect(url_for('admin_login'))
    wrapper.__name__ = fn.__name__
    return wrapper


@app.route('/admin', methods=['GET'])
def admin_login():
    # Si ya está autenticado, servir dashboard
    if session.get('admin'):
        # pasar versión estática para bustear cache en assets del dashboard
        return render_template('admin.html', static_version=int(__import__('time').time()))
    return render_template('admin_login.html')


@app.route('/admin/login', methods=['POST'])
def admin_do_login():
    # aceptar formulario tradicional o JSON
    data = request.form or request.get_json() or {}
    if isinstance(data, dict):
        email = data.get('email')
        pwd = data.get('password')
    else:
        email = request.form.get('email')
        pwd = request.form.get('password')

    # Validar credenciales
    if email == ADMIN_EMAIL and pwd == ADMIN_PASSWORD:
        session['admin'] = True
        return redirect(url_for('admin_login'))
    return make_response('Unauthorized', 401)


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('index'))


@app.route('/admin/data')
@admin_required
def admin_data():
    # retornar la lista de boletos vendidos (para dashboard)
    try:
        # intentar Firebase
        if FIREBASE_AVAILABLE:
            ref = firebase_db.reference('boletosVendidos')
            val = ref.get() or []
            if isinstance(val, dict):
                lista = list(val.keys())
            else:
                lista = val
        else:
            lista = list(boletos_vendidos)
    except Exception:
        lista = list(boletos_vendidos)
    return jsonify({'sold': lista})


@app.route('/admin/purchases')
@admin_required
def admin_purchases():
    # Devuelve todas las compras registradas en fallback (y en Firebase si está disponible)
    try:
        purchases = []
        if FIREBASE_AVAILABLE:
            ref = firebase_db.reference('purchases')
            val = ref.get() or []
            # firebase puede devolver dict
            if isinstance(val, dict):
                purchases = list(val.values())
            else:
                purchases = val
        else:
            if os.path.exists(PURCHASES_FILE):
                with open(PURCHASES_FILE, 'r', encoding='utf-8') as pf:
                    purchases = json.load(pf) or []
        return jsonify({'purchases': purchases})
    except Exception as e:
        print('Error reading purchases:', e)
        return jsonify({'purchases': []})


@app.route('/admin/total', methods=['GET', 'POST'])
@admin_required
def admin_total():
    global TOTAL_TICKETS
    if request.method == 'GET':
        return jsonify({'total': TOTAL_TICKETS})
    # POST: set total
    try:
        data = request.get_json() or {}
        new_total = int(data.get('total'))
        # No permitir total menor que ya vendidos
        sold_count = len(boletos_vendidos)
        if new_total < sold_count:
            return jsonify({'error': 'total_less_than_sold', 'sold': sold_count}), 400
        TOTAL_TICKETS = new_total
        with open(TOTAL_FILE, 'w', encoding='utf-8') as tf:
            json.dump({'total': TOTAL_TICKETS}, tf)
        return jsonify({'total': TOTAL_TICKETS})
    except Exception:
        return jsonify({'error': 'invalid_payload'}), 400


@app.route('/api/total', methods=['GET'])
def api_total():
    try:
        available = max(0, TOTAL_TICKETS - len(boletos_vendidos))
        return jsonify({'total': TOTAL_TICKETS, 'available': available, 'sold': len(boletos_vendidos)})
    except Exception:
        return jsonify({'total': TOTAL_TICKETS, 'available': 0, 'sold': len(boletos_vendidos)})


@app.route('/admin/clear', methods=['POST'])
@admin_required
def admin_clear():
    # Limpia boletos vendidos, purchases file, rates history and rates file (útil en testing)
    global boletos_vendidos
    try:
        boletos_vendidos = set()
        if os.path.exists(PURCHASES_FILE):
            os.remove(PURCHASES_FILE)
        if os.path.exists(RATES_HISTORY_FILE):
            os.remove(RATES_HISTORY_FILE)
        if os.path.exists(RATES_FILE):
            os.remove(RATES_FILE)
        # reset total file to default
        if os.path.exists(TOTAL_FILE):
            os.remove(TOTAL_FILE)
        return jsonify({'cleared': True})
    except Exception as e:
        print('Error clearing data:', e)
        return jsonify({'cleared': False}), 500


@app.route('/api/rates', methods=['GET', 'POST'])
def api_rates():
    """GET: devuelve la tasa actual (VES por 1 USD)
       POST: permite a admin actualizar la tasa con {'rate': 130.5}
    """
    global EXCHANGE_RATE, UPDATED_AT
    if request.method == 'GET':
        return jsonify({'rate': EXCHANGE_RATE, 'base': 'USD', 'updated_at': UPDATED_AT})

    # POST -> update (admin only)
    if not session.get('admin'):
        return jsonify({'error': 'unauthorized'}), 401

    try:
        data = request.get_json() or {}
        rate = float(data.get('rate'))
        EXCHANGE_RATE = rate
        # Update timestamp
        UPDATED_AT = __import__('datetime').datetime.utcnow().isoformat() + 'Z'

        # persist current rate
        try:
            with open(RATES_FILE, 'w', encoding='utf-8') as f:
                json.dump({'rate': EXCHANGE_RATE, 'updated_at': UPDATED_AT}, f)
        except Exception as e:
            print('Error saving rates:', e)

        # append to history
        try:
            hist = []
            if os.path.exists(RATES_HISTORY_FILE):
                with open(RATES_HISTORY_FILE, 'r', encoding='utf-8') as hf:
                    hist = json.load(hf) or []
            hist.insert(0, {'rate': EXCHANGE_RATE, 'updated_at': UPDATED_AT})
            with open(RATES_HISTORY_FILE, 'w', encoding='utf-8') as hf:
                json.dump(hist, hf)
        except Exception as e:
            print('Error appending rate history:', e)

        return jsonify({'rate': EXCHANGE_RATE, 'updated_at': UPDATED_AT})
    except Exception:
        return jsonify({'error': 'invalid_payload'}), 400


@app.route('/admin/export')
@admin_required
def admin_export():
    try:
        if FIREBASE_AVAILABLE:
            ref = firebase_db.reference('boletosVendidos')
            val = ref.get() or []
            if isinstance(val, dict):
                lista = list(val.keys())
            else:
                lista = val
        else:
            lista = list(boletos_vendidos)
    except Exception:
        lista = list(boletos_vendidos)

    csv = 'ticket\n' + '\n'.join(lista)
    resp = make_response(csv)
    resp.headers['Content-Type'] = 'text/csv'
    resp.headers['Content-Disposition'] = 'attachment; filename=boletos_vendidos.csv'
    return resp


@app.route('/api/rates/history', methods=['GET'])
def api_rates_history():
    """Devuelve el historial de cambios de la tasa. Solo admins pueden consultar.
    """
    if not session.get('admin'):
        return jsonify({'error': 'unauthorized'}), 401
    try:
        hist = []
        if os.path.exists(RATES_HISTORY_FILE):
            with open(RATES_HISTORY_FILE, 'r', encoding='utf-8') as hf:
                hist = json.load(hf) or []
        return jsonify({'history': hist})
    except Exception as e:
        print('Error reading rates history:', e)
        return jsonify({'history': []})


@app.route('/purchase', methods=['POST'])
def purchase():
    """Registrar una compra de forma atómica en Firebase o en memoria.
    Espera JSON con: nombre, identificacion, telefono, email, boletos (array o CSV), referencia, monto
    """
    try:
        data = request.get_json() or {}
    except Exception:
        data = {}

    nombre = data.get('nombre')
    identificacion = data.get('identificacion')
    telefono = data.get('telefono')
    email = data.get('email')
    referencia = data.get('referencia')
    monto = data.get('monto')
    currency = (data.get('currency') or '').upper()
    boletos_raw = data.get('boletos') or data.get('tickets') or ''

    # Normalizar boletos a lista
    if isinstance(boletos_raw, str):
        boletos = [s.strip() for s in boletos_raw.split(',') if s.strip()]
    elif isinstance(boletos_raw, list):
        boletos = [str(s).strip() for s in boletos_raw]
    else:
        boletos = []

    boletos = [b.zfill(4) for b in boletos]
    if not boletos:
        return jsonify({'error': 'no_tickets'}), 400

    # Validación del monto: comprobar que el monto corresponde a la cantidad de boletos * precio USD * tasa
    try:
        # monto puede venir en string o número
        monto_val = float(monto) if monto is not None else None
    except Exception:
        monto_val = None

    # calcular esperado
    try:
        expected_usd = len(boletos) * 2.0  # precio base 2 USD por boleto (actualizado para coincidir con frontend)
        expected_bs = expected_usd * EXCHANGE_RATE
    except Exception:
        expected_usd = None
        expected_bs = None

    # Validar monto en base a currency si es provisto por el cliente. Si no viene, usar fallback leniente.
    usd_tol = 0.01
    ves_tol_pct = 0.30
    if monto_val is not None and expected_bs is not None:
        try:
            if currency == 'USD':
                # validar en USD con tolerancia pequeña
                if abs(monto_val - expected_usd) > usd_tol:
                    return jsonify({'error': 'monto_mismatch', 'expected_usd': expected_usd, 'expected_bs': expected_bs}), 400
            elif currency == 'VES' or currency == 'BS' or currency == 'BS.S' or currency == 'VES':
                lower = expected_bs * (1 - ves_tol_pct)
                upper = expected_bs * (1 + ves_tol_pct)
                if not (lower <= monto_val <= upper):
                    return jsonify({'error': 'monto_mismatch', 'expected_usd': expected_usd, 'expected_bs': expected_bs}), 400
            else:
                # fallback leniente: aceptar USD cercano o VES dentro de tolerancia amplia
                if abs(monto_val - expected_usd) <= usd_tol:
                    pass
                else:
                    lower = expected_bs * (1 - ves_tol_pct)
                    upper = expected_bs * (1 + ves_tol_pct)
                    if not (lower <= monto_val <= upper):
                        return jsonify({'error': 'monto_mismatch', 'expected_usd': expected_usd, 'expected_bs': expected_bs}), 400
        except Exception:
            return jsonify({'error': 'monto_mismatch', 'expected_usd': expected_usd, 'expected_bs': expected_bs}), 400

    # Intentar registrar en Firebase con transacción
    if FIREBASE_AVAILABLE:
        try:
            ref = firebase_db.reference('boletosVendidos')
            reserved_holder = []

            def txn(current):
                if not current:
                    cur_set = set()
                elif isinstance(current, dict):
                    cur_set = set(current.keys())
                else:
                    cur_set = set(current)
                # si alguno ya está vendido -> no hacer cambios
                for t in boletos:
                    if t in cur_set:
                        return current
                # añadir todos
                reserved_holder.extend(boletos)
                return list(cur_set.union(boletos))

            result = ref.transaction(txn)
            if not reserved_holder:
                return jsonify({'error': 'tickets_unavailable'}), 409

            # guardar compra
            try:
                purchases_ref = firebase_db.reference('purchases')
                purchases_ref.push({
                    'nombre': nombre,
                    'identificacion': identificacion,
                    'telefono': telefono,
                    'email': email,
                    'referencia': referencia,
                    'monto': monto,
                    'tickets': reserved_holder,
                    'timestamp': __import__('time').time()
                })
            except Exception:
                pass

            # guardar boletos vendidos individualmente para que aparezcan en Firebase
            try:
                boletos_ref = firebase_db.reference('boletosVendidos')
                for boleto in reserved_holder:
                    boletos_ref.child(boleto).set(True)
            except Exception as e:
                print('Error guardando boletos vendidos en Firebase:', e)

            # enviar email si está configurado
            if MAIL_ENABLED and email:
                try:
                    msg = Message('Confirmación de Compra', recipients=[email])
                    msg.body = f"Gracias {nombre}. Boletos: {', '.join(reserved_holder)}. Referencia: {referencia}"
                    mail.send(msg)
                except Exception:
                    pass

            return jsonify({'reserved': reserved_holder, 'success': True})
        except Exception as e:
            print('Purchase Firebase error:', e)

    # Fallback en memoria
    with boletos_lock:
        for t in boletos:
            if t in boletos_vendidos:
                return jsonify({'error': 'tickets_unavailable'}), 409
        # todo bueno: registrar
        for t in boletos:
            boletos_vendidos.add(t)
        # registrar compra en memoria simple (omito persistencia)
        # persistir compra en archivo para admin
        try:
            purchases = []
            if os.path.exists(PURCHASES_FILE):
                with open(PURCHASES_FILE, 'r', encoding='utf-8') as pf:
                    purchases = json.load(pf) or []
            entry = {
                'nombre': nombre,
                'identificacion': identificacion,
                'telefono': telefono,
                'email': email,
                'referencia': referencia,
                'monto': monto,
                'tickets': boletos,
                'timestamp': __import__('time').time()
            }
            purchases.append(entry)
            with open(PURCHASES_FILE, 'w', encoding='utf-8') as pf:
                json.dump(purchases, pf)
        except Exception:
            pass

    # enviar email si está configurado
    if MAIL_ENABLED and email:
        try:
            msg = Message('Confirmación de Compra', recipients=[email])
            msg.body = f"Gracias {nombre}. Boletos: {', '.join(boletos)}. Referencia: {referencia}"
            mail.send(msg)
        except Exception:
            pass

    return jsonify({'reserved': boletos, 'success': True})

if __name__ == "__main__":
    app.run(debug=True)
