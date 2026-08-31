import { PDF, modelHeader, successHtml, signatureStep, createSignature, formatPhone, safeName, drawSignature, dataUrlBytes, finishDownload } from './core.js';

const REGULATION = `<div class="mini-regulation"><h3>Regulamento resumido</h3><ol><li>O Interação UNISAPIENS é uma atividade de integração e competição entre as turmas/períodos do curso de Educação Física.</li><li>As modalidades serão: Cabo de Guerra, Prancha, Pula Corda e Queimada.</li><li>Cada atleta poderá representar somente a sua própria turma, sendo vedada a participação por outra turma/período.</li><li>Em cada prova, a pontuação será: <strong>1º lugar = 10 pontos</strong>, <strong>2º lugar = 7 pontos</strong> e <strong>3º lugar = 5 pontos</strong>.</li><li>A classificação geral será definida pela soma dos pontos obtidos pela turma nas quatro modalidades.</li><li>Em caso de empate na pontuação geral, terá vantagem a turma com maior número de 1º lugares; persistindo o empate, serão considerados os 2º lugares e, depois, os 3º lugares.</li><li>Todos os participantes deverão respeitar as orientações de segurança, arbitragem e organização do evento.</li></ol></div>`;

const COLORS = {
  ink: PDF.rgb(0.06, 0.08, 0.13),
  muted: PDF.rgb(0.38, 0.43, 0.50),
  line: PDF.rgb(0.82, 0.85, 0.89),
  blue: PDF.rgb(0.10, 0.27, 0.64),
  gold: PDF.rgb(0.95, 0.62, 0.08),
  soft: PDF.rgb(0.96, 0.97, 0.98),
  white: PDF.rgb(1, 1, 1)
};

function roster(prefix,count,title,subtitle){return `<section class="roster-block"><div class="roster-head"><div><h3>${title}</h3><p>${subtitle}</p></div><span class="count-badge">até ${count} nomes</span></div><div class="roster-grid">${Array.from({length:count},(_,i)=>`<label class="roster-field"><span>${i+1}</span><input id="${prefix}_${i+1}" maxlength="90" placeholder="Nome do(a) atleta"></label>`).join('')}</div></section>`;}

function wrapLines(font, text, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(page, font, text, x, y, maxWidth, size=9, lineHeight=12, color=COLORS.ink) {
  const lines = wrapLines(font, text, size, maxWidth);
  lines.forEach((line, i) => page.drawText(line, { x, y: y - (i * lineHeight), size, font, color }));
  return y - (lines.length * lineHeight);
}

function fitSize(font, text, maxWidth, preferred=10, min=6.8) {
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(String(text || ''), size) > maxWidth) size -= 0.25;
  return size;
}

function textFit(page, font, text, x, y, maxWidth, preferred=10, color=COLORS.ink) {
  if (!text) return;
  page.drawText(String(text), { x, y, size: fitSize(font, text, maxWidth, preferred), font, color, maxWidth });
}

function header(page, fonts, kicker, title, subtitle='') {
  const { regular, bold } = fonts;
  page.drawRectangle({ x: 0, y: 736, width: 612, height: 56, color: COLORS.ink });
  page.drawText('GG DIGITAL', { x: 42, y: 761, size: 8.5, font: bold, color: COLORS.white });
  page.drawText('ASSINADOR', { x: 42, y: 746, size: 8, font: regular, color: PDF.rgb(0.76,0.80,0.86) });
  page.drawText(kicker, { x: 42, y: 711, size: 9, font: bold, color: COLORS.gold });
  page.drawText(title, { x: 42, y: 684, size: 22, font: bold, color: COLORS.ink });
  if (subtitle) page.drawText(subtitle, { x: 42, y: 666, size: 9.2, font: regular, color: COLORS.muted });
  page.drawText('UNISAPIENS • EDUCAÇÃO FÍSICA • ATLÉTICA ANABÓLICA', { x: 42, y: 640, size: 8.2, font: bold, color: COLORS.blue });
}

function fieldLine(page, fonts, label, value, x, y, width) {
  page.drawText(label.toUpperCase(), { x, y: y + 14, size: 7.4, font: fonts.bold, color: COLORS.muted });
  page.drawRectangle({ x, y: y - 4, width, height: 18, borderColor: COLORS.line, borderWidth: 0.8, color: COLORS.white });
  textFit(page, fonts.regular, value || '—', x + 6, y + 1.5, width - 12, 9.4);
}

function rosterPage(page, fonts, title, subtitle, names, periodo, formato) {
  header(page, fonts, 'INTERAÇÃO UNISAPIENS 2026', title, subtitle);
  fieldLine(page, fonts, 'Turma', `${periodo} • ${formato}`, 42, 600, 528);
  const startY = 558;
  const rowH = 28.5;
  names.forEach((name, i) => {
    const y = startY - (i * rowH);
    page.drawText(String(i + 1).padStart(2,'0'), { x: 46, y: y + 3, size: 8, font: fonts.bold, color: COLORS.muted });
    page.drawLine({ start: { x: 72, y }, end: { x: 560, y }, thickness: 0.7, color: COLORS.line });
    if (name) textFit(page, fonts.regular, name, 80, y + 4, 472, 9.4);
  });
  page.drawText('Inscrição de atletas por modalidade • Assinador GG Digital', { x: 42, y: 36, size: 7.5, font: fonts.regular, color: COLORS.muted });
}

async function createInteracaoPdf(data, signatureDataUrl) {
  const pdf = await PDF.PDFDocument.create();
  pdf.setTitle('Ficha de Inscrição - Interação UNISAPIENS 2026');
  pdf.setSubject('Educação Física - Interação UNISAPIENS 2026');
  pdf.setCreator('Assinador GG Digital');
  pdf.setProducer('Assinador GG Digital');

  const regular = await pdf.embedFont(PDF.StandardFonts.Helvetica);
  const bold = await pdf.embedFont(PDF.StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const size = [612, 792];
  const [p1, p2, p3, p4] = [pdf.addPage(size), pdf.addPage(size), pdf.addPage(size), pdf.addPage(size)];

  header(p1, fonts, 'INTERAÇÃO UNISAPIENS 2026', 'Ficha de Inscrição', 'Competição de integração entre os períodos do curso de Educação Física');
  fieldLine(p1, fonts, 'Período', data.periodo, 42, 600, 248);
  fieldLine(p1, fonts, 'Formato', data.formato, 306, 600, 264);
  fieldLine(p1, fonts, 'Líder de sala responsável', data.lider, 42, 558, 338);
  fieldLine(p1, fonts, 'Telefone', data.telefone, 396, 558, 174);

  p1.drawText('REGULAMENTO RESUMIDO', { x: 42, y: 520, size: 10, font: bold, color: COLORS.blue });
  const rules = [
    'O Interação UNISAPIENS é uma atividade de integração e competição entre as turmas/períodos do curso de Educação Física.',
    'As modalidades são Cabo de Guerra, Prancha, Pula Corda e Queimada.',
    'Cada atleta representa exclusivamente a própria turma. É proibida a participação por outra turma ou período.',
    'Cada prova pontua para a classificação geral: 1º lugar = 10 pontos; 2º lugar = 7 pontos; 3º lugar = 5 pontos.',
    'A classificação geral será definida pela soma dos pontos obtidos pela turma nas quatro modalidades.',
    'Em caso de empate: maior número de 1º lugares; depois 2º lugares; depois 3º lugares.',
    'Os participantes deverão cumprir as orientações de segurança, arbitragem e organização do evento.'
  ];
  let ry = 498;
  rules.forEach((rule, index) => {
    p1.drawText(`${index + 1}.`, { x: 46, y: ry, size: 8.6, font: bold, color: COLORS.ink });
    ry = drawWrapped(p1, regular, rule, 64, ry, 496, 8.6, 11.2) - 4;
  });

  p1.drawRectangle({ x: 42, y: 174, width: 528, height: 62, color: COLORS.soft, borderColor: COLORS.line, borderWidth: 0.8 });
  p1.drawText('PONTUAÇÃO POR PROVA', { x: 56, y: 215, size: 8.4, font: bold, color: COLORS.muted });
  p1.drawText('1º  10 PONTOS', { x: 58, y: 190, size: 12, font: bold, color: COLORS.gold });
  p1.drawText('2º  7 PONTOS', { x: 225, y: 190, size: 12, font: bold, color: COLORS.blue });
  p1.drawText('3º  5 PONTOS', { x: 392, y: 190, size: 12, font: bold, color: COLORS.ink });
  p1.drawText('A inscrição nesta ficha vincula os atletas exclusivamente à turma identificada acima.', { x: 42, y: 140, size: 8.7, font: bold, color: COLORS.ink });
  p1.drawText('Assinador GG Digital • Documento gerado no dispositivo do responsável', { x: 42, y: 36, size: 7.5, font: regular, color: COLORS.muted });

  rosterPage(p2, fonts, 'Cabo de Guerra', 'Modalidade em grupo • até 15 atletas na ficha', data.cabo, data.periodo, data.formato);
  rosterPage(p3, fonts, 'Queimada', 'Modalidade em grupo • até 15 atletas na ficha', data.queimada, data.periodo, data.formato);

  header(p4, fonts, 'INTERAÇÃO UNISAPIENS 2026', 'Modalidades Individuais', 'Prancha e Pula Corda');
  fieldLine(p4, fonts, 'Turma', `${data.periodo} • ${data.formato}`, 42, 600, 528);

  p4.drawText('PRANCHA', { x: 42, y: 558, size: 11, font: bold, color: COLORS.blue });
  data.prancha.forEach((name, i) => {
    const y = 530 - (i * 28);
    p4.drawText(`${i+1}.`, { x: 48, y: y + 3, size: 8, font: bold, color: COLORS.muted });
    p4.drawLine({ start: { x: 72, y }, end: { x: 560, y }, thickness: 0.7, color: COLORS.line });
    if (name) textFit(p4, regular, name, 80, y + 4, 472, 9.4);
  });

  p4.drawText('PULA CORDA', { x: 42, y: 370, size: 11, font: bold, color: COLORS.blue });
  data.pulaCorda.forEach((name, i) => {
    const y = 342 - (i * 28);
    p4.drawText(`${i+1}.`, { x: 48, y: y + 3, size: 8, font: bold, color: COLORS.muted });
    p4.drawLine({ start: { x: 72, y }, end: { x: 560, y }, thickness: 0.7, color: COLORS.line });
    if (name) textFit(p4, regular, name, 80, y + 4, 472, 9.4);
  });

  p4.drawRectangle({ x: 42, y: 128, width: 528, height: 82, color: COLORS.soft, borderColor: COLORS.line, borderWidth: 0.8 });
  p4.drawText('DECLARAÇÃO DO LÍDER DE SALA', { x: 56, y: 190, size: 8.8, font: bold, color: COLORS.blue });
  drawWrapped(p4, regular, `Declaro que os nomes informados nesta ficha pertencem à turma ${data.periodo} • ${data.formato} e que nenhum atleta foi inscrito para representar outra turma. Responsável: ${data.lider} • ${data.telefone}.`, 56, 172, 500, 8.5, 10.8);

  p4.drawLine({ start: { x: 102, y: 82 }, end: { x: 334, y: 82 }, thickness: 0.8, color: COLORS.ink });
  p4.drawText('Assinatura do líder de sala', { x: 136, y: 66, size: 7.8, font: regular, color: COLORS.muted });
  if (signatureDataUrl) {
    const png = await pdf.embedPng(dataUrlBytes(signatureDataUrl));
    drawSignature(p4, png, { x: 108, y: 84, w: 220, h: 31 });
  }
  p4.drawText('Assinador GG Digital • Interação UNISAPIENS 2026', { x: 42, y: 28, size: 7.5, font: regular, color: COLORS.muted });

  return pdf.save();
}

export function renderInteracao(app, model, goHome, store) {
  app.innerHTML = modelHeader(model,[['Turma','Identificação principal'],['Atletas','Inscrição por modalidade'],['Finalizar','Assinatura opcional']]) + `
  <form id="modelForm" novalidate>
    <section class="panel" data-step-panel="1"><div class="panel-head"><div><span class="section-kicker">Etapa 1 de 3</span><h2>Identificação da turma</h2></div><p>Período e formato são a identificação principal da equipe.</p></div>
      <div class="form-grid"><label class="field"><span>Período *</span><input id="periodo" required maxlength="30" placeholder="Ex.: 4º período"></label><label class="field"><span>Formato da turma *</span><select id="formato" required><option value="">Selecione</option><option>Presencial</option><option>Semipresencial</option></select></label><label class="field field-span-2"><span>Líder de sala responsável *</span><input id="lider" required maxlength="90" autocomplete="name"></label><label class="field"><span>Telefone do líder *</span><input id="liderTelefone" required maxlength="16" inputmode="tel"></label><label class="field"><span>Curso</span><input value="Educação Física" disabled></label></div>
      ${REGULATION}<div class="score-strip"><span>🥇 1º = <strong>10 pts</strong></span><span>🥈 2º = <strong>7 pts</strong></span><span>🥉 3º = <strong>5 pts</strong></span></div>
      <div class="actions"><span></span><button class="btn btn-primary" type="button" data-next="2">Inscrever atletas →</button></div>
    </section>
    <section class="panel" data-step-panel="2" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 2 de 3</span><h2>Inscrição dos atletas</h2></div><p>Preencha apenas os nomes que participarão em cada modalidade.</p></div>
      ${roster('cabo',15,'Cabo de Guerra','Modalidade em grupo')}${roster('queimada',15,'Queimada','Modalidade em grupo')}${roster('prancha',5,'Prancha','Modalidade individual')}${roster('pulaCorda',5,'Pula Corda','Modalidade individual')}
      <div class="actions"><button class="btn btn-ghost" type="button" data-back="1">← Voltar</button><button class="btn btn-primary" type="button" data-next="3">Revisar e gerar →</button></div>
    </section>
    ${signatureStep('Assinatura do líder de sala','A assinatura é opcional. Você também pode gerar a ficha para assinar posteriormente.',false)}
  </form>${successHtml()}`;

  app.querySelectorAll('[data-home]').forEach(b=>b.addEventListener('click',goHome));
  const value=id=>app.querySelector(`#${id}`)?.value?.trim()||'';
  const panels=[...app.querySelectorAll('[data-step-panel]')], pills=[...app.querySelectorAll('[data-step-pill]')];
  const showStep=n=>{panels.forEach(p=>p.hidden=Number(p.dataset.stepPanel)!==n);pills.forEach(p=>{const k=Number(p.dataset.stepPill);p.classList.toggle('is-active',k===n);p.classList.toggle('is-done',k<n);});scrollTo({top:0,behavior:'smooth'});};
  function validate1(){let ok=true;['periodo','formato','lider','liderTelefone'].forEach(id=>{const el=app.querySelector(`#${id}`),valid=el.value.trim()!==''&&el.checkValidity();el.classList.toggle('invalid',!valid);if(!valid)ok=false;});if(!ok)app.querySelector('.invalid')?.focus();return ok;}
  app.querySelector('#liderTelefone').addEventListener('input',e=>e.target.value=formatPhone(e.target.value));
  app.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.next);if(n===2&&!validate1())return;showStep(n);}));
  app.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.back))));
  const signature=createSignature(app);
  const rosterValues=(key,count)=>Array.from({length:count},(_,i)=>value(`${key}_${i+1}`));

  app.querySelector('#generatePdf').addEventListener('click',async()=>{
    const error=app.querySelector('#errorBox');
    error.hidden=true;
    if(!validate1()){showStep(1);return;}
    const btn=app.querySelector('#generatePdf'),label=btn.querySelector('.btn-label'),spinner=btn.querySelector('.spinner');
    btn.disabled=true;label.textContent='Gerando PDF...';spinner.hidden=false;
    try {
      const periodo=value('periodo'),formato=value('formato'),lider=value('lider'),telefone=value('liderTelefone');
      const sig=signature.dataUrl();
      const bytes=await createInteracaoPdf({
        periodo, formato, lider, telefone,
        cabo:rosterValues('cabo',15),
        queimada:rosterValues('queimada',15),
        prancha:rosterValues('prancha',5),
        pulaCorda:rosterValues('pulaCorda',5)
      }, sig);
      finishDownload(app,bytes,`${safeName(periodo)}_${safeName(formato)}.pdf`,!!sig,store);
    } catch(err) {
      console.error(err);
      error.textContent=`Erro ao gerar PDF: ${err.message||'falha inesperada'}`;
      error.hidden=false;
    } finally {
      btn.disabled=false;label.textContent='Gerar PDF';spinner.hidden=true;
    }
  });
}
