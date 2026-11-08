// Verifica funções e eventos com elementos simulados (não substitui teste visual).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function elemento(){
 const classes=new Set();
 return {value:'',textContent:'',innerHTML:'',dataset:{},style:{},children:[],
 classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,ativo){if(ativo)classes.add(v);else classes.delete(v)}},
 appendChild(v){this.children.push(v)},focus(){},reset(){},reportValidity(){return true},querySelector(){return this.link ||= elemento()}};
}
function ambiente(){
 const ids={};const eventos={};
 const c=vm.createContext({document:{getElementById(id){if(id==='importar')return null;return ids[id] ||= elemento()},querySelectorAll(){return []},createElement(){return elemento()},addEventListener(tipo,f){eventos[tipo]=f}},window:{scrollTo(){}},setTimeout,clearTimeout,CONFIG:{modo:'local'},Api:{async salvarAdocao(p){return {...p,id:'123'}}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/script.js'),'utf8'),c);
 vm.runInContext("BANCO_ANIMAIS=[{id:'1',nome:'MAX',sexo:'Macho',especie:'Cão',idadeCategoria:'Adulto',porte:'Médio',idadeMeses:36,foto:'img/Max.jpg'},{id:'2',nome:'LUNA',sexo:'Fêmea',especie:'Gato',idadeCategoria:'Filhote',porte:'Pequeno',idadeMeses:8,foto:'img/Luna.jpg'}]",c);
 c.Api=vm.runInContext('Api',c);
 return {c,ids,eventos};
}
test('ficha aceita ID numérico/string e abre o modal no padrão ativo/d-none',()=>{
 const {c,ids}=ambiente();c.abrirFichaPet(2);c.abrirModalAdocao();
 assert.equal(ids['modal-nome-pet'].textContent,'LUNA');
 assert.equal(ids['modal-adocao'].classList.contains('ativo'),true);
 assert.equal(ids['modal-form-step'].classList.contains('d-none'),false);
 assert.equal(ids['modal-sucesso-step'].classList.contains('d-none'),true);
});
test('formulário grava o animal selecionado e só depois mostra sucesso',async()=>{
 const {c,ids}=ambiente();c.abrirFichaPet('1');c.abrirModalAdocao();
 ids['nome-adotante'].value='Pessoa Teste';c.document.getElementById('telefone-adotante').value='11900000000';
 let recebido;c.Api.salvarAdocao=async p=>{recebido=p;return {id:'555'}};
 await c.confirmarSolicitacaoAdocao({preventDefault(){}});
 assert.equal(recebido.animalId,'1');
 assert.equal(ids['modal-form-step'].classList.contains('d-none'),true);
 assert.match(ids['sucesso-adocao'].textContent,/555/);
 c.abrirModalAdocao();assert.equal(ids['modal-form-step'].classList.contains('d-none'),false);
});
test('erro da API mantém formulário visível e botão habilitado',async()=>{
 const {c,ids}=ambiente();c.abrirFichaPet('1');c.abrirModalAdocao();
 ids['nome-adotante'].value='Pessoa Teste';c.document.getElementById('telefone-adotante').value='11900000000';
 c.Api.salvarAdocao=async()=>{throw new Error('erro de teste')};
 await c.confirmarSolicitacaoAdocao({preventDefault(){}});
 assert.equal(ids['modal-form-step'].classList.contains('d-none'),false);
 assert.equal(ids['modal-sucesso-step'].classList.contains('d-none'),true);
 assert.equal(ids['enviar-adocao'].disabled,false);
});
test('filtro e ordenação preservam padrão do exemplo',()=>{
 const {c}=ambiente();vm.runInContext("estadoFiltros.especie='Gato'",c);
 assert.equal(c.obterAnimaisFiltrados()[0].nome,'LUNA');
 vm.runInContext("estadoFiltros.especie='Ambas'; estadoFiltros.ordem='idade-asc'",c);
 assert.equal(c.obterAnimaisFiltrados()[0].nome,'LUNA');
});
test('texto externo é escapado e imagem javascript é bloqueada',()=>{
 const {c}=ambiente();assert.equal(c.escaparHtml('<script>'),'&lt;script&gt;');
 assert.equal(c.fotoPermitida('javascript:alert(1)'),'');
});
test('inicialização lê a API e monta catálogo; falha mostra mensagem',async()=>{
 const {c,ids,eventos}=ambiente();c.Api.listarAnimais=async()=>[];
 await eventos.DOMContentLoaded();assert.equal(ids['contador-topo'].textContent,0);
 c.Api.listarAnimais=async()=>{throw new Error('offline')};await c.carregarAnimais();
 assert.match(ids['aviso-catalogo'].textContent,/offline/);
});
