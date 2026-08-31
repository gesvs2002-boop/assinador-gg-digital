import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const MODELS = [
  {
    id: 'jomti-2026', icon: '🏅', title: 'JOMTI 2026', subtitle: 'Termo de Responsabilidade',
    description: 'Preencha os dados do atleta, leia o termo e gere o PDF no modelo oficial. Assinatura opcional.',
    pdfUrl: '/assets/JOMTI_2026_Termo_Responsabilidade.pdf', pages: 2,
    tags: ['Atleta', 'Termo', 'Assinatura opcional']
  },
  {
    id: 'interacao-unisapiens-2026', icon: '🏆', title: 'Interação UNISAPIENS 2026', subtitle: 'Ficha de Inscrição • Educação Física',
    description: 'Identifique a turma e inscreva atletas em Cabo de Guerra, Queimada, Prancha e Pula Corda.',
    pdfUrl: '/assets/Interacao_UNISAPIENS_2026_Ficha_Inscricao.pdf', pages: 4,
    tags: ['Turmas', 'Modalidades', 'Assinatura opcional']
  }
];

export const PDF = { PDFDocument, StandardFonts, rgb };
export const months = ['', 'janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

export function esc(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
export const onlyDigits = (v='') => v.replace(/\D/g,'');
export function formatCPF(v) {
  const d=onlyDigits(v).slice(0,11);
  return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
export function formatPhone(v) {
  const d=onlyDigits(v).slice(0,11);
  if(d.length<=10) return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');
  return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
}
export function isValidCPF(v) {
  const cpf=onlyDigits(v); if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf)) return false;
  let sum=0; for(let i=0;i<9;i++) sum+=Number(cpf[i])*(10-i); let d1=(sum*10)%11; if(d1===10)d1=0; if(d1!==Number(cpf[9]))return false;
  sum=0; for(let i=0;i<10;i++) sum+=Number(cpf[i])*(11-i); let d2=(sum*10)%11; if(d2===10)d2=0; return d2===Number(cpf[10]);
}
export function dateParts(iso='') { const [year='',month='',day='']=iso.split('-'); return {year,month,day}; }
export function formatDateBR(iso='') { if(!iso)return''; const {year,month,day}=dateParts(iso); return `${day}/${month}/${year}`; }
export function safeName(v='documento') {
  return String(v||'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'documento';
}
export function looksLikePdf(bytes) { return bytes?.length>5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d; }

export function modelHeader(model, steps) {
  return `<section class="model-hero">
    <div><span class="eyebrow">${esc(model.title)}</span><h1>${esc(model.subtitle)}</h1><p>${esc(model.description)}</p></div>
    <div class="model-actions"><button class="link-button" data-home type="button">← Modelos</button><a class="doc-link" href="${model.pdfUrl}" target="_blank" rel="noopener">Ver PDF original ↗</a></div>
  </section>
  <ol class="steps" aria-label="Etapas">${steps.map((s,i)=>`<li class="step ${i===0?'is-active':''}" data-step-pill="${i+1}"><span>${i+1}</span><div><strong>${esc(s[0])}</strong><small>${esc(s[1])}</small></div></li>`).join('')}</ol>`;
}
export function successHtml() {
  return `<section class="success-card" id="successCard" hidden><div class="success-icon">✓</div><div><span class="section-kicker">Documento pronto</span><h2>PDF gerado com sucesso</h2><p id="successText">O documento foi gerado.</p></div><div class="success-actions"><a class="btn btn-primary" id="downloadAgain" href="#" download>Baixar PDF novamente</a><button class="btn btn-ghost" data-home type="button">Voltar aos modelos</button></div></section>`;
}
export function signatureStep(label, note, withDate=false) {
  return `<section class="panel" data-step-panel="3" hidden>
    <div class="panel-head"><div><span class="section-kicker">Etapa 3 de 3</span><h2>Finalizar documento</h2></div><p>${esc(note)}</p></div>
    <div class="signature-card"><div class="signature-label"><strong>${esc(label)} <span class="optional">(opcional)</span></strong><span>No celular, use o dedo. No computador, use o mouse.</span></div><div class="canvas-wrap"><canvas id="signatureCanvas"></canvas><span class="sign-hint" id="signHint">✍️ Assine aqui, se desejar</span></div><div class="signature-tools"><button class="link-btn" id="clearSignature" type="button">Limpar assinatura</button></div></div>
    ${withDate?'<div class="date-row"><label class="field"><span>Data do termo *</span><input id="dataAssinatura" type="date" required /></label><div class="security-note"><span>🔒</span><div><strong>Geração local</strong><small>Os dados e a assinatura são processados neste dispositivo.</small></div></div></div>':'<div class="security-note standalone"><span>🔒</span><div><strong>Geração local</strong><small>Os dados e a assinatura são processados neste dispositivo.</small></div></div>'}
    <div id="errorBox" class="error-box" role="alert" hidden></div>
    <div class="actions"><button class="btn btn-ghost" type="button" data-back="2">← Voltar</button><button class="btn btn-primary btn-generate" id="generatePdf" type="button"><span class="btn-label">Gerar PDF</span><span class="spinner" hidden></span></button></div>
  </section>`;
}

export function createSignature(app) {
  const canvas=app.querySelector('#signatureCanvas'); if(!canvas) return {has:false,dataUrl:()=>null};
  const ctx=canvas.getContext('2d',{alpha:true}); let drawing=false, has=false, last=null;
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const snap=has?canvas.toDataURL('image/png'):null;const dpr=Math.max(1,Math.min(devicePixelRatio||1,2));canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';ctx.lineWidth=2.2;if(snap){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,r.width,r.height);img.src=snap;}}
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.quadraticCurveTo(last.x,last.y,(last.x+p.x)/2,(last.y+p.y)/2);ctx.stroke();last=p;has=true;app.querySelector('#signHint').hidden=true;});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>canvas.addEventListener(ev,e=>{if(!drawing)return;e.preventDefault();drawing=false;last=null;}));
  app.querySelector('#clearSignature')?.addEventListener('click',()=>{const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);has=false;app.querySelector('#signHint').hidden=false;});
  requestAnimationFrame(resize); window.addEventListener('resize',resize,{passive:true});
  function dataUrl(){if(!has)return null;const w=canvas.width,h=canvas.height,pixels=ctx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(pixels[(y*w+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}if(maxX<0)return null;const pad=10;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out.toDataURL('image/png');}
  return {get has(){return has;},dataUrl};
}
export function dataUrlBytes(url){const bin=atob(url.split(',')[1]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;}
export function fitSize(font,text,maxWidth,size=10,min=6.5){let s=size;while(s>min&&font.widthOfTextAtSize(text,s)>maxWidth)s-=.25;return s;}
export function drawText(page,font,text,x,y,maxWidth,size=9.5,min=6.5){if(!text)return;page.drawText(String(text),{x,y,size:fitSize(font,String(text),maxWidth,size,min),font,color:rgb(.03,.04,.07),maxWidth});}
export function drawSignature(page,png,box){if(!png)return;const ratio=png.width/png.height;let w=box.w,h=w/ratio;if(h>box.h){h=box.h;w=h*ratio;}page.drawImage(png,{x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,width:w,height:h});}
export async function loadTemplate(url,pages){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`Modelo PDF indisponível (HTTP ${r.status}).`);const bytes=new Uint8Array(await r.arrayBuffer());if(!looksLikePdf(bytes))throw new Error('O modelo carregado não é um PDF válido.');const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true});if(pdf.getPageCount()!==pages)throw new Error(`O modelo deveria ter ${pages} páginas.`);return pdf;}
export function finishDownload(app,bytes,filename,signed,store){if(!looksLikePdf(bytes))throw new Error('Falha de integridade: saída não é PDF.');if(store.url)URL.revokeObjectURL(store.url);const blob=new Blob([bytes],{type:'application/pdf'});store.url=URL.createObjectURL(blob);const dl=app.querySelector('#downloadAgain');dl.href=store.url;dl.download=filename;app.querySelector('#successText').textContent=signed?'O PDF foi gerado com os dados e a assinatura inseridos no modelo original.':'O PDF foi gerado com os dados preenchidos e o campo de assinatura em branco.';app.querySelector('#successCard').hidden=false;app.querySelector('#successCard').scrollIntoView({behavior:'smooth',block:'center'});const a=document.createElement('a');a.href=store.url;a.download=filename;document.body.appendChild(a);a.click();a.remove();}
