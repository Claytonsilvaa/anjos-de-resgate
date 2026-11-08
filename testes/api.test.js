// Execute: node --test testes/api.test.cjs (Node.js 18 ou superior).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const fonte=fs.readFileSync(path.join(__dirname,'../js/script.js'),'utf8').split('// 2. COMUNICAÇÃO COM A API')[1].split('// 3. CATÁLOGO E ADOÇÃO')[0];
const animais=JSON.parse(fs.readFileSync(path.join(__dirname,'../api/animais.json'),'utf8'));
function ambiente(fetch, modo='mockapi') {
 const dados=new Map();
 const contexto=vm.createContext({CONFIG:{modo,apiBase:'https://exemplo.mockapi.io/api/v1/',arquivoAnimais:'api/animais.json'},fetch,
 AbortController,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,
 localStorage:{getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v)}});
 vm.runInContext(fonte+';globalThis.api=Api;',contexto); return {api:contexto.api,dados,contexto};
}
test('GET consulta endpoint e retorna dados',async()=>{
 const {api}=ambiente(async(url)=>{assert.equal(url,'https://exemplo.mockapi.io/api/v1/animais');return {ok:true,json:async()=>animais}});
 assert.equal((await api.listarAnimais()).length,3);
});
test('POST preserva relação animalId e retorna protocolo',async()=>{
 const {api}=ambiente(async(url,op)=>{assert.equal(url,'https://exemplo.mockapi.io/api/v1/adocoes');assert.equal(op.method,'POST');assert.equal(JSON.parse(op.body).animalId,'42');return {ok:true,json:async()=>({id:'99'})}});
 assert.equal((await api.salvarAdocao({animalId:'42'})).id,'99');
});
test('erro HTTP não grava no armazenamento local',async()=>{
 const {api,dados}=ambiente(async()=>({ok:false,status:500}));
 await assert.rejects(api.salvarAdocao({animalId:'42'}),/500/); assert.equal(dados.size,0);
});
test('falha de rede não vira sucesso',async()=>{
 const {api}=ambiente(async()=>{throw new Error('sem conexão')});
 await assert.rejects(api.listarAnimais(),/sem conexão/);
});
test('JSON inválido e IDs duplicados são rejeitados',async()=>{
 for(const dados of [{},[animais[0],animais[0]]]) {
  const {api}=ambiente(async()=>({ok:true,json:async()=>dados}));
  await assert.rejects(api.listarAnimais());
 }
});
test('POST sem ID de confirmação é rejeitado',async()=>{
 const {api}=ambiente(async()=>({ok:true,json:async()=>({})}));
 await assert.rejects(api.salvarAdocao({}),/confirmou/);
});
test('modo local lê JSON e persiste pedidos separados',async()=>{
 const {api,dados}=ambiente(async(url)=>{assert.equal(url,'api/animais.json');return {ok:true,json:async()=>animais}},'local');
 assert.equal((await api.listarAnimais())[1].nome,'LUNA');
 const a=await api.salvarAdocao({animalId:'luna'}), b=await api.salvarAdocao({animalId:'max'});
 assert.notEqual(a.id,b.id); assert.equal(JSON.parse(dados.values().next().value).length,2);
});
test('configuração vazia não envia requisição',async()=>{
 const {api,contexto}=ambiente(async()=>{assert.fail('não deveria chamar fetch')});contexto.CONFIG.apiBase='';
 await assert.rejects(api.listarAnimais(),/Preencha/);
});
test('armazenamento bloqueado é tratado como falha',async()=>{
 const {api,contexto}=ambiente(async()=>{},'local');contexto.localStorage.setItem=()=>{throw new Error('bloqueado')};
 await assert.rejects(api.salvarAdocao({}),/bloqueado/);
});
test('duplo clique usa dados.js sem chamar fetch',async()=>{
 const {api,contexto}=ambiente(async()=>{assert.fail('não deve usar fetch em file:')},'local');
 contexto.location={protocol:'file:'};contexto.animaisLocais=animais;
 assert.equal((await api.listarAnimais()).length,3);
});
