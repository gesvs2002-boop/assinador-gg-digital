import { PDF, modelHeader, successHtml, formatPhone, safeName, finishDownload, esc } from './core.js';

const SUPABASE_URL = 'https://cmpmbbeeonnylomllkna.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_a3H97mJaw_R8OxV3bIwoUg_sHahj8nP';

const TURMAS = [
  '1º período presencial', '1º período semipresencial',
  '2º período presencial', '2º período semipresencial',
  '3º período EAD', '4º período EAD', '5º período EAD', '6º período EAD'
];

const MODALITIES = [
  { id:'futsal_m', title:'Futsal masculino', max:10, native:3, note:'Até 10 atletas.' },
  { id:'futsal_f', title:'Futsal feminino', max:10, native:3, note:'Até 10 atletas.' },
  { id:'society_m', title:'Futebol Society masculino', max:12, native:3, note:'Até 12 atletas.' },
  { id:'society_f', title:'Futebol Society feminino', max:12, native:3, note:'Até 12 atletas.' },
  { id:'handebol_m', title:'Handebol masculino', max:15, native:3, note:'Até 15 atletas.' },
  { id:'handebol_f', title:'Handebol feminino', max:15, native:3, note:'Até 15 atletas.' },
  { id:'basquete_m', title:'Basquete masculino', max:10, native:3, note:'Até 10 atletas. O formato poderá ser 5x5 ou 3x3 conforme a adesão.' },
  { id:'basquete_f', title:'Basquete feminino', max:10, native:3, note:'Até 10 atletas. O formato poderá ser 5x5 ou 3x3 conforme a adesão.' },
  { id:'volei_praia_m', title:'Vôlei de praia — dupla masculina', max:3, note:'Dupla titular e até 1 reserva.' },
  { id:'volei_praia_f', title:'Vôlei de praia — dupla feminina', max:3, note:'Dupla titular e até 1 reserva.' },
  { id:'volei_4x4', title:'Vôlei de praia 4x4 misto', max:7, native:3, mixed:true, note:'4 titulares e até 3 reservas. Os quatro primeiros devem ter 2 mulheres e 2 homens.' },
  { id:'futevolei_m', title:'Futevôlei — dupla masculina', max:3, note:'Dupla titular e até 1 reserva.' },
  { id:'futevolei_f', title:'Futevôlei — dupla feminina', max:3, note:'Dupla titular e até 1 reserva.' },
  { id:'tenis_m', title:'Tênis de mesa masculino', max:2, note:'1 titular e 1 reserva.' },
  { id:'tenis_f', title:'Tênis de mesa feminino', max:2, note:'1 titular e 1 reserva.' },
  { id:'truco', title:'Truco', max:3, note:'1 dupla e até 1 reserva.' },
  { id:'natacao_50_m', title:'Natação 50 m livre masculino', max:2, note:'1 titular e 1 reserva.' },
  { id:'natacao_50_f', title:'Natação 50 m livre feminino', max:2, note:'1 titular e 1 reserva.' },
  { id:'natacao_revezamento', title:'Natação 4x25 m misto', max:6, mixed:true, note:'4 titulares e até 2 reservas. Os quatro titulares devem ter 2 mulheres e 2 homens.' },
  { id:'corrida_m', title:'Corrida masculina', max:5, note:'Até 5 atletas.' },
  { id:'corrida_f', title:'Corrida feminina', max:5, note:'Até 5 atletas.' },
  { id:'talentos', title:'Show de talentos', max:10, note:'Uma apresentação por turma. Informe participantes ou responsável pela apresentação.' }
];

const own = '__mesma_turma__';
const slots = (model, index) => {
  if (model.mixed && index < 4) return `Titular ${index + 1}`;
  if (model.mixed) return `Reserva ${index - 3}`;
  if (model.max === 2) return index === 0 ? 'Titular' : 'Reserva';
  if (model.max === 3) return index < 2 ? `Titular ${index + 1}` : 'Reserva';
  return String(index + 1).padStart(2, '0');
};

function roster(model) {
  const originOptions = `<option value="${own}">Mesma turma</option>${TURMAS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}`;
  return `<section class="roster-block" data-roster="${model.id}">
    <div class="roster-head"><div><h3>${esc(model.title)}</h3><p>${esc(model.note)}</p></div><span class="count-badge">até ${model.max}</span></div>
    <div class="roster-grid">${Array.from({length:model.max}, (_, index) => `<label class="roster-field jief-row"><span>${slots(model,index)}</span><input id="${model.id}_${index}_name" maxlength="90" placeholder="Nome completo"><select id="${model.id}_${index}_origin" aria-label="Turma de origem">${originOptions}</select>${model.mixed ? `<select id="${model.id}_${index}_gender" aria-label="Gênero"><option value="">Gênero</option><option value="F">Feminino</option><option value="M">Masculino</option></select>` : ''}</label>`).join('')}</div>
  </section>`;
}

function wrap(font, text, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean); const lines=[]; let line='';
  words.forEach(word => { const next=line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(next,size) <= maxWidth) line=next; else { if(line) lines.push(line); line=word; } });
  if(line) lines.push(line); return lines;
}

function drawParagraph(page,font,text,x,y,width,size=9,line=12,color=PDF.rgb(.12,.16,.24)) {
  const lines=wrap(font,text,size,width); lines.forEach((value,i)=>page.drawText(value,{x,y:y-i*line,size,font,color})); return y-lines.length*line;
}

function header(page, fonts, title, subtitle, team) {
  page.drawRectangle({x:0,y:738,width:612,height:54,color:PDF.rgb(.15,.08,.05)});
  page.drawText('ATLÉTICA ANABÓLICA', {x:40,y:764,size:9,font:fonts.bold,color:PDF.rgb(1,.75,.16)});
  page.drawText('JIEF 2026 • EDUCAÇÃO FÍSICA UNISAPIENS', {x:40,y:748,size:8,font:fonts.regular,color:PDF.rgb(.98,.95,.9)});
  page.drawText(title,{x:40,y:704,size:22,font:fonts.bold,color:PDF.rgb(.15,.08,.05)});
  if(subtitle) page.drawText(subtitle,{x:40,y:687,size:9,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
  if(team) page.drawText(team,{x:40,y:663,size:8,font:fonts.bold,color:PDF.rgb(.65,.22,.08)});
}

function lineField(page, fonts, label, value, x, y, width) {
  page.drawText(label.toUpperCase(),{x,y:y+15,size:7.2,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
  page.drawRectangle({x,y:y-4,width,height:18,borderWidth:.7,borderColor:PDF.rgb(.78,.81,.86)});
  page.drawText(String(value || '—'),{x:x+6,y:y+1,size:8.7,font:fonts.regular,color:PDF.rgb(.08,.1,.14),maxWidth:width-12});
}

async function createJiefPdf(data) {
  const pdf=await PDF.PDFDocument.create();
  pdf.setTitle(`JIEF 2026 — ${data.teamName}`); pdf.setCreator('GG Inscrições • GG Digital');
  const fonts={regular:await pdf.embedFont(PDF.StandardFonts.Helvetica),bold:await pdf.embedFont(PDF.StandardFonts.HelveticaBold)};
  const size=[612,792]; const summary=pdf.addPage(size);
  header(summary,fonts,'Ficha de inscrição por turma','Jogos Internos de Educação Física • inscrição conduzida pelo líder da turma',data.teamName);
  lineField(summary,fonts,'Turma',data.team,40,614,258); lineField(summary,fonts,'Nome de guerra',data.teamName,314,614,258);
  lineField(summary,fonts,'Líder responsável',data.leader,40,570,344); lineField(summary,fonts,'Telefone',data.phone,400,570,172);
  summary.drawText('CONFERÊNCIA DA INSCRIÇÃO', {x:40,y:524,size:10,font:fonts.bold,color:PDF.rgb(.65,.22,.08)});
  const entered=data.rosters.filter(item=>item.entries.length);
  const summaryLines=entered.length ? entered.map(item=>`${item.title}: ${item.entries.length} inscrito(s)`) : ['Nenhuma modalidade preenchida.'];
  let y=500; summaryLines.forEach(line=>{summary.drawText('•',{x:44,y,size:9,font:fonts.bold,color:PDF.rgb(.15,.08,.05)}); y=drawParagraph(summary,fonts.regular,line,58,y,500,9,12)-2;});
  summary.drawRectangle({x:40,y:154,width:532,height:104,color:PDF.rgb(.985,.97,.94),borderWidth:.7,borderColor:PDF.rgb(.89,.72,.54)});
  summary.drawText('DECLARAÇÃO DO LÍDER', {x:54,y:235,size:8.5,font:fonts.bold,color:PDF.rgb(.65,.22,.08)});
  drawParagraph(summary,fonts.regular,`Declaro que as informações desta ficha foram conferidas pela turma ${data.teamName}. Atletas inscritos como reforço foram informados com sua turma de origem. As regras técnicas, o regulamento completo e o termo individual de responsabilidade serão disponibilizados pela organização antes da competição.`,54,216,500,8.7,11);
  summary.drawText('GG Inscrições • Documento gerado localmente para conferência da organização', {x:40,y:36,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});

  entered.forEach(model=>{
    const page=pdf.addPage(size); header(page,fonts,model.title,model.note,data.teamName);
    lineField(page,fonts,'Turma',data.team,40,614,258); lineField(page,fonts,'Nome de guerra',data.teamName,314,614,258);
    page.drawText('Nº',{x:45,y:574,size:7.5,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
    page.drawText('ATLETA / PARTICIPANTE',{x:78,y:574,size:7.5,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
    page.drawText('ORIGEM',{x:382,y:574,size:7.5,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
    if(model.mixed) page.drawText('GÊNERO',{x:510,y:574,size:7.5,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
    let rowY=554;
    model.entries.forEach((entry,index)=>{
      page.drawLine({start:{x:40,y:rowY},end:{x:572,y:rowY},thickness:.7,color:PDF.rgb(.8,.83,.87)});
      page.drawText(String(index+1).padStart(2,'0'),{x:45,y:rowY-16,size:8,font:fonts.bold,color:PDF.rgb(.34,.38,.45)});
      page.drawText(entry.name,{x:78,y:rowY-16,size:9,font:fonts.regular,color:PDF.rgb(.08,.1,.14),maxWidth:292});
      page.drawText(entry.origin === own ? 'Mesma turma' : entry.origin,{x:382,y:rowY-16,size:8.2,font:fonts.regular,color:PDF.rgb(.08,.1,.14),maxWidth:model.mixed?118:180});
      if(model.mixed) page.drawText(entry.gender === 'F' ? 'Feminino' : 'Masculino',{x:510,y:rowY-16,size:8.2,font:fonts.regular,color:PDF.rgb(.08,.1,.14)});
      rowY-=30;
    });
    page.drawText('Reforço: atleta cuja turma de origem foi informada acima.',{x:40,y:50,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
    page.drawText('JIEF 2026 • Atlética Anabólica • Educação Física UNISAPIENS',{x:40,y:36,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
  });
  return pdf.save();
}

async function registerJief(data) {
  const submissionCode = `JIEF-2026-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gg_event_submissions`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      event_key: 'jief-2026',
      event_name: 'JIEF 2026',
      submission_code: submissionCode,
      team: data.team,
      team_name: data.teamName,
      leader_name: data.leader,
      leader_phone: data.phone,
      rosters: data.rosters.filter(model => model.entries.length),
      status: 'aguardando_pagamentos'
    })
  });
  if (response.ok) return submissionCode;
  const detail = await response.json().catch(() => ({}));
  if (response.status === 409 || detail.code === '23505') throw new Error('Esta turma já enviou uma ficha. Para corrigir dados, procure a organização.');
  throw new Error('Não foi possível registrar sua ficha agora. Verifique a conexão e tente novamente.');
}

function regulation() {
  return `<div class="mini-regulation"><h3>Como esta ficha funciona</h3><ol><li>Esta ficha é preenchida pelo líder da turma, registrada pela organização e gera um PDF de conferência.</li><li>Informe a turma, o nome de guerra e somente as modalidades em que a equipe participará.</li><li>Quando um atleta jogar como reforço, selecione a turma de origem dele. Nas modalidades coletivas, a equipe deve manter ao menos 3 atletas da própria turma.</li><li>Em Vôlei de Praia 4x4 e Natação 4x25 mistos, os quatro titulares devem ter 2 mulheres e 2 homens.</li><li>O regulamento completo, as regras técnicas e o termo individual de responsabilidade serão liberados pela organização.</li></ol></div>`;
}

export function renderJief(app, model, goHome, store) {
  app.innerHTML = modelHeader(model,[['Turma','Equipe e responsável'],['Modalidades','Elencos e reforços'],['Finalizar','PDF para conferência']]) + `
    <form id="jiefForm" novalidate>
      <section class="panel" data-step-panel="1"><div class="panel-head"><div><span class="section-kicker">Etapa 1 de 3</span><h2>Identificação da equipe</h2></div><p>Use a turma oficial e defina o nome de guerra que aparecerá no JIEF.</p></div>
        <div class="form-grid"><label class="field"><span>Turma oficial *</span><select id="jiefTurma" required><option value="">Selecione a turma</option>${TURMAS.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label><label class="field"><span>Nome de guerra da turma *</span><input id="jiefNomeGuerra" required maxlength="40" placeholder="Ex.: Furacão, Relâmpago"></label><label class="field field-span-2"><span>Líder responsável pela inscrição *</span><input id="jiefLider" required maxlength="90" autocomplete="name"></label><label class="field"><span>Telefone do líder *</span><input id="jiefTelefone" required maxlength="16" inputmode="tel"></label><label class="field"><span>Curso</span><input value="Educação Física • UNISAPIENS" disabled></label></div>
        ${regulation()}<div class="actions"><span></span><button class="btn btn-primary" type="button" data-next="2">Montar elencos →</button></div>
      </section>
      <section class="panel" data-step-panel="2" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 2 de 3</span><h2>Modalidades e atletas</h2></div><p>Deixe em branco a modalidade em que sua turma não vai competir.</p></div>
        ${MODALITIES.map(roster).join('')}<div class="actions"><button class="btn btn-ghost" type="button" data-back="1">← Voltar</button><button class="btn btn-primary" type="button" data-next="3">Revisar ficha →</button></div>
      </section>
      <section class="panel" data-step-panel="3" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 3 de 3</span><h2>Registrar ficha e gerar PDF</h2></div><p>A ficha será registrada para conferência da Atlética e para cruzamento com os pagamentos no Cheers.</p></div>
        <div class="mini-regulation"><h3>Antes de finalizar</h3><p>Confira turma, nome de guerra, atletas e origem dos reforços. Após registrar, a ficha entra na planilha da organização e o PDF é baixado para a equipe.</p></div><div id="errorBox" class="error-box" role="alert" hidden></div><div class="actions"><button class="btn btn-ghost" type="button" data-back="2">← Voltar</button><button class="btn btn-primary btn-generate" id="generatePdf" type="button"><span class="btn-label">Registrar e gerar PDF</span><span class="spinner" hidden></span></button></div>
      </section>
    </form>${successHtml()}`;
  app.querySelectorAll('[data-home]').forEach(button=>button.addEventListener('click',goHome));
  const panels=[...app.querySelectorAll('[data-step-panel]')], pills=[...app.querySelectorAll('[data-step-pill]')];
  const showStep=n=>{panels.forEach(p=>p.hidden=Number(p.dataset.stepPanel)!==n);pills.forEach(p=>{const step=Number(p.dataset.stepPill);p.classList.toggle('is-active',step===n);p.classList.toggle('is-done',step<n);});scrollTo({top:0,behavior:'smooth'});};
  const value=id=>app.querySelector(`#${id}`)?.value.trim()||'';
  const validateIdentity=()=>{let valid=true;['jiefTurma','jiefNomeGuerra','jiefLider','jiefTelefone'].forEach(id=>{const field=app.querySelector(`#${id}`),ok=field.value.trim()!==''&&field.checkValidity();field.classList.toggle('invalid',!ok);if(!ok)valid=false;});if(!valid)app.querySelector('.invalid')?.focus();return valid;};
  app.querySelector('#jiefTelefone').addEventListener('input',event=>event.target.value=formatPhone(event.target.value));
  const readRosters=()=>MODALITIES.map(model=>({ ...model, entries:Array.from({length:model.max},(_,index)=>({name:value(`${model.id}_${index}_name`),origin:value(`${model.id}_${index}_origin`)||own,gender:value(`${model.id}_${index}_gender`)})).filter(entry=>entry.name) }));
  const validateRosters=()=>{
    const issues=[]; readRosters().forEach(model=>{
      if(model.entries.length && model.native){const local=model.entries.filter(entry=>entry.origin===own).length;if(local<model.native)issues.push(`${model.title}: inclua pelo menos ${model.native} atletas da própria turma.`);}
      if(model.entries.length && model.mixed){const starters=model.entries.slice(0,4);if(starters.length<4 || starters.filter(entry=>entry.gender==='F').length!==2 || starters.filter(entry=>entry.gender==='M').length!==2)issues.push(`${model.title}: os quatro titulares devem ser 2 mulheres e 2 homens.`);}
    }); return issues;
  };
  app.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.next);if(next===2&&!validateIdentity())return;if(next===3){const issues=validateRosters();if(issues.length){app.querySelector('#errorBox').textContent=issues.join(' ');app.querySelector('#errorBox').hidden=false;return;}app.querySelector('#errorBox').hidden=true;}showStep(next);}));
  app.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  app.querySelector('#generatePdf').addEventListener('click',async()=>{
    const error=app.querySelector('#errorBox');error.hidden=true;if(!validateIdentity()){showStep(1);return;}const issues=validateRosters();if(issues.length){error.textContent=issues.join(' ');error.hidden=false;showStep(2);return;}
    const rosters=readRosters(); if(!rosters.some(model=>model.entries.length)){error.textContent='Informe ao menos uma modalidade antes de gerar a ficha.';error.hidden=false;showStep(2);return;}
    const button=app.querySelector('#generatePdf'),label=button.querySelector('.btn-label'),spinner=button.querySelector('.spinner');button.disabled=true;label.textContent='Preparando ficha...';spinner.hidden=false;
    try {const team=value('jiefTurma'),teamName=value('jiefNomeGuerra'),data={team,teamName,leader:value('jiefLider'),phone:value('jiefTelefone'),rosters};const bytes=await createJiefPdf(data);label.textContent='Registrando inscrição...';const submissionCode=await registerJief(data);finishDownload(app,bytes,`JIEF_2026_${safeName(teamName)}.pdf`,false,store);app.querySelector('#successText').textContent=`Inscrição ${submissionCode} registrada com sucesso. O PDF foi baixado para conferência da equipe.`;} catch(err) {console.error(err);error.textContent=`Erro ao finalizar: ${err.message||'falha inesperada'}`;error.hidden=false;} finally {button.disabled=false;label.textContent='Registrar e gerar PDF';spinner.hidden=true;}
  });
}
