// ── Estado ─────────────────────────────────────────────────────────────────
let equips = [];

try {
  const saved = localStorage.getItem('nw_equips');
  if (saved) equips = JSON.parse(saved);
  const cfg = JSON.parse(localStorage.getItem('nw_config') || '{}');
  if (cfg.clientName) document.getElementById('clientName').value = cfg.clientName;
  if (cfg.clientId)   document.getElementById('clientId').value   = cfg.clientId;
  if (cfg.waNumber)   document.getElementById('waNumber').value   = cfg.waNumber;
  if (cfg.interval)   document.getElementById('interval').value   = cfg.interval;
  if (cfg.timeout)    document.getElementById('timeout').value    = cfg.timeout;
  if (cfg.rosVersion) document.getElementById('rosVersion').value = cfg.rosVersion;
} catch (e) {}

// ── Persistência ────────────────────────────────────────────────────────────
function saveState() {
  try {
    localStorage.setItem('nw_equips', JSON.stringify(equips));
    localStorage.setItem('nw_config', JSON.stringify({
      clientName: document.getElementById('clientName').value,
      clientId:   document.getElementById('clientId').value,
      waNumber:   document.getElementById('waNumber').value,
      interval:   document.getElementById('interval').value,
      timeout:    document.getElementById('timeout').value,
      rosVersion: document.getElementById('rosVersion').value,
    }));
  } catch (e) {}
}

['clientName','clientId','waNumber','interval','timeout','rosVersion'].forEach(id => {
  document.getElementById(id).addEventListener('input', saveState);
  document.getElementById(id).addEventListener('change', saveState);
});

// ── Render tabela ───────────────────────────────────────────────────────────
function render() {
  const tbody    = document.getElementById('equipTable');
  const emptyRow = document.getElementById('emptyRow');

  tbody.querySelectorAll('tr.eq-row').forEach(r => r.remove());

  if (equips.length === 0) {
    emptyRow.hidden = false;
    updateCounters();
    return;
  }
  emptyRow.hidden = true;

  equips.forEach((eq, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'eq-row';
    tr.innerHTML = `
      <td>${esc(eq.ip)}</td>
      <td class="nome">${esc(eq.nome)}</td>
      <td class="tipo"><span class="badge" style="${badgeStyle(eq.nome)}">${tipoLabel(eq.nome)}</span></td>
      <td><button class="btn btn-danger" onclick="removeEquip(${idx})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  updateCounters();
  saveState();
}

function badgeStyle(nome) {
  const n = nome.toUpperCase();
  if (n.includes('CFTV'))   return 'background:#1e3a8a22;border-color:#3b82f699;color:#60a5fa';
  if (n.includes('ACESSO')) return 'background:#14532d22;border-color:#22c55e99;color:#4ade80';
  if (n.includes('ALARME')) return 'background:#7f1d1d22;border-color:#ef444499;color:#f87171';
  if (n.includes('REDE'))   return 'background:#78350f22;border-color:#f59e0b99;color:#fbbf24';
  return '';
}

function tipoLabel(nome) {
  const n = nome.toUpperCase();
  if (n.includes('DVR'))                           return 'DVR';
  if (n.includes('CAMERA') || n.includes('CÂMERA')) return 'Câmera';
  if (n.includes('FACIAL'))                        return 'Facial';
  if (n.includes('CIP'))                           return 'CIP 850';
  if (n.includes('TIP'))                           return 'TIP 125i';
  if (n.includes('XPE'))                           return 'XPE 1001';
  if (n.includes('ACESSO'))                        return 'Acesso';
  if (n.includes('ALARME'))                        return 'Alarme';
  if (n.includes('SWITCH'))                        return 'Switch';
  if (n.includes('GATEWAY'))                       return 'Gateway';
  if (n.includes('REDE'))                          return 'Rede';
  return 'Outro';
}

function updateCounters() {
  document.getElementById('countTotal').textContent  = equips.length;
  document.getElementById('countCftv').textContent   = equips.filter(e => e.nome.toUpperCase().includes('CFTV')).length;
  document.getElementById('countAcesso').textContent = equips.filter(e => e.nome.toUpperCase().includes('ACESSO')).length;
  document.getElementById('countAlarme').textContent = equips.filter(e => e.nome.toUpperCase().includes('ALARME')).length;
  document.getElementById('countRede').textContent   = equips.filter(e => e.nome.toUpperCase().includes('REDE')).length;
}

// ── Adicionar ───────────────────────────────────────────────────────────────
function addEquip() {
  const ipEl   = document.getElementById('newIp');
  const nomeEl = document.getElementById('newNome');
  const tipoEl = document.getElementById('newTipo');

  const ip   = ipEl.value.trim();
  const nome = nomeEl.value.trim() || tipoEl.value;

  if (!ip)   { ipEl.focus();   return; }
  if (!nome) { nomeEl.focus(); return; }

  equips.push({ ip, nome });
  ipEl.value = '';
  nomeEl.value = '';
  ipEl.focus();
  render();
}

function removeEquip(idx) {
  equips.splice(idx, 1);
  render();
}

function addOnEnter(e) {
  if (e.key === 'Enter') addEquip();
}

// ── Importar ────────────────────────────────────────────────────────────────
function openImport() {
  document.getElementById('importText').value = '';
  document.getElementById('importModal').hidden = false;
  setTimeout(() => document.getElementById('importText').focus(), 60);
}

function closeImportModal() {
  document.getElementById('importModal').hidden = true;
}

function processImport() {
  const raw = document.getElementById('importText').value.trim();
  if (!raw) return;

  let added = 0;
  raw.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    const sep = line.indexOf(';');
    if (sep < 0) return;
    const ip   = line.slice(0, sep).trim();
    const nome = line.slice(sep + 1).trim();
    if (ip && nome) { equips.push({ ip, nome }); added++; }
  });

  closeImportModal();
  render();
  if (added > 0) showToast(`${added} equipamento${added !== 1 ? 's' : ''} importado${added !== 1 ? 's' : ''}!`);
}

// ── Gerar Script ─────────────────────────────────────────────────────────────
function generateScript() {
  if (equips.length === 0) { showToast('Adicione equipamentos primeiro!'); return; }

  const clientName = document.getElementById('clientName').value.trim() || 'CLIENTE';
  const clientId   = document.getElementById('clientId').value.trim();
  const waNumber   = document.getElementById('waNumber').value.trim().replace(/\D/g, '');
  const webhook    = 'https://n8n.oreonsolucoes.dpdns.org/webhook/29c0a7b6-e1f3-4d19-9a81-9565b91ebf70';
  const interval   = document.getElementById('interval').value;
  const timeout    = document.getElementById('timeout').value;
  const ros        = document.getElementById('rosVersion').value;

  const header   = clientId ? `${clientId} - ${clientName}` : clientName;
  const rosLabel = ros === '6' ? 'ROUTEROS 6.49.17' : 'ROUTEROS 7.x';

  // Agrupar por categoria
  const grupos = {};
  equips.forEach(eq => {
    const n = eq.nome.toUpperCase();
    let grupo = 'OUTROS';
    if      (n.includes('DVR'))    grupo = 'CFTV - DVRs';
    else if (n.includes('CFTV'))   grupo = 'CFTV - Cameras';
    else if (n.includes('ACESSO')) grupo = 'Controle de Acesso';
    else if (n.includes('ALARME')) grupo = 'Alarme';
    else if (n.includes('REDE'))   grupo = 'Rede';
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(eq);
  });

  let hostsBlock = '';
  Object.entries(grupos).forEach(([grupo, items]) => {
    hostsBlock += `\n    # ${'-'.repeat(25)}\n    # ${grupo}\n    # ${'-'.repeat(25)}\n`;
    items.forEach(eq => { hostsBlock += `    {"${eq.ip}";"${eq.nome}"};\n`; });
  });

  const waFull = waNumber ? `55${waNumber}` : '';
  const waLine = waFull   ? `# WhatsApp destino : ${waFull}\n` : '';

  const EQ = '='.repeat(58);
  const eq2 = '='.repeat(46);

  const script =
`# ${EQ}
# HAGANA - NETWATCH + N8N
# ${header}
# ${rosLabel}
# ${EQ}

# ${EQ}
# CONFIGURACAO
# ${EQ}

:local webhookURL "${webhook}"
${waLine}
# ${EQ}
# LISTA DE EQUIPAMENTOS
#
# Formato: {"IP";"NOME DO EQUIPAMENTO"}
# ${EQ}

:local hosts {
${hostsBlock}}

# ${EQ}
# CADASTRO NO NETWATCH
# ${EQ}

:foreach item in=\\$hosts do={

    :local ip   (\\$item->0)
    :local nome (\\$item->1)

    /tool netwatch add \\
        host=\\$ip \\
        interval=${interval} \\
        timeout=${timeout} \\
        comment=\\$nome \\
        up-script=(":local Host \\\\$host; :local Comment \\"\\"; :foreach i in=[/tool netwatch find] do={ :if ([/tool netwatch get \\\\$i host] = \\\\$Host) do={ :set Comment [/tool netwatch get \\\\$i comment] } }; :local Router [/system identity get name]; :local Wa \\"${waFull}\\"; :local Json (\\"{\\\\\\\\\\\\\"status\\\\\\\\\\\\\":\\\\\\\\\\\\\"up\\\\\\\\\\\\\",\\\\\\\\\\\\\"host\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Host . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"nome\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Comment . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"router\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Router . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"whatsapp\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Wa . \\"\\\\\\\\\\\\\"}\\"); /tool fetch url=\\"" . \\$webhookURL . "\\" http-method=post http-header-field=\\"Content-Type: application/json\\" http-data=\\\\$Json mode=https output=none") \\
        down-script=(":local Host \\\\$host; :local Comment \\"\\"; :foreach i in=[/tool netwatch find] do={ :if ([/tool netwatch get \\\\$i host] = \\\\$Host) do={ :set Comment [/tool netwatch get \\\\$i comment] } }; :local Router [/system identity get name]; :local Wa \\"${waFull}\\"; :local Json (\\"{\\\\\\\\\\\\\"status\\\\\\\\\\\\\":\\\\\\\\\\\\\"down\\\\\\\\\\\\\",\\\\\\\\\\\\\"host\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Host . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"nome\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Comment . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"router\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Router . \\"\\\\\\\\\\\\\",\\\\\\\\\\\\\"whatsapp\\\\\\\\\\\\\":\\\\\\\\\\\\\"\\" . \\\\$Wa . \\"\\\\\\\\\\\\\"}\\"); /tool fetch url=\\"" . \\$webhookURL . "\\" http-method=post http-header-field=\\"Content-Type: application/json\\" http-data=\\\\$Json mode=https output=none")
}

# ${EQ}
# CONFIRMACAO
# ${EQ}

:put "${eq2}"
:put " HAGANA NETWATCH"
:put " ${header}"
:put " ${rosLabel}"
:put "${eq2}"
:put ("Equipamentos cadastrados: " . [:len \\$hosts])
:put "Webhook N8N configurado."
:put "${eq2}"`;

  document.getElementById('scriptOutput').textContent = script;
  document.getElementById('scriptModal').hidden = false;
}

// ── Modal utils ──────────────────────────────────────────────────────────────
function closeScriptModal() {
  document.getElementById('scriptModal').hidden = true;
}

function closeModal(e) {
  if (e.target === document.getElementById('scriptModal')) closeScriptModal();
  if (e.target === document.getElementById('importModal')) closeImportModal();
}

function copyScript() {
  const text = document.getElementById('scriptOutput').textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Script copiado!'))
    .catch(() => {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('scriptOutput'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      showToast('Selecione e copie manualmente (Ctrl+C)');
    });
}

// ── Limpar tudo ──────────────────────────────────────────────────────────────
function clearAll() {
  if (equips.length === 0) return;
  equips = [];
  render();
  showToast('Lista limpa!');
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Init ──────────────────────────────────────────────────────────────────────
render();
