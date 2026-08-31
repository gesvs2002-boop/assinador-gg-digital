import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const $ = (id) => document.getElementById(id);
const panels = [...document.querySelectorAll('[data-step-panel]')];
const pills = [...document.querySelectorAll('[data-step-pill]')];
let step = 1;
let drawing = false;
let hasSignature = false;
let lastPoint = null;
let generatedUrl = null;
const canvas = $('signatureCanvas');
const ctx = canvas.getContext('2d', { alpha: true });

function makeInputs(containerId, prefix, count) {
  const el = $(containerId);
  for (let i = 1; i <= count; i++) {
    const label = document.createElement('label');
    label.innerHTML = `<b>${i}</b><input id="${prefix}${i}" maxlength="90" placeholder="Nome completo do(a) atleta" />`;
    el.appendChild(label);
  }
}
makeInputs('caboList','cabo',15);
makeInputs('queimadaList','queimada',15);
makeInputs('pranchaList','prancha',5);
makeInputs('cordaList','corda',5);

function onlyDigits(v=''){return v.replace(/\D/g,'')}
function formatPhone(value){const d=onlyDigits(value).slice(0,11);if(d.length<=10)return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')}
$('telefoneLider').addEventListener('input',e=>e.target.value=formatPhone(e.target.value));

function ensino(){return document.querySelector('input[name="ensino"]:checked')?.value || ''}
function showStep(n){step=n;panels.forEach(p=>{const a=Number(p.dataset.stepPanel)===n;p.hidden=!a;p.classList.toggle('is-active',a)});pills.forEach(p=>{const x=Number(p.dataset.stepPill);p.classList.toggle('is-active',x===n);p.classList.toggle('is-done',x<n)});if(n===3){syncSummary();requestAnimationFrame(resizeCanvas)}window.scrollTo({top:0,behavior:'smooth'})}
function validateStep1(){let ok=true;['periodo','lider','telefoneLider'].forEach(id=>{const e=$(id);const v=e.value.trim()!=='';e.classList.toggle('invalid',!v);if(!v)ok=false});if(!ensino())ok=false;if(!ok){$('errorBox') && ($('errorBox').hidden=true);document.querySelector('.invalid')?.focus();}return ok}
document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.next);if(step===1&&!validateStep1())return;showStep(n)}));
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.back))));

function values(prefix,count){return Array.from({length:count},(_,i)=>$(`${prefix}${i+1}`).value.trim()).filter(Boolean)}
function syncSummary(){const c=values('cabo',15),q=values('queimada',15),p=values('prancha',5),co=values('corda',5);$('summary').innerHTML=`<p><b>Turma:</b> ${$('periodo').value} • ${ensino()}${$('turmaId').value?` • ${$('turmaId').value}`:''}</p><p><b>Líder:</b> ${$('lider').value} • ${$('telefoneLider').value}</p><p><b>Inscritos:</b> Cabo de Guerra ${c.length}/15 • Queimada ${q.length}/15 • Prancha ${p.length}/5 • Pula Corda ${co.length}/5</p><p><b>Total de inscrições em provas:</b> ${c.length+q.length+p.length+co.length}</p>`}

function resizeCanvas(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const snap=hasSignature?canvas.toDataURL('image/png'):null;const dpr=Math.max(1,Math.min(devicePixelRatio||1,2));canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';ctx.lineWidth=2.5;if(snap){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,r.width,r.height);img.src=snap}}
function pt(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;lastPoint=pt(e);canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pt(e);ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(p.x,p.y);ctx.stroke();lastPoint=p;hasSignature=true;$('signHint').hidden=true});
['pointerup','pointercancel','pointerleave'].forEach(ev=>canvas.addEventListener(ev,e=>{if(!drawing)return;e.preventDefault();drawing=false;lastPoint=null}));
window.addEventListener('resize',()=>{if(step===3)resizeCanvas()});
$('clearSignature').addEventListener('click',()=>{const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);hasSignature=false;$('signHint').hidden=false});

function trimCanvas(){if(!hasSignature)return null;const w=canvas.width,h=canvas.height,c=canvas.getContext('2d'),px=c.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(px[(y*w+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}if(maxX<0)return null;const pad=10;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out.toDataURL('image/png')}
function dataUrlBytes(url){const bin=atob(url.split(',')[1]);const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b}
function safeName(s){return(s||'Turma').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)}

const BLUE=rgb(0.05,0.26,0.44), ORANGE=rgb(0.96,0.58,0.05), INK=rgb(0.06,0.08,0.12), MUTED=rgb(0.37,0.43,0.5), LINE=rgb(0.82,0.85,0.89), SOFT=rgb(0.96,0.97,0.98);
function wrap(font,text,size,width){const words=String(text).split(/\s+/);const lines=[];let line='';for(const w of words){const t=line?`${line} ${w}`:w;if(font.widthOfTextAtSize(t,size)<=width)line=t;else{if(line)lines.push(line);line=w}}if(line)lines.push(line);return lines}
function text(page,font,str,x,y,size=10,color=INK){page.drawText(String(str||''),{x,y,size,font,color})}
function ruleText(page,font,bold,str,num,x,y,width,size=8.4){const prefix=`${num}. `;const lines=wrap(font,prefix+str,size,width);lines.forEach((l,i)=>text(page,i===0?bold:font,l,x,y-i*(size+3),size,INK));return y-lines.length*(size+3)-3}
function header(page,bold,font){page.drawRectangle({x:0,y:752,width:612,height:40,color:BLUE});text(page,bold,'INTERAÇÃO UNISAPIENS 2026',24,770,12,rgb(1,1,1));text(page,font,'Educação Física • Atlética Anabólica',410,771,7.5,rgb(.9,.94,1));text(page,bold,'INTERAÇÃO UNISAPIENS 2026',24,716,23,BLUE);text(page,bold,'EDUCAÇÃO FÍSICA • FICHA DE INSCRIÇÃO',24,697,10,ORANGE);page.drawLine({start:{x:24,y:686},end:{x:588,y:686},thickness:1,color:LINE})}
function footer(page,font,pageNo){page.drawLine({start:{x:24,y:34},end:{x:588,y:34},thickness:.8,color:LINE});text(page,font,'Assinador GG Digital • Interação UNISAPIENS 2026',24,20,7.5,MUTED);text(page,font,`Página ${pageNo} de 4`,535,20,7.5,MUTED)}
function fieldLine(page,bold,font,label,value,x,y,w){text(page,bold,label,x,y,8.5,INK);page.drawLine({start:{x:x+75,y:y-2},end:{x:x+w,y:y-2},thickness:.8,color:LINE});text(page,font,value,x+78,y,9,INK)}
function turmaLine(page,bold,font){text(page,bold,`Turma: ${$('periodo').value} • ${ensino()}${$('turmaId').value?` • ${$('turmaId').value}`:''}`,24,652,9,INK)}
function athleteTable(page,bold,font,title,names,startY,rows=15){text(page,bold,title,24,startY+28,16,BLUE);page.drawRectangle({x:24,y:startY-rows*28,width:564,height:rows*28+22,borderColor:LINE,borderWidth:1});page.drawRectangle({x:24,y:startY,width:564,height:22,color:SOFT});text(page,bold,'Nº',34,startY+7,8,INK);text(page,bold,'NOME COMPLETO DO(A) ATLETA',75,startY+7,8,INK);page.drawLine({start:{x:62,y:startY-rows*28},end:{x:62,y:startY+22},thickness:.8,color:LINE});for(let i=0;i<rows;i++){const y=startY-(i+1)*28;page.drawLine({start:{x:24,y},end:{x:588,y},thickness:.6,color:LINE});text(page,font,String(i+1),41,y+10,8,INK);if(names[i])text(page,font,names[i],75,y+10,9,INK)}}

async function generatePdf(){const err=$('errorBox');err.hidden=true;if(!validateStep1()){showStep(1);return}const btn=$('generatePdf'),label=btn.querySelector('.btn-label'),spinner=btn.querySelector('.spinner');btn.disabled=true;label.textContent='Gerando PDF...';spinner.hidden=false;try{const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const pages=Array.from({length:4},()=>pdf.addPage([612,792]));pages.forEach((p,i)=>{header(p,bold,font);footer(p,font,i+1)});
  const p1=pages[0];text(p1,bold,'IDENTIFICAÇÃO DA TURMA',24,660,11,BLUE);fieldLine(p1,bold,font,'Período:',$('periodo').value,24,635,230);fieldLine(p1,bold,font,'Ensino:',ensino(),310,635,260);fieldLine(p1,bold,font,'Líder da sala:',$('lider').value,24,606,260);fieldLine(p1,bold,font,'Telefone:',$('telefoneLider').value,310,606,260);fieldLine(p1,bold,font,'Turma/identificação:',$('turmaId').value||'—',24,577,546);text(p1,bold,'Curso:',24,548,8.5);text(p1,font,'Educação Física',102,548,9);
  text(p1,bold,'REGULAMENTO RESUMIDO',24,510,11,BLUE);let y=486;y=ruleText(p1,font,bold,'O Interação UNISAPIENS tem caráter integrativo e competitivo entre as turmas/períodos do curso de Educação Física, nas modalidades Cabo de Guerra, Prancha, Pula Corda e Queimada.',1,24,y,556);y=ruleText(p1,font,bold,'Cada atleta deverá representar exclusivamente a sua própria turma, identificada pelo período e pela modalidade de ensino (Presencial ou Semipresencial). É proibida a participação de aluno por outra turma.',2,24,y,556);y=ruleText(p1,font,bold,'A classificação de cada modalidade atribuirá pontos à turma: 1º lugar = 10 pontos; 2º lugar = 7 pontos; 3º lugar = 5 pontos.',3,24,y,556);y=ruleText(p1,font,bold,'A classificação geral será definida pela soma dos pontos obtidos pela turma nas quatro modalidades.',4,24,y,556);y=ruleText(p1,font,bold,'Em caso de empate na pontuação geral, terá vantagem a turma com maior número de 1º lugares; persistindo o empate, serão considerados, nesta ordem, os números de 2º e 3º lugares.',5,24,y,556);y=ruleText(p1,font,bold,'Os participantes deverão respeitar as orientações da organização, arbitragem e normas de segurança de cada prova. Condutas antidesportivas poderão resultar em advertência ou desclassificação da modalidade.',6,24,y,556);pageScore(p1,bold,font,24,96);
  const cabo=values('cabo',15),queimada=values('queimada',15),prancha=values('prancha',5),corda=values('corda',5);turmaLine(pages[1],bold,font);athleteTable(pages[1],bold,font,'CABO DE GUERRA',cabo,600,15);turmaLine(pages[2],bold,font);athleteTable(pages[2],bold,font,'QUEIMADA',queimada,600,15);
  const p4=pages[3];turmaLine(p4,bold,font);athleteTable(p4,bold,font,'PRANCHA',prancha,590,5);athleteTable(p4,bold,font,'PULA CORDA',corda,405,5);text(p4,bold,'CONTROLE DE PONTUAÇÃO DA TURMA',24,228,10,BLUE);scoreTable(p4,bold,font,24,205);text(p4,bold,'DECLARAÇÃO DO LÍDER DE SALA',24,108,9,BLUE);const decl='Declaro que os atletas inscritos nesta ficha pertencem à turma identificada e estão cientes das regras resumidas do Interação UNISAPIENS 2026.';wrap(font,decl,7.5,560).forEach((l,i)=>text(p4,font,l,24,94-i*10,7.5,INK));p4.drawLine({start:{x:55,y:50},end:{x:275,y:50},thickness:.8,color:INK});text(p4,font,'Assinatura do líder de sala',96,39,7.5,MUTED);p4.drawLine({start:{x:340,y:50},end:{x:560,y:50},thickness:.8,color:INK});text(p4,font,'Recebido pela organização',388,39,7.5,MUTED);
  const sigUrl=trimCanvas();if(sigUrl){const sig=await pdf.embedPng(dataUrlBytes(sigUrl));const ratio=sig.width/sig.height;let w=190,h=w/ratio;if(h>34){h=34;w=h*ratio}p4.drawImage(sig,{x:70+(190-w)/2,y:52,width:w,height:h})}
  const bytes=await pdf.save();const blob=new Blob([bytes],{type:'application/pdf'});if(generatedUrl)URL.revokeObjectURL(generatedUrl);generatedUrl=URL.createObjectURL(blob);const filename=`Interacao_UNISAPIENS_2026_${safeName($('periodo').value)}_${safeName(ensino())}.pdf`;const dl=$('downloadAgain');dl.href=generatedUrl;dl.download=filename;$('successCard').hidden=false;const a=document.createElement('a');a.href=generatedUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();$('successCard').scrollIntoView({behavior:'smooth',block:'center'});
}catch(e){console.error(e);err.textContent=`Erro ao gerar PDF: ${e.message||'falha inesperada'}`;err.hidden=false}finally{btn.disabled=false;label.textContent='Gerar ficha em PDF';spinner.hidden=true}}
function pageScore(page,bold,font,x,y){page.drawRectangle({x,y,width:564,height:44,color:SOFT,borderColor:LINE,borderWidth:1});text(page,bold,'PONTUAÇÃO POR MODALIDADE',x+12,y+28,8.5,INK);text(page,bold,'1º = 10 pts',x+250,y+28,8.5,BLUE);text(page,bold,'2º = 7 pts',x+350,y+28,8.5,BLUE);text(page,bold,'3º = 5 pts',x+440,y+28,8.5,BLUE);text(page,font,'A inscrição vincula o atleta à turma identificada acima.',x+12,y+10,7.5,MUTED)}
function scoreTable(page,bold,font,x,y){const cols=[0,250,390,564];const h=20;page.drawRectangle({x,y:y-h*5,width:564,height:h*5,borderColor:LINE,borderWidth:1});for(let i=1;i<5;i++)page.drawLine({start:{x,y:y-i*h},end:{x:x+564,y:y-i*h},thickness:.6,color:LINE});cols.slice(1,-1).forEach(c=>page.drawLine({start:{x:x+c,y:y-h*5},end:{x:x+c,y},thickness:.6,color:LINE}));page.drawRectangle({x,y:y-h,width:564,height:h,color:SOFT});text(page,bold,'Modalidade',x+8,y-14,7.5);text(page,bold,'Colocação',x+258,y-14,7.5);text(page,bold,'Pontos',x+400,y-14,7.5);['Cabo de Guerra','Prancha','Pula Corda','Queimada'].forEach((m,i)=>text(page,font,m,x+8,y-h*(i+2)+6,7.5));}
$('generatePdf').addEventListener('click',generatePdf);$('downloadAgain').addEventListener('click',e=>{if(!generatedUrl)e.preventDefault()});showStep(1);