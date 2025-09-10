/ admin.js - interactivity for admin dashboard
async function fetchRate() {
  const res = await fetch('/api/rates');
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('rate').value = data.rate || '';
  document.getElementById('rate-updated').innerText = data.updated_at || '--';
}

+/*async function saveRate() {
  const rate = parseFloat(document.getElementById('rate').value);
  const res = await fetch('/api/rates', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({rate}) });
  if (res.ok) {
    await fetchRate();
    alert('Tasa guardada');
  } else {
    alert('Error guardando tasa');
  }
}

async function fetchPurchases() {
  const res = await fetch('/admin/purchases');
  if (!res.ok) return;¿¿m 
  const data = await res.json();
  const body = document.getElementById('purchases-body');
  body.innerHTML = '';
  (data.purchases || []).forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nombre || ''}</td>` +
                   `<td>${p.identificacion || ''}</td>` +
                   `<td>${p.telefono || ''}</td>` +
                   `<td>${p.email || ''}</td>` +
                   `<td>${(p.tickets || []).join(', ')}</td>` +
                   `<td>${p.monto || ''}</td>` +
                   `<td>${p.referencia || ''}</td>` +
                   `<td>${p.currency || ''}</td>` +
                   `<td>${p.timestamp ? new Date(p.timestamp*1000).toLocaleString() : ''}</td>`;
    body.appendChild(tr);
  });
}

async function fetchTotal() {
  const res = await fetch('/admin/total');
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('total-tickets').value = data.total || '';
}

async function saveTotal() {
  const total = parseInt(document.getElementById('total-tickets').value, 10);
  const res = await fetch('/admin/total', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({total}) });
  if (res.ok) {
    alert('Total guardado');
  } else {
    alert('Error guardando total');
  }
}

async function exportCSV() {
  // Generate CSV from current purchases table data
  const rows = [];
  const headers = ['Nombre', 'Identificación', 'Teléfono', 'Email', 'Tickets', 'Monto', 'Referencia', 'Currency', 'Timestamp'];
  rows.push(headers.join(','));

  const tbody = document.getElementById('purchases-body');
  if (!tbody) {
    alert('No hay datos para exportar');
    return;
  }

  for (const tr of tbody.querySelectorAll('tr')) {
    const cols = Array.from(tr.querySelectorAll('td')).map(td => {
      // Escape quotes and commas in text
      let text = td.innerText.replace(/"/g, '""');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = `"${text}"`;
      }
      return text;
    });
    rows.push(cols.join(','));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ventas_tickets.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function clearAll() {
  if (!confirm('Esto eliminará todo: boletos vendidos, compras y tasas. ¿Continuar?')) return;
  const res = await fetch('/admin/clear', { method: 'POST' });
  if (res.ok) {
    alert('Datos limpiados');
    await fetchPurchases();
  } else {
    alert('Error limpiando');
  }
}

// bind events
window.addEventListener('DOMContentLoaded', () => {
  fetchRate();
  fetchPurchases();
  fetchTotal();

  document.getElementById('save-rate').addEventListener('click', saveRate);
  document.getElementById('refresh-rate').addEventListener('click', fetchRate);
  document.getElementById('export-csv').addEventListener('click', exportCSV);

  document.getElementById('save-total').addEventListener('click', saveTotal);
  document.getElementById('clear-all').addEventListener('click', clearAll);

  // refresh purchases periodically
  setInterval(fetchPurchases, 15000);
});
document.addEventListener('DOMContentLoaded', () => {
  const soldList = document.getElementById('sold-list');
  const refresh = document.getElementById('refresh');
  const exportBtn = document.getElementById('export');

  async function load() {
    const res = await fetch('/admin/data');
    if (!res.ok) return;
    const j = await res.json();
    soldList.innerHTML = '';
    (j.sold || []).forEach(s => {
      const li = document.createElement('li');
      li.innerText = s;
      soldList.appendChild(li);
    });
  }

  async function loadRate() {
    try {
      const r = await fetch('/api/rates');
      const j = await r.json();
      document.getElementById('rate').value = j.rate || '';
    } catch(e) { console.error('Could not load rate', e); }
  }

  document.getElementById('save-rate').addEventListener('click', async () => {
    const v = parseFloat(document.getElementById('rate').value);
    if (!v || v <= 0) return alert('Valor inválido');
    const res = await fetch('/api/rates', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({rate: v}) });
    if (res.ok) {
      alert('Tasa actualizada');
    } else {
      alert('Error actualizando tasa');
    }
  });

  refresh.addEventListener('click', load);
  exportBtn.addEventListener('click', () => { window.location = '/admin/export'; });

  load();
  loadRate();
});
