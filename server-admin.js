import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const DB_PATH = process.env.DB_PATH || '/www/wwwroot/rkb.coastaltechhub.com/sns/sns.db';
const PORT = Number(process.env.ADMIN_PORT || 7070);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme123';

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database file not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: false, fileMustExist: true });
db.pragma('journal_mode = WAL');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function getTables() {
  return db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    .all()
    .map((r) => r.name);
}

function getColumns(table) {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all();
}

function getPrimaryKeyColumn(table) {
  const cols = getColumns(table);
  const pk = cols.find((c) => c.pk === 1);
  return pk?.name || null;
}

function getRows(table, limit = 100, offset = 0, search = '') {
  const cols = getColumns(table);
  if (!cols.length) return { rows: [], total: 0 };

  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  let where = '';
  let params = {};

  if (search.trim()) {
    const searchParts = cols.map((col, i) => `CAST(${quoteIdentifier(col.name)} AS TEXT) LIKE @q`);
    where = `WHERE ${searchParts.join(' OR ')}`;
    params.q = `%${search.trim()}%`;
  }

  const sql = `SELECT * FROM ${quoteIdentifier(table)} ${where} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const countSql = `SELECT COUNT(*) as total FROM ${quoteIdentifier(table)} ${where}`;

  return {
    rows: db.prepare(sql).all(params),
    total: db.prepare(countSql).get(params).total,
  };
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="SQLite Admin"');
    return res.status(401).send('Authentication required');
  }

  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="SQLite Admin"');
    return res.status(401).send('Invalid credentials');
  }

  next();
}

app.use(requireAuth);

app.get('/api/meta', (req, res) => {
  try {
    const tables = getTables().map((name) => ({
      name,
      columns: getColumns(name).length,
      rows: db.prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(name)}`).get().count,
    }));

    res.json({
      dbPath: DB_PATH,
      tables,
    });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});

app.get('/api/table/:table', (req, res) => {
  try {
    const table = req.params.table;
    if (!getTables().includes(table)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const columns = getColumns(table);
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const search = String(req.query.search || '');
    const data = getRows(table, limit, offset, search);

    res.json({
      table,
      columns,
      primaryKey: getPrimaryKeyColumn(table),
      limit,
      offset,
      search,
      total: data.total,
      rows: data.rows,
    });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});

app.post('/api/table/:table/insert', (req, res) => {
  try {
    const table = req.params.table;
    if (!getTables().includes(table)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const columns = getColumns(table);
    const payload = req.body || {};
    const writable = columns.filter((c) => !(c.pk === 1 && c.type.toUpperCase().includes('INTEGER')));
    const fields = [];
    const values = [];
    const params = {};

    for (const col of writable) {
      if (Object.prototype.hasOwnProperty.call(payload, col.name)) {
        fields.push(quoteIdentifier(col.name));
        values.push(`@${col.name}`);
        params[col.name] = payload[col.name] === '' ? null : payload[col.name];
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const sql = `INSERT INTO ${quoteIdentifier(table)} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
    const result = db.prepare(sql).run(params);
    res.json({ ok: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});

app.post('/api/table/:table/update', (req, res) => {
  try {
    const table = req.params.table;
    if (!getTables().includes(table)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const pk = getPrimaryKeyColumn(table);
    if (!pk) {
      return res.status(400).json({ error: 'This table has no primary key; inline update is disabled.' });
    }

    const columns = getColumns(table);
    const payload = req.body || {};
    const id = payload[pk];

    if (id === undefined || id === null || id === '') {
      return res.status(400).json({ error: `Missing primary key value: ${pk}` });
    }

    const updates = [];
    const params = { __pk: id };

    for (const col of columns) {
      if (col.name === pk) continue;
      if (Object.prototype.hasOwnProperty.call(payload, col.name)) {
        updates.push(`${quoteIdentifier(col.name)} = @${col.name}`);
        params[col.name] = payload[col.name] === '' ? null : payload[col.name];
      }
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sql = `UPDATE ${quoteIdentifier(table)} SET ${updates.join(', ')} WHERE ${quoteIdentifier(pk)} = @__pk`;
    const result = db.prepare(sql).run(params);
    res.json({ ok: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});

app.post('/api/table/:table/delete', (req, res) => {
  try {
    const table = req.params.table;
    if (!getTables().includes(table)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const pk = getPrimaryKeyColumn(table);
    if (!pk) {
      return res.status(400).json({ error: 'This table has no primary key; delete is disabled.' });
    }

    const id = req.body?.[pk];
    if (id === undefined || id === null || id === '') {
      return res.status(400).json({ error: `Missing primary key value: ${pk}` });
    }

    const sql = `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(pk)} = ?`;
    const result = db.prepare(sql).run(id);
    res.json({ ok: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
});

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SQLite Admin Dashboard</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: #131a2a;
      --muted: #90a1b9;
      --text: #e8eef8;
      --line: #25304a;
      --accent: #4f8cff;
      --danger: #e05d5d;
      --ok: #35b46a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      background: #0e1526;
      padding: 18px;
    }
    .brand { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .sub { color: var(--muted); font-size: 12px; margin-bottom: 18px; word-break: break-all; }
    .table-list { display: grid; gap: 8px; }
    .table-btn {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      padding: 12px;
      text-align: left;
      border-radius: 12px;
      cursor: pointer;
    }
    .table-btn.active { outline: 2px solid var(--accent); }
    .main { padding: 18px; }
    .toolbar, .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    input, textarea, select, button {
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #0d1424;
      color: var(--text);
      padding: 10px 12px;
    }
    button { cursor: pointer; }
    button.primary { background: var(--accent); border-color: var(--accent); }
    button.danger { background: var(--danger); border-color: var(--danger); }
    button.ok { background: var(--ok); border-color: var(--ok); }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 10px;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th { position: sticky; top: 0; background: #16203a; }
    .table-wrap { overflow: auto; }
    .muted { color: var(--muted); }
    .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    .stat-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .stat { background: #0d1424; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
    .actions { display: flex; gap: 8px; }
    .notice { color: #ffcf70; margin-top: 8px; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">SQLite Admin</div>
      <div class="sub" id="dbPath">Loading...</div>
      <div class="table-list" id="tableList"></div>
    </aside>
    <main class="main">
      <div class="toolbar">
        <input id="search" placeholder="Search current table..." />
        <button class="primary" onclick="reloadCurrent()">Search</button>
        <button onclick="openInsertForm()">New Row</button>
        <button onclick="loadMeta()">Refresh</button>
        <span class="muted" id="status"></span>
      </div>
      <div class="card">
        <div class="stat-row">
          <div class="stat"><strong id="tableName">No table</strong></div>
          <div class="stat">Rows: <strong id="rowCount">0</strong></div>
          <div class="stat">Page Offset: <strong id="offsetValue">0</strong></div>
        </div>
        <div class="table-wrap" id="tableWrap"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Insert / Edit Row</h3>
        <div class="grid" id="formGrid"></div>
        <div class="actions" style="margin-top:12px">
          <button class="ok" onclick="saveRow()">Save</button>
          <button onclick="openInsertForm()">Clear</button>
        </div>
        <div class="notice">Tables without a primary key cannot be edited or deleted inline safely.</div>
      </div>
    </main>
  </div>

  <script>
    let meta = null;
    let currentTable = null;
    let currentColumns = [];
    let currentPrimaryKey = null;
    let currentRows = [];
    let offset = 0;
    const limit = 100;

    function setStatus(message) {
      document.getElementById('status').textContent = message || '';
    }

    async function api(url, options = {}) {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    async function loadMeta() {
      setStatus('Loading metadata...');
      meta = await api('/api/meta');
      document.getElementById('dbPath').textContent = meta.dbPath;
      const wrap = document.getElementById('tableList');
      wrap.innerHTML = '';
      meta.tables.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'table-btn' + (currentTable === t.name ? ' active' : '');
        btn.innerHTML = '<strong>' + escapeHtml(t.name) + '</strong><br><span class="muted">' + t.rows + ' rows · ' + t.columns + ' columns</span>';
        btn.onclick = () => selectTable(t.name);
        wrap.appendChild(btn);
      });
      if (!currentTable && meta.tables.length) {
        await selectTable(meta.tables[0].name);
      } else {
        highlightCurrentTable();
      }
      setStatus('Ready');
    }

    function highlightCurrentTable() {
      document.querySelectorAll('.table-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(currentTable || ''));
      });
    }

    async function selectTable(name) {
      currentTable = name;
      offset = 0;
      await reloadCurrent();
      highlightCurrentTable();
    }

    async function reloadCurrent() {
      if (!currentTable) return;
      setStatus('Loading ' + currentTable + '...');
      const search = document.getElementById('search').value || '';
      const data = await api('/api/table/' + encodeURIComponent(currentTable) + '?limit=' + limit + '&offset=' + offset + '&search=' + encodeURIComponent(search));
      currentColumns = data.columns;
      currentPrimaryKey = data.primaryKey;
      currentRows = data.rows;
      document.getElementById('tableName').textContent = data.table;
      document.getElementById('rowCount').textContent = data.total;
      document.getElementById('offsetValue').textContent = data.offset;
      renderTable(data.rows);
      buildForm();
      highlightCurrentTable();
      setStatus('Loaded ' + data.rows.length + ' rows');
    }

    function renderTable(rows) {
      const wrap = document.getElementById('tableWrap');
      if (!currentColumns.length) {
        wrap.innerHTML = '<div class="muted">No columns found.</div>';
        return;
      }

      let html = '<table><thead><tr>';
      for (const col of currentColumns) {
        html += '<th>' + escapeHtml(col.name) + '<br><span class="muted">' + escapeHtml(col.type || 'TEXT') + '</span></th>';
      }
      html += '<th>Actions</th></tr></thead><tbody>';

      for (const row of rows) {
        html += '<tr>';
        for (const col of currentColumns) {
          const value = row[col.name];
          html += '<td><pre>' + escapeHtml(value === null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)) + '</pre></td>';
        }
        html += '<td><div class="actions">';
        html += '<button onclick="editRow(' + encodeURIComponent(JSON.stringify(row)) + ')">Edit</button>';
        if (currentPrimaryKey) {
          html += '<button class="danger" onclick="deleteRow(' + JSON.stringify(row[currentPrimaryKey]) + ')">Delete</button>';
        }
        html += '</div></td></tr>';
      }

      html += '</tbody></table>';
      html += '<div class="actions" style="margin-top:12px">';
      html += '<button onclick="prevPage()">Previous</button>';
      html += '<button onclick="nextPage()">Next</button>';
      html += '</div>';
      wrap.innerHTML = html;
    }

    function buildForm(row = null) {
      const grid = document.getElementById('formGrid');
      grid.innerHTML = '';
      for (const col of currentColumns) {
        const div = document.createElement('div');
        div.className = 'field';
        const isPk = currentPrimaryKey === col.name;
        div.innerHTML = '<label>' + escapeHtml(col.name) + (isPk ? ' (PK)' : '') + '</label>' +
          '<textarea rows="3" data-col="' + escapeHtml(col.name) + '" ' + (isPk && row ? 'readonly' : '') + '>' + escapeHtml(row?.[col.name] ?? '') + '</textarea>';
        grid.appendChild(div);
      }
    }

    function openInsertForm() {
      buildForm(null);
    }

    function editRow(encoded) {
      const row = JSON.parse(decodeURIComponent(encoded));
      buildForm(row);
    }

    function collectForm() {
      const payload = {};
      document.querySelectorAll('[data-col]').forEach(el => {
        payload[el.getAttribute('data-col')] = el.value;
      });
      return payload;
    }

    async function saveRow() {
      if (!currentTable) return;
      const payload = collectForm();
      const hasPk = currentPrimaryKey && payload[currentPrimaryKey] !== '';
      const url = hasPk ? '/api/table/' + encodeURIComponent(currentTable) + '/update' : '/api/table/' + encodeURIComponent(currentTable) + '/insert';
      await api(url, { method: 'POST', body: JSON.stringify(payload) });
      await reloadCurrent();
      alert('Saved successfully');
    }

    async function deleteRow(id) {
      if (!currentPrimaryKey) return alert('No primary key found for this table.');
      if (!confirm('Delete this row?')) return;
      const payload = {};
      payload[currentPrimaryKey] = id;
      await api('/api/table/' + encodeURIComponent(currentTable) + '/delete', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await reloadCurrent();
    }

    async function nextPage() {
      offset += limit;
      await reloadCurrent();
    }

    async function prevPage() {
      offset = Math.max(0, offset - limit);
      await reloadCurrent();
    }

    function escapeHtml(v) {
      return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    loadMeta().catch(err => {
      setStatus(err.message);
      alert(err.message);
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQLite Admin Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`DB_PATH=${DB_PATH}`);
});

