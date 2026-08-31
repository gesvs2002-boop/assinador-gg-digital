(() => {
  'use strict';

  const FORM_URL = 'https://forms.gle/JR646h2VZHAkoMfr7';
  const TEMPLATE_URL = './assets/JOMTI_2026_Termo_Responsabilidade.pdf';
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib || {};

  const $ = (id) => document.getElementById(id);
  const panels = [...document.querySelectorAll('[data-step-panel]')];
  const pills = [...document.querySelectorAll('[data-step-pill]')];
  const fields = ['nome','cpf','nascimento','endereco','telefone','modalidades','delegacao','emergenciaNome','parentesco','emergenciaTelefone'];

  let currentStep = 1;
  let drawing = false;
  let hasSignature = false;
  let lastPoint = null;
  let generatedUrl = null;

  const canvas = $('signatureCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  function showStep(step) {
    currentStep = step;
    panels.forEach(panel => {
      const active = Number(panel.dataset.stepPanel) === step;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    pills.forEach(pill => {
      const n = Number(pill.dataset.stepPill);
      pill.classList.toggle('is-active', n === step);
      pill.classList.toggle('is-done', n < step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step === 3) requestAnimationFrame(resizeCanvas);
  }

  function onlyDigits(value) { return value.replace(/\D/g, ''); }
  function formatCPF(value) {
    const d = onlyDigits(value).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  function formatPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }
  function isValidCPF(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== Number(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === Number(cpf[10]);
  }

  $('cpf').addEventListener('input', e => e.target.value = formatCPF(e.target.value));
  $('telefone').addEventListener('input', e => e.target.value = formatPhone(e.target.value));
  $('emergenciaTelefone').addEventListener('input', e => e.target.value = formatPhone(e.target.value));

  function validateStep1() {
    let ok = true;
    fields.forEach(id => {
      const el = $(id);
      const valid = el.value.trim() !== '' && el.checkValidity();
      el.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    if ($('cpf').value && !isValidCPF($('cpf').value)) {
      $('cpf').classList.add('invalid'); ok = false;
    }
    if (!ok) {
      const first = document.querySelector('.invalid');
      if (first) first.focus();
      return false;
    }
    syncPreview();
    return true;
  }

  function syncPreview() {
    const map = { nome: $('nome').value, cpf: $('cpf').value, nascimento: formatDateBR($('nascimento').value), endereco: $('endereco').value, telefone: $('telefone').value };
    Object.entries(map).forEach(([key,val]) => document.querySelectorAll(`[data-preview="${key}"]`).forEach(el => el.textContent = val || '—'));
  }

  function validateStep2() {
    const a = $('consentTerm'), b = $('consentData');
    if (!a.checked || !b.checked) {
      (a.checked ? b : a).focus();
      return false;
    }
    return true;
  }

  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
    const next = Number(btn.dataset.next);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    showStep(next);
  }));
  document.querySelectorAll('[data-back]').forEach(btn => btn.addEventListener('click', () => showStep(Number(btn.dataset.back))));

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const snapshot = hasSignature ? canvas.toDataURL('image/png') : null;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.4;
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    }
  }

  function pointFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function startDraw(e) {
    e.preventDefault(); drawing = true; lastPoint = pointFromEvent(e); canvas.setPointerCapture?.(e.pointerId);
  }
  function moveDraw(e) {
    if (!drawing) return; e.preventDefault();
    const p = pointFromEvent(e);
    ctx.beginPath(); ctx.moveTo(lastPoint.x, lastPoint.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastPoint = p; hasSignature = true; $('signHint').hidden = true;
  }
  function endDraw(e) { if (!drawing) return; e.preventDefault(); drawing = false; lastPoint = null; }
  canvas.addEventListener('pointerdown', startDraw); canvas.addEventListener('pointermove', moveDraw); canvas.addEventListener('pointerup', endDraw); canvas.addEventListener('pointercancel', endDraw); canvas.addEventListener('pointerleave', endDraw);
  window.addEventListener('resize', () => { if (currentStep === 3) resizeCanvas(); });

  $('clearSignature').addEventListener('click', () => {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height); hasSignature = false; $('signHint').hidden = false;
  });

  function formatDateBR(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`;
  }
  function dateParts(iso) { const [year,month,day] = iso.split('-'); return {year,month,day}; }
  const months = ['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  function sanitizeFileName(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60) || 'Atleta';
  }

  function canvasTrimmedDataUrl(sourceCanvas) {
    const width = sourceCanvas.width, height = sourceCanvas.height;
    const c = sourceCanvas.getContext('2d');
    const pixels = c.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const a = pixels[(y * width + x) * 4 + 3];
      if (a > 8) { minX = Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }
    }
    if (maxX < 0) return null;
    const pad = 10;
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad); maxX=Math.min(width-1,maxX+pad); maxY=Math.min(height-1,maxY+pad);
    const out = document.createElement('canvas'); out.width=maxX-minX+1; out.height=maxY-minY+1;
    out.getContext('2d').drawImage(sourceCanvas,minX,minY,out.width,out.height,0,0,out.width,out.height);
    return out.toDataURL('image/png');
  }

  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64); const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }

  function fitSize(font, text, maxWidth, preferred=10, min=6.5) {
    let size = preferred;
    while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= .25;
    return size;
  }

  function drawTextInRect(page, font, text, rect, options={}) {
    if (!text) return;
    const [x1,y1,x2,y2] = rect;
    const padX = options.padX ?? 2;
    const preferred = options.size ?? 9.5;
    const maxWidth = (x2-x1) - (padX*2);
    const size = fitSize(font, text, maxWidth, preferred, options.minSize ?? 6.5);
    const y = y1 + Math.max(2.1, ((y2-y1)-size)*.5 + .8);
    page.drawText(text, { x:x1+padX, y, size, font, color:rgb(0.04,0.06,0.09), maxWidth });
  }

  async function generatePdf() {
    const error = $('errorBox'); error.hidden = true;
    if (!validateStep1()) { showStep(1); return; }
    if (!validateStep2()) { showStep(2); return; }
    if (!hasSignature) { error.textContent = 'Faça sua assinatura no quadro antes de gerar o documento.'; error.hidden = false; return; }
    if (!$('dataAssinatura').value) { error.textContent = 'Informe a data da assinatura.'; error.hidden = false; $('dataAssinatura').focus(); return; }
    if (!PDFDocument) { error.textContent = 'Não foi possível carregar o gerador de PDF. Verifique sua conexão e tente novamente.'; error.hidden = false; return; }

    const btn = $('generatePdf'), label = btn.querySelector('.btn-label'), spinner = btn.querySelector('.spinner');
    btn.disabled = true; label.textContent = 'Gerando documento...'; spinner.hidden = false;

    try {
      const templateBytes = await fetch(TEMPLATE_URL, { cache:'no-store' }).then(r => { if(!r.ok) throw new Error('Falha ao carregar o modelo do termo.'); return r.arrayBuffer(); });
      const pdfDoc = await PDFDocument.load(templateBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const p1 = pages[0], p2 = pages[1];

      const n = dateParts($('nascimento').value);
      const s = dateParts($('dataAssinatura').value);
      const values = {
        nome: $('nome').value.trim(), cpf: $('cpf').value.trim(), endereco: $('endereco').value.trim(), telefone: $('telefone').value.trim(),
        modalidades: $('modalidades').value.trim(), delegacao: $('delegacao').value.trim(), emergenciaNome: $('emergenciaNome').value.trim(), parentesco: $('parentesco').value.trim(), emergenciaTelefone: $('emergenciaTelefone').value.trim()
      };

      // Página 1 - dados pessoais no novo modelo enviado em 31/08/2026.
      drawTextInRect(p1,font,values.nome,[109.9,602,523.2,619],{size:10});
      drawTextInRect(p1,font,values.cpf,[123.8,587,261.6,604],{size:9.2});
      drawTextInRect(p1,font,n.day,[374.4,587,396,604],{size:9.2,padX:3});
      drawTextInRect(p1,font,n.month,[401.3,587,422.4,604],{size:9.2,padX:3});
      drawTextInRect(p1,font,n.year,[427.7,587,471.4,604],{size:9.2,padX:3});
      drawTextInRect(p1,font,values.endereco,[192.5,572.5,523.2,589],{size:9});
      drawTextInRect(p1,font,values.telefone,[133.4,557.5,303.8,574],{size:9.2});

      // Página 2 - modalidade, delegação, data e contato para emergência.
      drawTextInRect(p2,font,values.modalidades,[155.5,450,513.6,466.5],{size:9.5});
      drawTextInRect(p2,font,values.delegacao,[192,426,517,442.5],{size:9.5});
      drawTextInRect(p2,font,String(Number(s.day)),[176.2,376.5,208.3,393],{size:10.2,padX:2});
      drawTextInRect(p2,font,months[Number(s.month)],[227.5,376.5,370.6,393],{size:10.2,padX:3});
      drawTextInRect(p2,font,values.emergenciaNome,[123.8,279,509.8,295.5],{size:9.5});
      drawTextInRect(p2,font,values.parentesco,[153.6,255.5,511.7,272],{size:9.5});
      drawTextInRect(p2,font,values.emergenciaTelefone,[138.7,232,507.8,248.5],{size:9.5});

      const sigData = canvasTrimmedDataUrl(canvas);
      if (!sigData) throw new Error('Assinatura vazia.');
      const sig = await pdfDoc.embedPng(dataUrlToUint8Array(sigData));
      const sigBox = { x:85, y:213.5, w:331, h:23 };
      const ratio = sig.width / sig.height;
      let w = sigBox.w, h = w / ratio;
      if (h > sigBox.h) { h = sigBox.h; w = h * ratio; }
      p2.drawImage(sig, { x:sigBox.x + (sigBox.w-w)/2, y:sigBox.y + (sigBox.h-h)/2, width:w, height:h });

      pdfDoc.setTitle(`JOMTI 2026 - Termo - ${values.nome}`);
      pdfDoc.setSubject('Termo de Responsabilidade, Declaração de Aptidão e Assunção de Riscos - JOMTI 2026');
      pdfDoc.setProducer('Assinador GG Digital');
      pdfDoc.setCreator('Assinador GG Digital');

      const bytes = await pdfDoc.save({ useObjectStreams:false });
      const blob = new Blob([bytes], { type:'application/pdf' });
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
      generatedUrl = URL.createObjectURL(blob);
      const filename = `JOMTI_2026_Termo_${sanitizeFileName(values.nome)}.pdf`;
      const a = document.createElement('a'); a.href=generatedUrl; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
      $('downloadAgain').href = generatedUrl; $('downloadAgain').download = filename;
      document.querySelector('#successCard .btn-ghost').href = FORM_URL;
      panels.forEach(p => p.hidden = true); $('signerForm').hidden = true; $('successCard').hidden = false;
      window.scrollTo({ top: 0, behavior:'smooth' });
    } catch (err) {
      console.error(err); error.textContent = err?.message || 'Não foi possível gerar o PDF. Tente novamente.'; error.hidden = false;
    } finally {
      btn.disabled = false; label.textContent = 'Gerar termo assinado'; spinner.hidden = true;
    }
  }

  $('generatePdf').addEventListener('click', generatePdf);

  // Data de assinatura usa a data local do dispositivo.
  const today = new Date();
  const tzSafe = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  $('dataAssinatura').value = tzSafe;

  showStep(1);
})();
