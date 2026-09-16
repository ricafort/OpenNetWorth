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
await test('account_edit_synchronizes_entity',async()=>{const db=setup(),h=ent(db),c=ent(db,'Company'),a=acc(db,h),b=acc(db,c);const r=await pdf(db,b,'receipt_office_supplies_22.pdf');const p=d.updateProposalReview(db,{proposal_id:r.proposals[0].id,account_id:a.id});assert.equal(p.entity_id,h.id);assert.equal(p.account_id,a.id);db.close();return {entity_matches:true,account_matches:true};});
await test('duplicate_decision_variants',()=>{const out=[];for(const flag of [undefined,false,true,'false']){const db=setup(),e=ent(db),a=acc(db,e);approve(db,a,ingest(db,a,'01_start_here/household_simple_expenses.csv'));const r=ingest(db,a,'05_edge_cases/overlap_with_starter.csv');out.push({flag:flag===undefined?'omitted':flag,flag_type:typeof flag,result:attempt(()=>approve(db,a,r,{duplicate_confirmed:flag})),balance:balance(db,a)});db.close();}return out;});
await test('legitimate_identical_explicit_decision',()=>{const db=setup(),e=ent(db),a=acc(db,e);const r=ingest(db,a,'05_edge_cases/legitimate_same_day_same_amount.csv');const result=approve(db,a,r,{duplicate_confirmed:true});assert.equal(result.approved_count,2);assert.equal(balance(db,a),98300);db.close();return {both_preserved:true,balance:98300};});
await test('evidence_normalization',async()=>{const db=setup(),e=ent(db),a=acc(db,e);const r=ingest(db,a,'01_start_here/household_simple_expenses.csv');approve(db,a,r);const p=await pdf(db,a,'receipt_office_supplies_22.pdf');const candidate=d.getCandidateTransactionsForProposal(db,p.proposals[0].id)[0];d.linkProposalToTransaction(db,{proposal_id:p.proposals[0].id,transaction_id:candidate.id});const report=domain('accounting/balanceService').getAccountLedgerDrilldown(db,{account_id:a.id});db.close();return report;});
fs.writeFileSync(path.join(__dirname,'focused_results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
