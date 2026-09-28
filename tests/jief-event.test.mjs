import assert from 'node:assert/strict';
import test from 'node:test';
import { JIEF_2026 } from '../src/events/jief-2026.js';

test('JIEF expõe nove opções de modalidade, sem futebol society', () => {
  assert.deepEqual(JIEF_2026.modalities.map(item => item.id), [
    'futsal_m', 'futsal_f',
    'handebol_m', 'handebol_f', 'basquete_m', 'basquete_f',
    'volei_4x4', 'truco', 'talentos'
  ]);
  for (const id of ['basquete_m', 'basquete_f']) {
    const modality = JIEF_2026.modalities.find(item => item.id === id);
    assert.match(modality.title, /3x3/);
    assert.equal(modality.min, 3);
    assert.equal(modality.max, 4);
  }
  assert.deepEqual(JIEF_2026.scoring,{first:30,second:20,third:10,other:0,tieBreak:['first','second','third']});
});
