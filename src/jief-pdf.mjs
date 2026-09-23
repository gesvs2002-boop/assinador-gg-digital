import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PDF = { PDFDocument, StandardFonts, rgb };
const own = '__mesma_turma__';
const athleteCode = id => { if(!id)return 'SEM CÓDIGO'; const hex=String(id).replace(/-/g,'').toUpperCase(); return `JIEF-A${hex.slice(0,8)}${hex.slice(-8)}`; };

function wrap(font, text, size, maxWidth) {
  const words=String(text || '').split(/\s+/).filter(Boolean); const lines=[]; let line='';
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

export async function createJiefPdf(data) {
  const pdf=await PDF.PDFDocument.create();
  pdf.setTitle(`JIEF 2026 — ${data.teamName}`); pdf.setCreator('GG Inscrições • GG Digital');
  const fonts={regular:await pdf.embedFont(PDF.StandardFonts.Helvetica),bold:await pdf.embedFont(PDF.StandardFonts.HelveticaBold)};
  const size=[612,792]; const summary=pdf.addPage(size);
  header(summary,fonts,'Ficha de inscrição por turma','Jogos Internos de Educação Física • inscrição conduzida pelo líder da turma',data.teamName);
  lineField(summary,fonts,'Turma',data.team,40,614,258); lineField(summary,fonts,'Nome de guerra',data.teamName,314,614,258);
  lineField(summary,fonts,'Líder responsável',data.leader,40,570,344); lineField(summary,fonts,'Telefone',data.phone,400,570,172);
  summary.drawText('CONFERÊNCIA DA INSCRIÇÃO', {x:40,y:524,size:10,font:fonts.bold,color:PDF.rgb(.65,.22,.08)});
  const entered=data.rosters.filter(item=>item.entries.length);
  const uniqueAthletes=new Set(entered.flatMap(item=>item.entries.map(entry=>entry.athlete_id||entry.name))).size;
  summary.drawText(`${uniqueAthletes} ${uniqueAthletes===1?'atleta identificado':'atletas identificados'} em ${entered.length} ${entered.length===1?'modalidade':'modalidades'}`,{x:314,y:524,size:8,font:fonts.bold,color:PDF.rgb(.34,.38,.45),maxWidth:258});
  const summaryLines=entered.length ? entered.map(item=>`${item.title}: ${item.entries.length} ${item.entries.length===1?'inscrito':'inscritos'}`) : ['Nenhuma modalidade preenchida.'];
  summaryLines.forEach((line,index)=>{
    const column=Math.floor(index/11), y=500-(index%11)*18, x=44+column*264;
    summary.drawText('•',{x,y,size:8,font:fonts.bold,color:PDF.rgb(.15,.08,.05)});
    summary.drawText(line,{x:x+12,y,size:8,font:fonts.regular,color:PDF.rgb(.12,.16,.24),maxWidth:246});
  });
  summary.drawRectangle({x:40,y:154,width:532,height:104,color:PDF.rgb(.985,.97,.94),borderWidth:.7,borderColor:PDF.rgb(.89,.72,.54)});
  summary.drawText('DECLARAÇÃO DO LÍDER', {x:54,y:235,size:8.5,font:fonts.bold,color:PDF.rgb(.65,.22,.08)});
  drawParagraph(summary,fonts.regular,`Declaro que as informações desta ficha foram conferidas pela turma ${data.teamName}. Atletas inscritos como reforço foram informados com sua turma de origem. As regras técnicas, o regulamento completo e o termo individual de responsabilidade serão disponibilizados pela organização antes da competição.`,54,216,500,8.7,11);
  summary.drawText('Um código por atleta, válido em todas as modalidades. Pagamento conferido no painel.',{x:40,y:65,size:8,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
  summary.drawText('GG Inscrições • Ficha gerada com os dados registrados para conferência', {x:40,y:36,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});

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
      page.drawText(entry.name,{x:78,y:rowY-14,size:9,font:fonts.regular,color:PDF.rgb(.08,.1,.14),maxWidth:292});
      page.drawText(athleteCode(entry.athlete_id),{x:78,y:rowY-25,size:7,font:fonts.bold,color:PDF.rgb(.58,.29,.12)});
      page.drawText(entry.origin === own ? 'Mesma turma' : entry.origin,{x:382,y:rowY-16,size:8.2,font:fonts.regular,color:PDF.rgb(.08,.1,.14),maxWidth:model.mixed?118:180});
      if(model.mixed) page.drawText(entry.gender === 'F' ? 'Feminino' : 'Masculino',{x:510,y:rowY-16,size:8.2,font:fonts.regular,color:PDF.rgb(.08,.1,.14)});
      rowY-=32;
    });
    page.drawText('Reforço: atleta cuja turma de origem foi informada acima.',{x:40,y:50,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
    page.drawText('JIEF 2026 • Atlética Anabólica • Educação Física UNISAPIENS',{x:40,y:36,size:7.4,font:fonts.regular,color:PDF.rgb(.34,.38,.45)});
  });
  return pdf.save();
}
