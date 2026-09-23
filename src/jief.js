import { modelHeader, successHtml, formatPhone, safeName, finishDownload, esc } from './core.js';
import { JIEF_2026 } from './events/jief-2026.js';
import { createJiefPdf } from './jief-pdf.mjs';

const SUPABASE_URL = 'https://cmpmbbeeonnylomllkna.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_a3H97mJaw_R8OxV3bIwoUg_sHahj8nP';

const TURMAS = JIEF_2026.teams;
const MODALITIES = JIEF_2026.modalities;

const own = '__mesma_turma__';
const slots = (model, index) => {
  if (model.mixed && index < 4) return `Titular ${index + 1}`;
  if (model.mixed) return `Reserva ${index - 3}`;
  if (model.max === 2) return index === 0 ? 'Titular' : 'Reserva';
  if (model.max === 3) return index < 2 ? `Titular ${index + 1}` : 'Reserva';
  return String(index + 1).padStart(2, '0');
};

function roster(model) {
  return `<details class="roster-block" data-roster="${model.id}">
    <summary class="roster-head"><div><h3>${esc(model.title)}</h3><p>${esc(model.note)}</p></div><span class="count-badge">Mín. ${model.min} · Máx. ${model.max}</span><span class="roster-selection" data-roster-selection="${model.id}">Não selecionada</span></summary>
    <div class="roster-body"><label class="roster-enroll"><input type="checkbox" data-enroll="${model.id}"><span>Inscrever nesta modalidade</span></label>
      <div data-roster-content="${model.id}" hidden><p class="roster-limit">Inscreva de ${model.min} a ${model.max} ${model.max===1?'participante':'participantes'} nesta modalidade.</p><div class="roster-grid" data-entries="${model.id}"></div>
        <div class="roster-tools"><span data-roster-count="${model.id}">Nenhum atleta adicionado</span><button class="btn btn-ghost" type="button" data-add-athlete="${model.id}">+ Adicionar atleta</button></div>
      </div>
    </div>
  </details>`;
}

function athleteRow(model, index) {
  const originOptions = `<option value="${own}">Mesma turma</option>${TURMAS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}`;
  return `<div class="roster-field jief-row" data-athlete-row>
    <span data-slot>${slots(model,index)}</span>
    <input data-athlete-name aria-label="Nome completo do atleta em ${esc(model.title)}" maxlength="90" placeholder="Nome completo" autocomplete="off">
    <select data-athlete-origin aria-label="Turma de origem do atleta">${originOptions}</select>
    ${model.mixed ? `<select data-athlete-gender aria-label="Gênero do atleta"><option value="">Gênero</option><option value="F">Feminino</option><option value="M">Masculino</option></select>` : ''}
    <button class="roster-remove" type="button" data-remove-athlete aria-label="Remover atleta de ${esc(model.title)}">×</button>
  </div>`;
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
      event_key: JIEF_2026.key,
      event_name: JIEF_2026.name,
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
      <section class="panel" data-step-panel="2" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 2 de 3</span><h2>Modalidades e atletas</h2></div><p>Abra uma modalidade, marque a participação e adicione os atletas. Modalidades não selecionadas não entram na ficha.</p></div>
        ${MODALITIES.map(roster).join('')}<div id="rosterError" class="error-box" role="alert" hidden></div><div class="actions"><button class="btn btn-ghost" type="button" data-back="1">← Voltar</button><button class="btn btn-primary" type="button" data-next="3">Revisar ficha →</button></div>
      </section>
      <section class="panel" data-step-panel="3" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 3 de 3</span><h2>Registrar ficha e gerar PDF</h2></div><p>A ficha será registrada para conferência da organização. O pagamento individual de R$ 20,00 por atleta será informado separadamente enquanto a área de pagamento é preparada.</p></div>
        <div class="mini-regulation"><h3>Revise sua inscrição</h3><div id="jiefReview"></div><p>Após registrar, a ficha fica disponível no painel da organização e o PDF é baixado para a equipe. O pagamento é conferido separadamente pela organização.</p></div><div id="errorBox" class="error-box" role="alert" hidden></div><div class="actions"><button class="btn btn-ghost" type="button" data-back="2">← Voltar</button><button class="btn btn-primary btn-generate" id="generatePdf" type="button"><span class="btn-label">Registrar e gerar PDF</span><span class="spinner" hidden></span></button></div>
      </section>
    </form>${successHtml()}`;
  app.querySelectorAll('[data-home]').forEach(button=>button.addEventListener('click',goHome));
  const panels=[...app.querySelectorAll('[data-step-panel]')], pills=[...app.querySelectorAll('[data-step-pill]')];
  const showStep=n=>{panels.forEach(p=>p.hidden=Number(p.dataset.stepPanel)!==n);pills.forEach(p=>{const step=Number(p.dataset.stepPill);p.classList.toggle('is-active',step===n);p.classList.toggle('is-done',step<n);});scrollTo({top:0,behavior:'smooth'});};
  const value=id=>app.querySelector(`#${id}`)?.value.trim()||'';
  const validateIdentity=()=>{let valid=true;['jiefTurma','jiefNomeGuerra','jiefLider','jiefTelefone'].forEach(id=>{const field=app.querySelector(`#${id}`),ok=field.value.trim()!==''&&field.checkValidity();field.classList.toggle('invalid',!ok);if(!ok)valid=false;});if(!valid)app.querySelector('.invalid')?.focus();return valid;};
  app.querySelector('#jiefTelefone').addEventListener('input',event=>event.target.value=formatPhone(event.target.value));
  const updateRosterCount=model=>{
    const block=app.querySelector(`[data-roster="${model.id}"]`);
    const rows=[...block.querySelectorAll('[data-athlete-row]')];
    rows.forEach((row,index)=>row.querySelector('[data-slot]').textContent=slots(model,index));
    block.querySelector('[data-roster-count]').textContent=`${rows.length} de ${model.max} ${rows.length===1?'atleta adicionado':'atletas adicionados'}`;
    if(block.querySelector('[data-enroll]').checked)block.querySelector('[data-roster-selection]').textContent=`Selecionada · ${rows.length}/${model.max}`;
    block.querySelector('[data-add-athlete]').disabled=rows.length>=model.max;
  };
  app.querySelectorAll('[data-enroll]').forEach(checkbox=>checkbox.addEventListener('change',()=>{
    const block=checkbox.closest('[data-roster]');
    const selected=checkbox.checked;
    block.querySelector('[data-roster-content]').hidden=!selected;
    block.querySelector('[data-roster-selection]').textContent=selected?`Selecionada · ${block.querySelectorAll('[data-athlete-row]').length}/${MODALITIES.find(item=>item.id===block.dataset.roster).max}`:'Não selecionada';
    block.classList.toggle('is-enrolled',selected);
    showRosterIssues([]);
  }));
  app.querySelectorAll('[data-add-athlete]').forEach(button=>button.addEventListener('click',()=>{
    const model=MODALITIES.find(item=>item.id===button.dataset.addAthlete);
    const grid=app.querySelector(`[data-entries="${model.id}"]`);
    if(grid.querySelectorAll('[data-athlete-row]').length>=model.max)return;
    grid.insertAdjacentHTML('beforeend',athleteRow(model,grid.children.length));
    updateRosterCount(model);
    grid.lastElementChild.querySelector('[data-athlete-name]').focus();
  }));
  app.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-athlete]');
    if(!button)return;
    const block=button.closest('[data-roster]');
    button.closest('[data-athlete-row]').remove();
    updateRosterCount(MODALITIES.find(item=>item.id===block.dataset.roster));
  });
  const readRosters=()=>MODALITIES.filter(model=>app.querySelector(`[data-enroll="${model.id}"]`).checked).map(model=>({ ...model, entries:[...app.querySelectorAll(`[data-entries="${model.id}"] [data-athlete-row]`)].map(row=>({
    name:row.querySelector('[data-athlete-name]').value.trim(),
    origin:row.querySelector('[data-athlete-origin]').value||own,
    gender:row.querySelector('[data-athlete-gender]')?.value||''
  })).filter(entry=>entry.name) }));
  const validateRosters=()=>{
    const issues=[]; readRosters().forEach(model=>{
      if(model.entries.length<model.min)issues.push(`${model.title}: inclua pelo menos ${model.min} ${model.min===1?'participante':'participantes'}.`);
      if(model.entries.length && model.native){const local=model.entries.filter(entry=>entry.origin===own).length;if(local<model.native)issues.push(`${model.title}: inclua pelo menos ${model.native} atletas da própria turma.`);}
      if(model.entries.length && model.entries.some(entry=>!entry.gender) && model.mixed)issues.push(`${model.title}: informe o gênero de cada atleta.`);
      const names=model.entries.map(entry=>entry.name.toLocaleLowerCase('pt-BR'));
      if(new Set(names).size!==names.length)issues.push(`${model.title}: há atletas repetidos no mesmo elenco.`);
      if(model.entries.length && model.mixed){const starters=model.entries.slice(0,4);if(starters.length<4 || starters.filter(entry=>entry.gender==='F').length!==2 || starters.filter(entry=>entry.gender==='M').length!==2)issues.push(`${model.title}: os quatro titulares devem ser 2 mulheres e 2 homens.`);}
    }); return issues;
  };
  const showRosterIssues=issues=>{const error=app.querySelector('#rosterError');error.textContent=issues.join(' ');error.hidden=!issues.length;if(issues.length)error.scrollIntoView({block:'center'});};
  const renderReview=()=>{const entered=readRosters().filter(item=>item.entries.length);app.querySelector('#jiefReview').innerHTML=`<p><strong>${esc(value('jiefNomeGuerra'))}</strong> · ${esc(value('jiefTurma'))} · Líder: ${esc(value('jiefLider'))}</p><ul>${entered.map(item=>`<li>${esc(item.title)}: ${item.entries.length} ${item.entries.length===1?'atleta':'atletas'}</li>`).join('')}</ul>`;};
  app.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.next);if(next===2&&!validateIdentity())return;if(next===3){const issues=validateRosters();if(!readRosters().length)issues.push('Selecione pelo menos uma modalidade.');showRosterIssues(issues);if(issues.length)return;renderReview();}showStep(next);}));
  app.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  app.querySelector('#generatePdf').addEventListener('click',async()=>{
    const error=app.querySelector('#errorBox');error.hidden=true;if(!validateIdentity()){showStep(1);return;}const issues=validateRosters();if(issues.length){showStep(2);showRosterIssues(issues);return;}
    const rosters=readRosters(); if(!rosters.length){showStep(2);showRosterIssues(['Selecione pelo menos uma modalidade.']);return;}
    const button=app.querySelector('#generatePdf'),label=button.querySelector('.btn-label'),spinner=button.querySelector('.spinner');button.disabled=true;label.textContent='Preparando ficha...';spinner.hidden=false;
    try {const team=value('jiefTurma'),teamName=value('jiefNomeGuerra'),data={team,teamName,leader:value('jiefLider'),phone:value('jiefTelefone'),rosters};const bytes=await createJiefPdf(data);label.textContent='Registrando inscrição...';const submissionCode=await registerJief(data);finishDownload(app,bytes,`JIEF_2026_${safeName(teamName)}.pdf`,false,store);app.querySelector('#successText').textContent=`Inscrição ${submissionCode} registrada com sucesso. O PDF foi baixado para conferência da equipe.`;} catch(err) {console.error(err);error.textContent=`Erro ao finalizar: ${err.message||'falha inesperada'}`;error.hidden=false;} finally {button.disabled=false;label.textContent='Registrar e gerar PDF';spinner.hidden=true;}
  });
}
