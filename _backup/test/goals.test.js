import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function boot(){
 const el=()=>({children:[],style:{setProperty(){}},classList:{remove(){}},append(...c){this.children.push(...c)},replaceChildren(...c){this.children=c},setAttribute(){},focus(){},remove(){}});
 const nodes=new Map(['suivi-objectif','card-nicotine-objectif','liste-objectifs'].map(k=>[k,el()]));const saved=new Map();let celebrations=0;
 const ctx=vm.createContext({Date,objectifs:[{id:'old',titre:'0 mg/ml',date:'2020-01-01'}],configUser:{nicotineActuelle:6},localStorage:{setItem:(k,v)=>saved.set(k,v)},document:{createElement:el,getElementById:id=>nodes.get(id),addEventListener(){},body:el()},matchMedia:()=>({matches:true}),setInterval(){},setTimeout(){},MyVapeUI:{illustrerTexte(el,text){el.textContent=text;},toast(){celebrations++}},alert(){},mettreAJourTout(){vm.runInContext('MyVapeGoals.render()',ctx)}});
 vm.runInContext(readFileSync(new URL('../../objectifs.js',import.meta.url),'utf8'),ctx);vm.runInContext('MyVapeGoals.render()',ctx);
 return {ctx,nodes,saved,get celebrations(){return celebrations}};
}
test('overdue legacy goal remains actionable; zero target persists and celebrates exactly once',()=>{
 const t=boot(),card=t.nodes.get('suivi-objectif');assert.equal(card.hidden,false);assert.match(t.nodes.get('card-nicotine-objectif').textContent,/Faisons le point/);
 const yes=card.children.find(c=>c.textContent==='Oui, objectif atteint !');yes.onclick();yes.onclick();
 assert.equal(t.ctx.configUser.nicotineActuelle,0);assert.equal(t.ctx.objectifs[0].statut,'atteint');assert.equal(t.celebrations,1);assert.match(t.saved.get('vt_objectifs'),/atteintLe/);assert.match(t.nodes.get('liste-objectifs').children[0].children[0].textContent,/réussites/);
});
test('not yet and later preserve the pending goal and nicotine',()=>{
 const t=boot(),card=t.nodes.get('suivi-objectif');card.children.find(c=>c.textContent==='Pas encore').onclick();card.children.find(c=>c.textContent==='Plus tard').onclick();
 assert.equal(t.ctx.objectifs[0].statut,undefined);assert.equal(t.ctx.configUser.nicotineActuelle,6);assert.equal(card.hidden,false);
});
test('rescheduling preserves the target and persists the new deadline',()=>{
 const t=boot(),card=t.nodes.get('suivi-objectif');card.children.find(c=>c.textContent==='Pas encore').onclick();
 card.children.find(c=>c.children?.[0]?.type==='date').children[0].value='2099-01-01';
 card.children.find(c=>c.textContent==='Reporter l’objectif').onclick();
 assert.equal(t.ctx.objectifs[0].date,'2099-01-01');assert.equal(t.ctx.objectifs[0].titre,'0 mg/ml');assert.equal(card.hidden,true);assert.match(t.saved.get('vt_objectifs'),/2099-01-01/);
});
