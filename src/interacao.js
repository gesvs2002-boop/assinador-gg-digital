import { PDF, modelHeader, successHtml, signatureStep, createSignature, formatPhone, safeName, loadTemplate, drawText, drawSignature, dataUrlBytes, finishDownload } from './core.js';

const REGULATION = `<div class="mini-regulation"><h3>Regulamento resumido</h3><ol><li>O Interação UNISAPIENS é uma atividade de integração e competição entre as turmas/períodos do curso de Educação Física.</li><li>As modalidades serão: Cabo de Guerra, Prancha, Pula Corda e Queimada.</li><li>Cada atleta poderá representar somente a sua própria turma, sendo vedada a participação por outra turma/período.</li><li>Em cada prova, a pontuação será: <strong>1º lugar = 10 pontos</strong>, <strong>2º lugar = 7 pontos</strong> e <strong>3º lugar = 5 pontos</strong>.</li><li>A classificação geral será definida pela soma dos pontos obtidos pela turma nas quatro modalidades.</li><li>Em caso de empate na pontuação geral, terá vantagem a turma com maior número de 1º lugares; persistindo o empate, serão considerados os 2º lugares e, depois, os 3º lugares.</li><li>Todos os participantes deverão respeitar as orientações de segurança, arbitragem e organização do evento.</li></ol></div>`;

function roster(prefix,count,title,subtitle){return `<section class="roster-block"><div class="roster-head"><div><h3>${title}</h3><p>${subtitle}</p></div><span class="count-badge">até ${count} nomes</span></div><div class="roster-grid">${Array.from({length:count},(_,i)=>`<label class="roster-field"><span>${i+1}</span><input id="${prefix}_${i+1}" maxlength="90" placeholder="Nome do(a) atleta"></label>`).join('')}</div></section>`;}

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
  app.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.next);if(n===2&&!validate1())return;showStep(n);}));app.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.back))));
  const signature=createSignature(app);
  const rosterValues=(key,count)=>Array.from({length:count},(_,i)=>value(`${key}_${i+1}`));
  const fillRoster=(page,font,names,startY,step)=>names.forEach((name,i)=>{if(name)drawText(page,font,name,66,startY-(i*step),480,9.2,7);});
  const markFormat=(page,font,format,presX,y,semiX,semiY)=>page.drawText('X',{x:format==='Presencial'?presX:semiX,y:format==='Presencial'?y:semiY,size:9,font,color:PDF.rgb(.03,.04,.07)});

  app.querySelector('#generatePdf').addEventListener('click',async()=>{
    const error=app.querySelector('#errorBox');error.hidden=true;if(!validate1()){showStep(1);return;}const btn=app.querySelector('#generatePdf'),label=btn.querySelector('.btn-label'),spinner=btn.querySelector('.spinner');btn.disabled=true;label.textContent='Gerando PDF...';spinner.hidden=false;
    try{const pdf=await loadTemplate(model.pdfUrl,4),font=await pdf.embedFont(PDF.StandardFonts.Helvetica),[p1,p2,p3,p4]=pdf.getPages(),periodo=value('periodo'),formato=value('formato'),lider=value('lider'),telefone=value('liderTelefone'),turma=`${periodo} • ${formato}`;
      drawText(p1,font,periodo,99,622,185,9.5);drawText(p1,font,lider,99,598,190,9.2);drawText(p1,font,telefone,390,598,118,9.2);drawText(p1,font,turma,99,569,190,9.2);markFormat(p1,font,formato,390,619,453,619);
      [p2,p3,p4].forEach(p=>{drawText(p,font,periodo,252,626,43,8.8);markFormat(p,font,formato,302,624,356,624);});
      fillRoster(p2,font,rosterValues('cabo',15),558,30.75);fillRoster(p3,font,rosterValues('queimada',15),558,30.75);fillRoster(p4,font,rosterValues('prancha',5),569,20.15);fillRoster(p4,font,rosterValues('pulaCorda',5),408,20.15);
      const sig=signature.dataUrl();if(sig){const png=await pdf.embedPng(dataUrlBytes(sig));drawSignature(p4,png,{x:95,y:99,w:205,h:24});}const bytes=await pdf.save();finishDownload(app,bytes,`Interacao_UNISAPIENS_2026_${safeName(periodo)}_${safeName(formato)}.pdf`,!!sig,store);
    }catch(err){console.error(err);error.textContent=`Erro ao gerar PDF: ${err.message||'falha inesperada'}`;error.hidden=false;}finally{btn.disabled=false;label.textContent='Gerar PDF';spinner.hidden=true;}
  });
}
