// Regras do JIEF isoladas da interface para que outras competições possam ter suas próprias configurações.
export const JIEF_2026 = {
  key: 'jief-2026',
  name: 'JIEF 2026',
  teams: [
    '1º período presencial', '1º período semipresencial',
    '2º período presencial', '2º período semipresencial',
    '3º período EAD', '4º período EAD', '5º período EAD', '6º período EAD'
  ],
  // Mínimos operacionais do piloto; conferir com o regulamento oficial antes da divulgação em massa.
  modalities: [
    { id:'futsal_m', title:'Futsal masculino', min:3, max:10, native:3, note:'Até 10 atletas.' },
    { id:'futsal_f', title:'Futsal feminino', min:3, max:10, native:3, note:'Até 10 atletas.' },
    { id:'society_m', title:'Futebol Society masculino', min:3, max:12, native:3, note:'Até 12 atletas.' },
    { id:'society_f', title:'Futebol Society feminino', min:3, max:12, native:3, note:'Até 12 atletas.' },
    { id:'handebol_m', title:'Handebol masculino', min:3, max:15, native:3, note:'Até 15 atletas.' },
    { id:'handebol_f', title:'Handebol feminino', min:3, max:15, native:3, note:'Até 15 atletas.' },
    { id:'basquete_m', title:'Basquete masculino', min:3, max:10, native:3, note:'Até 10 atletas. O formato poderá ser 5x5 ou 3x3 conforme a adesão.' },
    { id:'basquete_f', title:'Basquete feminino', min:3, max:10, native:3, note:'Até 10 atletas. O formato poderá ser 5x5 ou 3x3 conforme a adesão.' },
    { id:'volei_praia_m', title:'Vôlei de praia — dupla masculina', min:2, max:3, note:'Dupla titular e até 1 reserva.' },
    { id:'volei_praia_f', title:'Vôlei de praia — dupla feminina', min:2, max:3, note:'Dupla titular e até 1 reserva.' },
    { id:'volei_4x4', title:'Vôlei de praia 4x4 misto', min:4, max:7, native:3, mixed:true, note:'4 titulares e até 3 reservas. Os quatro primeiros devem ter 2 mulheres e 2 homens.' },
    { id:'futevolei_m', title:'Futevôlei — dupla masculina', min:2, max:3, note:'Dupla titular e até 1 reserva.' },
    { id:'futevolei_f', title:'Futevôlei — dupla feminina', min:2, max:3, note:'Dupla titular e até 1 reserva.' },
    { id:'tenis_m', title:'Tênis de mesa masculino', min:1, max:2, note:'1 titular e 1 reserva.' },
    { id:'tenis_f', title:'Tênis de mesa feminino', min:1, max:2, note:'1 titular e 1 reserva.' },
    { id:'truco', title:'Truco', min:2, max:3, note:'1 dupla e até 1 reserva.' },
    { id:'natacao_50_m', title:'Natação 50 m livre masculino', min:1, max:2, note:'1 titular e 1 reserva.' },
    { id:'natacao_50_f', title:'Natação 50 m livre feminino', min:1, max:2, note:'1 titular e 1 reserva.' },
    { id:'natacao_revezamento', title:'Natação 4x25 m misto', min:4, max:6, mixed:true, note:'4 titulares e até 2 reservas. Os quatro titulares devem ter 2 mulheres e 2 homens.' },
    { id:'corrida_m', title:'Corrida masculina', min:1, max:5, note:'Até 5 atletas.' },
    { id:'corrida_f', title:'Corrida feminina', min:1, max:5, note:'Até 5 atletas.' },
    { id:'talentos', title:'Show de talentos', min:1, max:10, note:'Uma apresentação por turma. Informe participantes ou responsável pela apresentação.' }
  ]
};
