const {createRequire}=require('module');
const req=createRequire('D:/LocalVersions/OpenNetWorth/package.json');
const fs=require('fs'),path=require('path'),ts=req('typescript'),assert=require('assert/strict');
process.env.NODE_ENV='test';process.env.PYTHONDONTWRITEBYTECODE='1';process.env.TEMP=__dirname;process.env.TMP=__dirname;
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const repo='D:/LocalVersions/OpenNetWorth',pack=repo+'/samples/Australian_Finance_Test_Pack_v1';
const domain=n=>require(repo+'/src/lib/domain/'+n+'.ts');
const {createTestDb}=require(repo+'/src/infrastructure/sqlite/db.ts');
const {initAccountingSchema}=domain('accounting/schema');
const {createEntity,createAccount}=domain('accounting/accountService');
const d=domain('document/documentInboxService');
const results=[];
const map={id:'assessor-map',name:'AU fixture',header_signature:'amount|date|description',date_column:'Date',date_format:'DD/MM/YYYY',description_column:'Description',amount_mode:'single_amount',amount_column:'Amount'};
const read=f=>fs.readFileSync(path.join(pack,f),'utf8').replace(/^\uFEFF/,'');
function setup(){const db=createTestDb();initAccountingSchema(db);return db;}
function ent(db,name='Household',currency='AUD'){return createEntity(db,{name,type:name==='Company'?'business':'household',currency});}
function acc(db,e,name='Checking',opening=100000,currency='AUD',type='asset',sub_type='checking'){return createAccount(db,{entity_id:e.id,name,type,sub_type,currency,opening_balance_cents:opening,opening_date:'2025-06-30'}).account;}
function ingest(db,a,f,extra={}){return d.ingestCsvDocument(db,{filename:path.basename(f),raw_content:read(f),mapping:map,target_account_id:a.id,default_category:'office_supplies',...extra});}
function approve(db,a,r,extra={}){return d.approveProposals(db,{document_id:r.document.id,target_account_id:a.id,entity_id:a.entity_id,items:r.proposals.map(p=>({proposal_id:p.id,category:p.description.includes('Broadband')?'utilities':'office_supplies',...extra}))});}
function counts(db){return {transactions:db.prepare('select count(*) n from m1_transactions').get().n,postings:db.prepare('select count(*) n from m1_journal_entries').get().n};}
function balance(db,a){return db.prepare('select coalesce(sum(amount_cents),0) n from m1_journal_entries where account_id=?').get(a.id).n;}
async function pdf(db,a,f){return await d.ingestPdfDocument(db,{filename:f,file_buffer:fs.readFileSync(pack+'/03_documents/'+f),target_account_id:a.id,entity_id:a.entity_id,default_category:'office_supplies'});}
function attempt(fn){try{return {accepted:true,result:fn()};}catch(e){return {accepted:false,error:e.message};}}
async function test(name,fn){try{const observed=await fn();results.push({name,status:'OBSERVED',observed});console.log(name,JSON.stringify(observed));}catch(e){results.push({name,status:'PROBE_ERROR',error:e.stack});console.log(name,e.stack);}}
(async()=>{
await test('same_key_financial_and_material_conflicts',()=>{const db=setup(),e=ent(db),a=acc(db,e),b=acc(db,e,'Second',0);const r=ingest(db,a,'01_start_here/household_simple_expenses.csv');const ids=approve(db,a,r).transaction_ids;const tx=db.prepare('select * from m1_transactions where id=?').get(ids[0]);const postings=db.prepare('select account_id,amount_cents,currency,memo from m1_journal_entries where transaction_id=?').all(tx.id);const input={date:tx.date,description:tx.description,payee_or_payer:tx.payee_or_payer,origin:tx.origin,idempotency_key:tx.idempotency_key,evidence_refs:JSON.parse(tx.evidence_refs),postings};const post=domain('accounting/transactionService').postTransaction;const before=counts(db),out=[];for(const [name,change] of [['amount',{postings:postings.map(p=>({...p,amount_cents:p.amount_cents<0?-2300:2300}))}],['date',{date:'2025-07-04'}],['description',{description:'Different purchase'}],['payee',{payee_or_payer:'Different supplier'}],['account',{postings:postings.map(p=>({...p,account_id:p.account_id===a.id?b.id:p.account_id}))}],['currency',{postings:postings.map(p=>({...p,currency:'USD'}))}]]){const result=attempt(()=>post(db,{...input,...change}));assert.equal(result.accepted,false);out.push({name,...result});}assert.deepEqual(counts(db),before);const alteredEvidence=[{document_id:'assessor-new-source',content_hash:'new-hash'}];const retry=post(db,{...input,evidence_refs:alteredEvidence});const stored=db.prepare('select evidence_refs from m1_transactions where id=?').get(tx.id).evidence_refs;assert.equal(retry.id,tx.id);assert.equal(stored,tx.evidence_refs);assert.deepEqual(counts(db),before);db.close();return {conflicts:out,evidence_only_retry_same_id:true,old_evidence_preserved:true,new_evidence_merged:false,counts_unchanged:true};});
fs.writeFileSync(path.join(__dirname,'idempotency_results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
