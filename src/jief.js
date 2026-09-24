import { modelHeader, formatPhone, safeName, finishDownload, esc } from './core.js';
import { JIEF_2026 } from './events/jief-2026.js';
import { createJiefPdf } from './jief-pdf.mjs';

const SUPABASE_URL = 'https://cmpmbbeeonnylomllkna.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_a3H97mJaw_R8OxV3bIwoUg_sHahj8nP';

const TURMAS = JIEF_2026.teams;
const MODALITIES = JIEF_2026.modalities;
const athleteCode = id => { const hex=String(id||'').replace(/-/g,'').toUpperCase(); return `JIEF-A${hex.slice(0,8)}${hex.slice(-8)}`; };
const normalizeRa = value => String(value||'').trim();

async function loadJiefPaymentDetails() {
  const url = `${SUPABASE_URL}/rest/v1/gg_event_payment_settings?event_key=eq.jief-2026&select=event_key,price_cents,pix_key,recipient_name,recipient_city,payment_instructions`;
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Dados Pix indisponíveis');
  const rows = await response.json();
  return rows[0] || null;
}

const brl = cents => (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const own = '__mesma_turma__';
const slots = (model, index) => {
  if (model.mixed && index < 4) return `Titular ${index + 1}`;
  if (model.mixed) return `Reserva ${index - 3}`;
  if (model.id.startsWith('basquete_')) return index < 3 ? `Titular ${index + 1}` : 'Reserva';
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
  const id = crypto.randomUUID();
  const originOptions = `<option value="${own}">Mesma turma</option>${TURMAS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}`;
  return `<div class="roster-field jief-row" data-athlete-row data-athlete-id="${id}">
    <span data-slot>${slots(model,index)}</span>
    <input data-athlete-name aria-label="Nome completo do atleta em ${esc(model.title)}" maxlength="90" placeholder="Nome completo" autocomplete="off">
    <input data-athlete-ra aria-label="RA (matrícula) do atleta em ${esc(model.title)}" inputmode="numeric" pattern="[0-9]{3,30}" maxlength="30" placeholder="RA (só números)" autocomplete="off">
    <select data-athlete-origin aria-label="Turma de origem do atleta">${originOptions}</select>
    ${model.mixed ? `<select data-athlete-gender aria-label="Gênero do atleta"><option value="">Gênero</option><option value="F">Feminino</option><option value="M">Masculino</option></select>` : ''}
    <button class="roster-remove" type="button" data-remove-athlete aria-label="Remover atleta de ${esc(model.title)}">×</button>
    <div class="jief-identity-line"><span class="jief-athlete-code" data-athlete-code>${athleteCode(id)}</span><label>Mesmo atleta em outra modalidade <select data-athlete-link aria-label="Vincular atleta já informado"><option value="">Novo atleta</option></select></label><small class="jief-repeated-hint" data-repeat-hint hidden>Este nome já aparece na ficha. Se for o mesmo atleta, selecione-o acima.</small><label class="jief-ra-hint" data-ra-hint hidden>Este RA já aparece em outra modalidade. Vincule o atleta acima para usar o mesmo código.</label><label class="jief-homonym" data-homonym-label hidden><input type="checkbox" data-homonym> Outra pessoa com o mesmo nome</label></div>
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
  return `<div class="mini-regulation"><h3>Como esta ficha funciona</h3><ol><li>Esta ficha é preenchida pelo líder da turma, registrada pela organização e gera um PDF de conferência.</li><li>Informe a turma, o nome de guerra e somente as modalidades em que a equipe participará.</li><li>Quando um atleta jogar como reforço, selecione a turma de origem dele. Nas modalidades coletivas, a equipe deve manter ao menos 3 atletas da própria turma.</li><li>No Vôlei de Praia 4x4 misto, os quatro titulares devem ter 2 mulheres e 2 homens.</li><li>O regulamento completo, as regras técnicas e o termo individual de responsabilidade serão liberados pela organização.</li></ol></div>`;
}

function registrationSuccess() {
  return `<section class="success-card jief-success" id="successCard" role="status" hidden><div class="success-icon">✓</div><div><span class="section-kicker">INSCRIÇÃO RECEBIDA</span><h2>Inscrição da equipe registrada</h2><p id="successText">A ficha foi registrada. O pagamento ainda será conferido pela organização.</p><div class="jief-success-code"><span>PROTOCOLO DA EQUIPE</span><strong id="jiefSubmissionCode"></strong><button class="btn btn-ghost" id="jiefCopySubmissionCode" type="button">Copiar código</button></div><p class="jief-success-help">Guarde o código e o PDF. Por enquanto, alterações e novos atletas são feitos pela organização; o acesso do líder será disponibilizado depois.</p></div><div class="success-actions"><a class="btn btn-primary" id="downloadAgain" href="#" download>Baixar PDF novamente</a><button class="btn btn-ghost" data-home type="button">Voltar ao início</button></div></section>`;
}

export function renderJief(app, model, goHome, store) {
  app.innerHTML = modelHeader(model,[['Turma','Equipe e responsável'],['Modalidades','Elencos e reforços'],['Finalizar','PDF para conferência']]) + `
    <div class="jief-payment-intro"><span>INSCRIÇÃO JIEF 2026</span><strong>Pagamento individual: R$ 20,00 por atleta</strong><small>Cada atleta paga uma única vez, mesmo que participe de várias modalidades. O líder também recebe orientações individuais após registrar a equipe.</small></div>
    <details class="jief-public-pix" id="jiefPublicPix"><summary>Consultar dados Pix para pagamento</summary><div id="jiefPublicPixBody"><p>Carregando dados Pix...</p></div></details>
    <form id="jiefForm" novalidate>
      <section class="panel" data-step-panel="1"><div class="panel-head"><div><span class="section-kicker">Etapa 1 de 3</span><h2>Identificação da equipe</h2></div><p>Use a turma oficial e defina o nome de guerra que aparecerá no JIEF.</p></div>
        <div class="form-grid"><label class="field"><span>Turma oficial *</span><select id="jiefTurma" required><option value="">Selecione a turma</option>${TURMAS.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label><label class="field"><span>Nome de guerra da turma *</span><input id="jiefNomeGuerra" required maxlength="40" placeholder="Ex.: Furacão, Relâmpago"></label><label class="field field-span-2"><span>Líder responsável pela inscrição *</span><input id="jiefLider" required maxlength="90" autocomplete="name"></label><label class="field"><span>Telefone do líder *</span><input id="jiefTelefone" required maxlength="16" inputmode="tel"></label><label class="field"><span>Curso</span><input value="Educação Física • UNISAPIENS" disabled></label></div>
        ${regulation()}<div class="actions"><span></span><button class="btn btn-primary" type="button" data-next="2">Montar elencos →</button></div>
      </section>
      <section class="panel" data-step-panel="2" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 2 de 3</span><h2>Modalidades e atletas</h2></div><p>Informe nome completo e RA (matrícula) de cada aluno. Vincule a mesma pessoa quando ela participar de outra modalidade; nome, RA e turma de origem acompanham o código.</p></div>
        ${MODALITIES.map(roster).join('')}<div id="rosterError" class="error-box" role="alert" hidden></div><div class="actions"><button class="btn btn-ghost" type="button" data-back="1">← Voltar</button><button class="btn btn-primary" type="button" data-next="3">Revisar ficha →</button></div>
      </section>
      <section class="panel" data-step-panel="3" hidden><div class="panel-head"><div><span class="section-kicker">Etapa 3 de 3</span><h2>Registrar ficha e gerar PDF</h2></div><p>Confira a equipe antes de registrar. O Pix de cada atleta aparece depois da confirmação.</p></div>
        <div class="mini-regulation"><h3>Revise sua inscrição</h3><div id="jiefReview"></div><p>O pagamento é individual, uma vez por atleta no evento, e a organização confere cada Pix manualmente.</p></div><div id="errorBox" class="error-box" role="alert" hidden></div><div class="actions"><button class="btn btn-ghost" type="button" data-back="2">← Voltar</button><button class="btn btn-primary btn-generate" id="generatePdf" type="button"><span class="btn-label">Registrar e gerar PDF</span><span class="spinner" hidden></span></button></div>
      </section>
    </form>${registrationSuccess()}<section class="jief-payment-result" id="jiefPaymentResult" hidden aria-live="polite"></section>`;
  let paymentDetails = null;
  const paymentPromise = loadJiefPaymentDetails().then(details => { paymentDetails = details; return details; }).catch(() => null);
  paymentPromise.then(details=>{
    const body=app.querySelector('#jiefPublicPixBody');
    if(!body)return;
    if(!details){body.innerHTML='<p>Dados Pix indisponíveis no momento. Confirme diretamente com a organização antes de pagar.</p>';return;}
    body.innerHTML=`<p>Pague somente depois que o líder incluir seu nome na inscrição da equipe. O valor é <strong>${brl(details.price_cents)} uma vez por atleta</strong>. Identifique seu nome e a turma no comprovante.</p><div class="jief-pix-key"><small>CHAVE PIX · ${esc(details.recipient_name)} · ${esc(details.recipient_city)}</small><code>${esc(details.pix_key)}</code><button class="btn btn-ghost" type="button" id="jiefCopyPublicPix">Copiar chave Pix</button></div>${details.payment_instructions?`<p class="jief-payment-instructions">${esc(details.payment_instructions)}</p>`:''}<p class="jief-payment-caution">A organização confirma o pagamento manualmente.</p>`;
    body.querySelector('#jiefCopyPublicPix').addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(details.pix_key);event.currentTarget.textContent='Chave copiada';}catch{event.currentTarget.textContent='Não foi possível copiar';}
    });
  });
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
  const athleteRows=()=>[...app.querySelectorAll('[data-athlete-row]')];
  const refreshAthleteIdentity=()=>{
    const rows=athleteRows();
    const named=rows.filter(row=>row.closest('[data-roster]').querySelector('[data-enroll]').checked&&row.querySelector('[data-athlete-name]').value.trim());
    const firstByName=new Map();
    const firstByRa=new Map(),firstById=new Map();
    rows.forEach(row=>{
      const id=row.dataset.athleteId;
      row.querySelector('[data-athlete-code]').textContent=athleteCode(id);
      const link=row.querySelector('[data-athlete-link]'),current=link.value;
      const rosterId=row.closest('[data-roster]').dataset.roster;
      const options=[...new Map(named.filter(other=>other!==row&&other.closest('[data-roster]').dataset.roster!==rosterId&&(other.dataset.athleteId!==id||other.dataset.athleteId===row.dataset.linkedId)).map(other=>[other.dataset.athleteId,{name:other.querySelector('[data-athlete-name]').value.trim(),ra:normalizeRa(other.querySelector('[data-athlete-ra]').value)}])).entries()];
      link.innerHTML='<option value="">Novo atleta</option>'+options.map(([personId,person])=>`<option value="${personId}">${esc(person.name)}${person.ra?` · RA ${esc(person.ra)}`:''} · ${athleteCode(personId)}</option>`).join('');
      link.value=options.some(([personId])=>personId===current)?current:'';
      const selected=row.closest('[data-roster]').querySelector('[data-enroll]').checked;
      const name=selected?row.querySelector('[data-athlete-name]').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR'):'';
      const ra=selected?normalizeRa(row.querySelector('[data-athlete-ra]').value):'';
      const repeated=name&&firstByName.has(name)&&firstByName.get(name)!==id&&!row.dataset.linkedId;
      row.querySelector('[data-repeat-hint]').hidden=!repeated;
      row.querySelector('[data-ra-hint]').hidden=!(ra&&firstByRa.has(ra)&&firstByRa.get(ra)!==id);
      row.querySelector('[data-homonym-label]').hidden=!repeated;
      if(!repeated)row.querySelector('[data-homonym]').checked=false;
      if(name&&!firstByName.has(name))firstByName.set(name,id);
      if(ra&&!firstByRa.has(ra))firstByRa.set(ra,id);
      const linked=firstById.has(id);
      row.querySelector('[data-athlete-name]').readOnly=linked;
      row.querySelector('[data-athlete-ra]').readOnly=linked;
      row.querySelector('[data-athlete-origin]').disabled=linked;
      if(!linked)firstById.set(id,row);
    });
  };
  app.querySelectorAll('[data-enroll]').forEach(checkbox=>checkbox.addEventListener('change',()=>{
    const block=checkbox.closest('[data-roster]');
    const selected=checkbox.checked;
    block.querySelector('[data-roster-content]').hidden=!selected;
    block.querySelector('[data-roster-selection]').textContent=selected?`Selecionada · ${block.querySelectorAll('[data-athlete-row]').length}/${MODALITIES.find(item=>item.id===block.dataset.roster).max}`:'Não selecionada';
    block.classList.toggle('is-enrolled',selected);
    refreshAthleteIdentity();
    showRosterIssues([]);
  }));
  app.querySelectorAll('[data-add-athlete]').forEach(button=>button.addEventListener('click',()=>{
    const model=MODALITIES.find(item=>item.id===button.dataset.addAthlete);
    const grid=app.querySelector(`[data-entries="${model.id}"]`);
    if(grid.querySelectorAll('[data-athlete-row]').length>=model.max)return;
    grid.insertAdjacentHTML('beforeend',athleteRow(model,grid.children.length));
    updateRosterCount(model);
    refreshAthleteIdentity();
    grid.lastElementChild.querySelector('[data-athlete-name]').focus();
  }));
  app.addEventListener('input',event=>{
    if(!event.target.matches('[data-athlete-name],[data-athlete-ra]'))return;
    const row=event.target.closest('[data-athlete-row]');
    if(event.target.matches('[data-athlete-ra]'))event.target.value=normalizeRa(event.target.value);
    const field=event.target.matches('[data-athlete-ra]')?'[data-athlete-ra]':'[data-athlete-name]';
    athleteRows().filter(other=>other!==row&&other.dataset.athleteId===row.dataset.athleteId)
      .forEach(other=>{other.querySelector(field).value=event.target.value;});
    refreshAthleteIdentity();
  });
  app.addEventListener('change',event=>{
    const origin=event.target.closest('[data-athlete-origin]');
    if(origin){
      const row=origin.closest('[data-athlete-row]');
      athleteRows().filter(other=>other!==row&&other.dataset.athleteId===row.dataset.athleteId)
        .forEach(other=>{other.querySelector('[data-athlete-origin]').value=origin.value;});
      return;
    }
    const link=event.target.closest('[data-athlete-link]');
    if(!link)return;
    const row=link.closest('[data-athlete-row]'),target=athleteRows().find(other=>other!==row&&other.dataset.athleteId===link.value);
    if(target){
      row.dataset.athleteId=target.dataset.athleteId;
      row.dataset.linkedId=target.dataset.athleteId;
      row.querySelector('[data-athlete-name]').value=target.querySelector('[data-athlete-name]').value;
      row.querySelector('[data-athlete-ra]').value=target.querySelector('[data-athlete-ra]').value;
      row.querySelector('[data-athlete-origin]').value=target.querySelector('[data-athlete-origin]').value;
      if(row.querySelector('[data-athlete-gender]')&&target.querySelector('[data-athlete-gender]'))row.querySelector('[data-athlete-gender]').value=target.querySelector('[data-athlete-gender]').value;
    }else{row.dataset.athleteId=crypto.randomUUID();delete row.dataset.linkedId;row.querySelector('[data-athlete-name]').value='';row.querySelector('[data-athlete-ra]').value='';row.querySelector('[data-athlete-origin]').value=own;}
    refreshAthleteIdentity();
  });
  app.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-athlete]');
    if(!button)return;
    const block=button.closest('[data-roster]');
    button.closest('[data-athlete-row]').remove();
    updateRosterCount(MODALITIES.find(item=>item.id===block.dataset.roster));
    refreshAthleteIdentity();
  });
  const readRosters=()=>MODALITIES.filter(model=>app.querySelector(`[data-enroll="${model.id}"]`).checked).map(model=>({ ...model, entries:[...app.querySelectorAll(`[data-entries="${model.id}"] [data-athlete-row]`)].map(row=>({
    athlete_id:row.dataset.athleteId,
    name:row.querySelector('[data-athlete-name]').value.trim(),
    ra:normalizeRa(row.querySelector('[data-athlete-ra]').value),
    origin:row.querySelector('[data-athlete-origin]').value||own,
    gender:row.querySelector('[data-athlete-gender]')?.value||''
  })).filter(entry=>entry.name) }));
  const validateRosters=()=>{
    const issues=[]; readRosters().forEach(model=>{
      if(model.entries.length<model.min)issues.push(`${model.title}: inclua pelo menos ${model.min} ${model.min===1?'participante':'participantes'}.`);
      if(model.entries.length && model.native){const local=model.entries.filter(entry=>entry.origin===own).length;if(local<model.native)issues.push(`${model.title}: inclua pelo menos ${model.native} atletas da própria turma.`);}
      if(model.entries.length && model.entries.some(entry=>!entry.gender) && model.mixed)issues.push(`${model.title}: informe o gênero de cada atleta.`);
      const ids=model.entries.map(entry=>entry.athlete_id);
      if(new Set(ids).size!==ids.length)issues.push(`${model.title}: o mesmo atleta aparece duas vezes no elenco.`);
      if(model.entries.length && model.mixed){const starters=model.entries.slice(0,4);if(starters.length<4 || starters.filter(entry=>entry.gender==='F').length!==2 || starters.filter(entry=>entry.gender==='M').length!==2)issues.push(`${model.title}: os quatro titulares devem ser 2 mulheres e 2 homens.`);}
    });
    const named=new Map(),idNames=new Map(),idOrigins=new Map(),idRaValues=new Map(),raIds=new Map();
    athleteRows().filter(row=>row.closest('[data-roster]').querySelector('[data-enroll]').checked).forEach(row=>{
      const name=row.querySelector('[data-athlete-name]').value.trim();if(!name)return;
      const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR'),id=row.dataset.athleteId;
      const ra=normalizeRa(row.querySelector('[data-athlete-ra]').value);
      if(name.split(/\s+/).length<2)issues.push(`${name}: informe nome e sobrenome do atleta.`);
      if(!/^[0-9]{3,30}$/.test(ra))issues.push(`${name}: informe o RA com 3 a 30 dígitos, somente números.`);
      if(raIds.has(ra)&&raIds.get(ra)!==id)issues.push(`${name}: este RA já foi informado. Vincule o atleta já cadastrado em vez de criar outro código.`);
      if(idRaValues.has(id)&&idRaValues.get(id)!==ra)issues.push(`${name}: o mesmo código de atleta não pode ter RA diferente.`);
      raIds.set(ra,id);idRaValues.set(id,ra);
      if(named.has(key)&&named.get(key)!==id&&!row.dataset.linkedId&&!row.querySelector('[data-homonym]').checked)issues.push(`${name}: vincule o atleta já informado ou marque que é outra pessoa com o mesmo nome.`);
      if(!named.has(key))named.set(key,id);
      if(idNames.has(id)&&idNames.get(id)!==key)issues.push(`${name}: o código deste atleta está ligado a outro nome.`);
      idNames.set(id,key);
      const origin=row.querySelector('[data-athlete-origin]').value||own;
      if(idOrigins.has(id)&&idOrigins.get(id)!==origin)issues.push(`${name}: a turma de origem deve ser igual em todas as modalidades.`);
      idOrigins.set(id,origin);
    });
    return [...new Set(issues)];
  };
  const showRosterIssues=issues=>{const error=app.querySelector('#rosterError');error.textContent=issues.join(' ');error.hidden=!issues.length;if(issues.length)error.scrollIntoView({block:'center'});};
  const renderReview=()=>{const entered=readRosters().filter(item=>item.entries.length);app.querySelector('#jiefReview').innerHTML=`<p><strong>${esc(value('jiefNomeGuerra'))}</strong> · ${esc(value('jiefTurma'))} · Líder: ${esc(value('jiefLider'))}</p><ul>${entered.map(item=>`<li>${esc(item.title)}: ${item.entries.length} ${item.entries.length===1?'atleta':'atletas'}</li>`).join('')}</ul>`;};
  const renderPaymentResult=(data,code)=>{
    const mount=app.querySelector('#jiefPaymentResult');
    const athletes=[...new Map(data.rosters.flatMap(roster=>roster.entries).map(entry=>[entry.athlete_id,entry])).values()];
    if(!paymentDetails){
      mount.innerHTML='<h2>Pagamento ainda indisponível</h2><p>A ficha foi registrada, mas os dados Pix não puderam ser carregados. Não pague com dados recebidos de terceiros; confirme diretamente com a organização.</p>';
    } else {
      const amount=brl(paymentDetails.price_cents);
      mount.innerHTML=`<span class="section-kicker">PRÓXIMO PASSO · PAGAMENTO INDIVIDUAL</span><h2>Pix dos atletas</h2><p>Cada atleta abaixo paga <strong>${amount} uma vez no JIEF</strong>, mesmo em várias modalidades. A confirmação é feita manualmente pela organização.</p><div class="jief-payment-facts"><div><small>VALOR POR ATLETA</small><strong>${amount}</strong></div><div><small>RECEBEDOR</small><strong>${esc(paymentDetails.recipient_name)}</strong><span>${esc(paymentDetails.recipient_city)}</span></div></div><div class="jief-pix-key"><small>CHAVE PIX</small><code>${esc(paymentDetails.pix_key)}</code><button class="btn btn-ghost" id="jiefCopyPix" type="button">Copiar chave Pix</button></div>${paymentDetails.payment_instructions?`<p class="jief-payment-instructions">${esc(paymentDetails.payment_instructions)}</p>`:''}<div class="jief-athlete-payments"><h3>Compartilhe com os atletas <small>${athletes.length} ${athletes.length===1?'pessoa':'pessoas'}</small></h3><p>Peça que o comprovante identifique o código do atleta, o nome e a turma. Um código vale para todas as modalidades em que ele aparece.</p><ul>${athletes.map((athlete,index)=>`<li><span>${esc(athlete.name)} <small>${athleteCode(athlete.athlete_id)}</small></span><button class="btn btn-ghost" type="button" data-copy-payment="${index}">Copiar orientação</button></li>`).join('')}</ul></div><p class="jief-payment-caution">O Pix não é confirmado automaticamente. Guarde o comprovante e aguarde a organização marcar o pagamento no painel.</p>`;
      mount.querySelector('#jiefCopyPix').addEventListener('click',async event=>{
        try{await navigator.clipboard.writeText(paymentDetails.pix_key);event.currentTarget.textContent='Chave copiada';}catch{event.currentTarget.textContent='Não foi possível copiar';}
      });
      mount.querySelectorAll('[data-copy-payment]').forEach(button=>button.addEventListener('click',async()=>{
        const athlete=athletes[Number(button.dataset.copyPayment)];
        const message=`JIEF 2026 · Inscrição ${code}\nAtleta: ${athlete.name}\nCódigo do atleta: ${athleteCode(athlete.athlete_id)}\nTurma: ${data.team}\nPix individual: ${amount}\nChave Pix: ${paymentDetails.pix_key}\nRecebedor: ${paymentDetails.recipient_name} (${paymentDetails.recipient_city})\n${paymentDetails.payment_instructions||'Identifique o código do atleta no comprovante e envie à organização.'}\nA confirmação é manual pela organização.`;
        try{await navigator.clipboard.writeText(message);button.textContent='Orientação copiada';}catch{button.textContent='Não foi possível copiar';}
      }));
    }
    mount.hidden=false;
  };
  app.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.next);if(next===2&&!validateIdentity())return;if(next===3){const issues=validateRosters();if(!readRosters().length)issues.push('Selecione pelo menos uma modalidade.');showRosterIssues(issues);if(issues.length)return;renderReview();}showStep(next);}));
  app.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  app.querySelector('#generatePdf').addEventListener('click',async()=>{
    const error=app.querySelector('#errorBox');error.hidden=true;if(!validateIdentity()){showStep(1);return;}const issues=validateRosters();if(issues.length){showStep(2);showRosterIssues(issues);return;}
    const rosters=readRosters(); if(!rosters.length){showStep(2);showRosterIssues(['Selecione pelo menos uma modalidade.']);return;}
    const button=app.querySelector('#generatePdf'),label=button.querySelector('.btn-label'),spinner=button.querySelector('.spinner');button.disabled=true;label.textContent='Preparando ficha...';spinner.hidden=false;
    try {
      const team=value('jiefTurma'),teamName=value('jiefNomeGuerra'),data={team,teamName,leader:value('jiefLider'),phone:value('jiefTelefone'),rosters};
      const bytes=await createJiefPdf(data);
      label.textContent='Registrando inscrição...';
      const submissionCode=await registerJief(data);
      app.querySelector('#jiefSubmissionCode').textContent=submissionCode;
      app.querySelector('#successText').textContent='Sua inscrição foi salva. O pagamento ainda será conferido pela organização. Confira abaixo as orientações para cada atleta.';
      app.querySelector('#jiefForm').hidden=true;
      app.querySelector('.steps').hidden=true;
      app.querySelector('.jief-payment-intro').hidden=true;
      app.querySelector('#jiefPublicPix').hidden=true;
      try {
        finishDownload(app,bytes,`JIEF_2026_${safeName(teamName)}.pdf`,false,store);
        app.querySelector('#successText').textContent='Sua inscrição foi salva e o PDF foi baixado. O pagamento ainda será conferido pela organização. Confira abaixo as orientações para cada atleta.';
      } catch(downloadError) {
        console.error(downloadError);
        app.querySelector('#successCard').hidden=false;
        app.querySelector('#downloadAgain').hidden=true;
        app.querySelector('#successText').textContent='Sua inscrição foi salva, mas o download do PDF falhou. Guarde o protocolo e peça o documento à organização.';
        app.querySelector('#successCard').scrollIntoView({behavior:'smooth',block:'center'});
      }
      await paymentPromise;
      if(!paymentDetails)paymentDetails=await loadJiefPaymentDetails().catch(()=>null);
      renderPaymentResult(data,submissionCode);
    } catch(err) {
      console.error(err);
      error.textContent=`Erro ao finalizar: ${err.message||'falha inesperada'}`;
      error.hidden=false;
    } finally {button.disabled=false;label.textContent='Registrar e gerar PDF';spinner.hidden=true;}
  });
  app.querySelector('#jiefCopySubmissionCode').addEventListener('click',async event=>{
    const code=app.querySelector('#jiefSubmissionCode').textContent;
    try{await navigator.clipboard.writeText(code);event.currentTarget.textContent='Código copiado';}catch{event.currentTarget.textContent='Não foi possível copiar';}
  });
}
