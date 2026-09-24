import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createJiefPdf } from '../src/jief-pdf.mjs';

test('ficha JIEF inclui duas modalidades e comporta o elenco máximo', async () => {
  const athleteId='e30b725e-0981-4df3-b51c-f69e6ccbb311';
  const entries=Array.from({length:15},(_,index)=>({
    athlete_id:index===0?athleteId:`e30b725e-0981-4df3-b51c-${String(index).padStart(12,'0')}`,
    name:`Atleta Exemplo ${index+1}`,origin:'__mesma_turma__',gender:'M'
  }));
  const bytes=await createJiefPdf({
    team:'Turma teste',teamName:'Equipe teste',leader:'Líder teste',phone:'(69) 99999-0000',
    rosters:[{id:'handebol_m',title:'Handebol masculino',note:'Até 15 atletas.',entries},
      {id:'talentos',title:'Show de talentos',note:'Uma apresentação por turma.',entries:[entries[0]]}]
  });
  assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
  const document=await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(),3);
  assert.equal(document.getTitle(),'JIEF 2026 — Equipe teste');
  if(process.env.JIEF_PDF_SMOKE_OUTPUT)await writeFile(process.env.JIEF_PDF_SMOKE_OUTPUT,bytes);
});
