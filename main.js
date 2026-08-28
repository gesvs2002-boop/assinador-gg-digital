import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const FORM_URL = 'https://forms.gle/JR646h2VZHAkoMfr7';
const TEMPLATE_URL = '/assets/JOMTI_2026_Termo_Responsabilidade.pdf';
const $ = (id) => document.getElementById(id);
const panels = [...document.querySelectorAll('[data-step-panel]')];
const pills = [...document.querySelectorAll('[data-step-pill]')];
const requiredFields = ['nome','cpf','nascimento','endereco','telefone','modalidades','delegacao','emergenciaNome','parentesco','emergenciaTelefone'];
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

function onlyDigits(value='') { return value.replace(/\D/g, ''); }
function formatCPF(value) {
  const d = onlyDigits(value).slice(0,11);
  return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function formatPhone(value) {
  const d = onlyDigits(value).slice(0,11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');
  return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
}
function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i=0;i<9;i++) sum += Number(cpf[i])*(10-i);
  let d1=(sum*10)%11; if(d1===10)d1=0;
  if(d1!==Number(cpf[9])) return false;
  sum=0;
  for(let i=0;i<10;i++) sum += Number(cpf[i])*(11-i);
  let d2=(sum*10)%11; if(d2===10)d2=0;
  return d2===Number(cpf[10]);
}
function formatDateBR(iso) {
  if(!iso) return '';
  const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`;
}
function dateParts(iso) { const [year,month,day]=iso.split('-'); return {year,month,day}; }
const months=['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

$('cpf').addEventListener('input', e => e.target.value = formatCPF(e.target.value));
$('telefone').addEventListener('input', e => e.target.value = formatPhone(e.target.value));
$('emergenciaTelefone').addEventListener('input', e => e.target.value = formatPhone(e.target.value));

function validateStep1() {
  let ok=true;
  requiredFields.forEach(id => {
    const el=$(id); const valid=el.value.trim()!=='' && el.checkValidity();
    el.classList.toggle('invalid',!valid); if(!valid) ok=false;
  });
  if($('cpf').value && !isValidCPF($('cpf').value)){ $('cpf').classList.add('invalid'); ok=false; }
  if(!ok){ document.querySelector('.invalid')?.focus(); return false; }
  syncPreview(); return true;
}
function syncPreview(){
  const map={nome:$('nome').value,cpf:$('cpf').value,nascimento:formatDateBR($('nascimento').value),endereco:$('endereco').value,telefone:$('telefone').value};
  Object.entries(map).forEach(([k,v])=>document.querySelectorAll(`[data-preview="${k}"]`).forEach(el=>el.textContent=v||'—'));
}
function validateStep2(){
  if(!$('consentTerm').checked || !$('consentData').checked){ (!$('consentTerm').checked?$('consentTerm'):$('consentData')).focus(); return false; }
  return true;
}

document.querySelectorAll('[data-next]').forEach(btn=>btn.addEventListener('click',()=>{
  const next=Number(btn.dataset.next);
  if(currentStep===1 && !validateStep1()) return;
  if(currentStep===2 && !validateStep2()) return;
  showStep(next);
}));
document.querySelectorAll('[data-back]').forEach(btn=>btn.addEventListener('click',()=>showStep(Number(btn.dataset.back))));

function resizeCanvas(){
  const rect=canvas.getBoundingClientRect(); if(!rect.width||!rect.height) return;
  const snapshot=hasSignature?canvas.toDataURL('image/png'):null;
  const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,2));
  canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111827'; ctx.lineWidth=2.4;
  if(snapshot){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,rect.width,rect.height); img.src=snapshot; }
}
function pointFromEvent(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function startDraw(e){ e.preventDefault(); drawing=true; lastPoint=pointFromEvent(e); canvas.setPointerCapture?.(e.pointerId); }
function moveDraw(e){ if(!drawing)return; e.preventDefault(); const p=pointFromEvent(e); ctx.beginPath(); ctx.moveTo(lastPoint.x,lastPoint.y); ctx.lineTo(p.x,p.y); ctx.stroke(); lastPoint=p; hasSignature=true; $('signHint').hidden=true; }
function endDraw(e){ if(!drawing)return; e.preventDefault(); drawing=false; lastPoint=null; }
canvas.addEventListener('pointerdown',startDraw); canvas.addEventListener('pointermove',moveDraw); canvas.addEventListener('pointerup',endDraw); canvas.addEventListener('pointercancel',endDraw); canvas.addEventListener('pointerleave',endDraw);
window.addEventListener('resize',()=>{ if(currentStep===3) resizeCanvas(); });
$('clearSignature').addEventListener('click',()=>{ const r=canvas.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); hasSignature=false; $('signHint').hidden=false; });

function sanitizeFileName(value){ return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||'Atleta'; }
function canvasTrimmedDataUrl(sourceCanvas){
  const width=sourceCanvas.width,height=sourceCanvas.height,c=sourceCanvas.getContext('2d'),pixels=c.getImageData(0,0,width,height).data;
  let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){ const a=pixels[(y*width+x)*4+3]; if(a>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);} }
  if(maxX<0)return null;
  const pad=10; minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(width-1,maxX+pad);maxY=Math.min(height-1,maxY+pad);
  const out=document.createElement('canvas'); out.width=maxX-minX+1; out.height=maxY-minY+1; out.getContext('2d').drawImage(sourceCanvas,minX,minY,out.width,out.height,0,0,out.width,out.height); return out.toDataURL('image/png');
}
function dataUrlToUint8Array(dataUrl){ const bin=atob(dataUrl.split(',')[1]); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i); return bytes; }
function fitSize(font,text,maxWidth,preferred=10,min=6.5){ let size=preferred; while(size>min && font.widthOfTextAtSize(text,size)>maxWidth)size-=.25; return size; }
function drawTextInRect(page,font,text,rect,options={}){
  if(!text)return; const [x1,y1,x2,y2]=rect; const padX=options.padX??2; const maxWidth=(x2-x1)-(padX*2); const size=fitSize(font,text,maxWidth,options.size??9.5,options.minSize??6.5); const y=y1+Math.max(2.1,((y2-y1)-size)*.5+.8);
  page.drawText(text,{x:x1+padX,y,size,font,color:rgb(.04,.06,.09),maxWidth});
}
function looksLikePdf(bytes){ return bytes?.length>5 && bytes[0]===0x25 && bytes[1]===0x50 && bytes[2]===0x44 && bytes[3]===0x46 && bytes[4]===0x2d; }

async function generatePdf(){
  const error=$('errorBox'); error.hidden=true;
  if(!validateStep1()){showStep(1);return;} if(!validateStep2()){showStep(2);return;}
  if(!hasSignature){error.textContent='Faça sua assinatura no quadro antes de gerar o documento.';error.hidden=false;return;}
  if(!$('dataAssinatura').value){error.textContent='Informe a data da assinatura.';error.hidden=false;return;}
  const btn=$('generatePdf'),label=btn.querySelector('.btn-label'),spinner=btn.querySelector('.spinner');
  btn.disabled=true; label.textContent='Gerando PDF...'; spinner.hidden=false;
  try{
    const response=await fetch(TEMPLATE_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`Modelo PDF indisponível (HTTP ${response.status}).`);
    const templateBytes=new Uint8Array(await response.arrayBuffer());
    if(!looksLikePdf(templateBytes)) throw new Error('O modelo carregado não é um PDF válido.');
    const pdfDoc=await PDFDocument.load(templateBytes,{ignoreEncryption:true});
    const pages=pdfDoc.getPages(); if(pages.length<2) throw new Error('O modelo precisa ter 2 páginas.');
    const font=await pdfDoc.embedFont(StandardFonts.Helvetica); const [p1,p2]=pages;
    const n=dateParts($('nascimento').value),s=dateParts($('dataAssinatura').value);
    const v={nome:$('nome').value.trim(),cpf:$('cpf').value.trim(),endereco:$('endereco').value.trim(),telefone:$('telefone').value.trim(),modalidades:$('modalidades').value.trim(),delegacao:$('delegacao').value.trim(),emergenciaNome:$('emergenciaNome').value.trim(),parentesco:$('parentesco').value.trim(),emergenciaTelefone:$('emergenciaTelefone').value.trim()};
    drawTextInRect(p1,font,v.nome,[192,602,527,619.2],{size:10});
    drawTextInRect(p1,font,v.cpf,[129.5,588,305,604.3],{size:9.2});
    drawTextInRect(p1,font,n.day,[425.4,588,448,604.3],{size:9.2,padX:3});
    drawTextInRect(p1,font,n.month,[452.6,588,474.9,604.3],{size:9.2,padX:3});
    drawTextInRect(p1,font,n.year,[479.4,588,524,604.3],{size:9.2,padX:3});
    drawTextInRect(p1,font,v.endereco,[84.5,558,420,575],{size:9});
    drawTextInRect(p1,font,v.telefone,[84.5,543.5,260,560.3],{size:9.2});
    drawTextInRect(p2,font,String(Number(s.day)),[175,450,210,466.6],{size:10.2,padX:2});
    drawTextInRect(p2,font,months[Number(s.month)],[226.5,450,372,466.6],{size:10.2,padX:3});
    drawTextInRect(p2,font,v.nome,[178.5,400,511,417],{size:9.5});
    drawTextInRect(p2,font,v.cpf,[112.8,376,506,393.3],{size:9.5});
    drawTextInRect(p2,font,n.day,[200.4,352,233.8,369.7],{size:9.5,padX:3});
    drawTextInRect(p2,font,n.month,[237.7,352,271,369.7],{size:9.5,padX:3});
    drawTextInRect(p2,font,n.year,[274.9,352,341.5,369.7],{size:9.5,padX:3});
    drawTextInRect(p2,font,v.telefone,[138,329,509,346],{size:9.5});
    drawTextInRect(p2,font,v.modalidades,[168.2,305,512,322.4],{size:9.5});
    drawTextInRect(p2,font,v.delegacao,[191.3,281.5,518,298.7],{size:9.5});
    drawTextInRect(p2,font,v.emergenciaNome,[123.5,231.5,511,249],{size:9.5});
    drawTextInRect(p2,font,v.parentesco,[153.2,208,513,225.3],{size:9.5});
    drawTextInRect(p2,font,v.emergenciaTelefone,[138,184.5,509,201.7],{size:9.5});
    const sigData=canvasTrimmedDataUrl(canvas); if(!sigData)throw new Error('Assinatura vazia.');
    const sig=await pdfDoc.embedPng(dataUrlToUint8Array(sigData));
    const box={x:86,y:137,w:327,h:35}; const ratio=sig.width/sig.height; let w=box.w,h=w/ratio; if(h>box.h){h=box.h;w=h*ratio;} p2.drawImage(sig,{x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,width:w,height:h});
    const pdfBytes=await pdfDoc.save(); if(!looksLikePdf(pdfBytes)) throw new Error('Falha de integridade: saída não é PDF.');
    if(generatedUrl) URL.revokeObjectURL(generatedUrl);
    const blob=new Blob([pdfBytes],{type:'application/pdf'}); generatedUrl=URL.createObjectURL(blob);
    const filename=`JOMTI_2026_Termo_${sanitizeFileName(v.nome)}.pdf`;
    const dl=$('downloadAgain'); dl.href=generatedUrl; dl.download=filename;
    $('successCard').hidden=false; $('successCard').scrollIntoView({behavior:'smooth',block:'center'});
    const a=document.createElement('a'); a.href=generatedUrl; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  }catch(err){ console.error(err); error.textContent=`Erro ao gerar PDF: ${err.message||'falha inesperada'}`; error.hidden=false; }
  finally{ btn.disabled=false; label.textContent='Gerar termo assinado'; spinner.hidden=true; }
}
$('generatePdf').addEventListener('click',generatePdf);
$('dataAssinatura').valueAsDate=new Date();
$('downloadAgain').addEventListener('click',e=>{ if(!generatedUrl)e.preventDefault(); });
showStep(1);
