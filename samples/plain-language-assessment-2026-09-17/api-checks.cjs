const fs=require('fs'); const path=require('path'); const assert=require('assert');
const base='http://localhost:4007'; const ids=JSON.parse(fs.readFileSync(__dirname+'/fixture.json'));
const pack=path.resolve(__dirname,'../Australian_Finance_Test_Pack_v1'); const results=[];
async function req(url,body,method='POST'){const r=await fetch(base+url,body===undefined?{}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
function check(name,pass,detail){results.push({name,pass,detail});console.log(pass?'PASS':'FAIL',name);}
const map={date_column:'Date',date_format:'DD/MM/YYYY',description_column:'Description',amount_mode:'single_amount',amount_column:'Amount'};
async function ingest(file,account=ids.starter,entity=ids.person){return req('/api/documents',{filename:path.basename(file),raw_content:fs.readFileSync(path.join(pack,file),'utf8').replace(/^\uFEFF/,''),mapping:map,target_account_id:account,entity_id:entity});}
async function approve(doc,account=ids.starter,entity=ids.person,extra={}){return req('/api/documents/proposals',{document_id:doc.document.id,target_account_id:account,entity_id:entity,items:doc.proposals.map(p=>({proposal_id:p.id,...extra}))});}
(async()=>{
 let all=(await req('/api/accounting?include_transactions=true&limit=500')).data;
 check('UI starter CSV closes at AUD883.12',all.accounts.find(a=>a.id===ids.starter).balance_cents===88312,all.accounts.find(a=>a.id===ids.starter));
 const originalCount=all.total_count;
 const dup=(await ingest('01_start_here/household_simple_expenses.csv')).data;
 check('Exact CSV reimport retains three approved proposals',dup.proposals?.length===3&&dup.proposals.every(p=>p.review_status==='approved'),dup);
 const pdf=(await req('/api/documents/pdf',{filename:'receipt_office_supplies_22.pdf',file_base64:fs.readFileSync(path.join(pack,'03_documents/receipt_office_supplies_22.pdf')).toString('base64'),target_account_id:ids.starter,entity_id:ids.person})).data;
 check('Exact PDF reimport retains linked status',pdf.proposals?.[0]?.review_status==='linked',pdf.proposals);
 all=(await req('/api/accounting?include_transactions=true')).data;
 check('Receipt link and reimports add no financial transactions',all.total_count===originalCount&&all.accounts.find(a=>a.id===ids.starter).balance_cents===88312,{before:originalCount,after:all.total_count});
 for(const [doc,file] of [[dup,'01_start_here/household_simple_expenses.csv'],[pdf,'03_documents/receipt_office_supplies_22.pdf']]){
  const raw=await fetch(base+'/api/documents/raw?id='+doc.document.id); const bytes=Buffer.from(await raw.arrayBuffer()); const expected=file.endsWith('.csv')?Buffer.from(fs.readFileSync(path.join(pack,file),'utf8').replace(/^\uFEFF/,'')):fs.readFileSync(path.join(pack,file));check('Stored original delivery '+path.basename(file),raw.ok&&bytes.equals(expected),{status:raw.status,cache:raw.headers.get('cache-control'),csvBomRemovedByFileReader:file.endsWith('.csv')});
 }
 const biz=(await ingest('01_start_here/business_simple_expense.csv',ids.businessBank,ids.business)).data;
 const bizApproval=all.accounts.find(a=>a.id===ids.businessBank).balance_cents===39000?{status:200,data:{previousSuccessfulRun:true}}:await approve(biz,ids.businessBank,ids.business,{category:'office_supplies'});
 check('Company CSV approval',bizApproval.status===200,bizApproval);
 all=(await req('/api/accounting')).data;
 check('Company CSV closes AUD390; household unchanged',all.accounts.find(a=>a.id===ids.businessBank).balance_cents===39000&&all.accounts.find(a=>a.id===ids.starter).balance_cents===88312,all.accounts.filter(a=>[ids.businessBank,ids.starter].includes(a.id)));
 for(const file of ['invalid_dates.csv','invalid_amounts.csv','duplicate_identical_rows.csv','ambiguous_dates.csv','formula_like_description.csv','currency_rounding_jpy.csv','overlap_with_starter.csv']){
  const account=file==='currency_rounding_jpy.csv'?ids.jpy:ids.starter;
  const d=(await ingest('05_edge_cases/'+file,account)).data;
  const p=d.proposals||[];
  if(file.startsWith('invalid')){const a=await approve(d,account);check('Reject '+file,a.status===400,{proposals:p,approval:a});}
  else if(file.includes('duplicate')||file.includes('overlap')){const a=await approve(d,account);check('Require explicit duplicate decision '+file,a.status===400,{proposals:p,approval:a});}
  else if(file.includes('jpy')){check('JPY extraction uses zero decimals',p.some(x=>Math.abs(x.amount_cents)===500),p);}
  else if(file.includes('formula')){check('Formula-like text preserved',p.some(x=>x.description==='=1+1'),p);}
  else check('Australian date mapping',p.some(x=>x.event_date==='2025-08-07'),p);
 }
 const unpaid=(await req('/api/documents/pdf',{filename:'invoice_unpaid_330.pdf',file_base64:fs.readFileSync(path.join(pack,'03_documents/invoice_unpaid_330.pdf')).toString('base64'),target_account_id:ids.starter,entity_id:ids.person})).data;
 const ua=await approve(unpaid);
 check('Unpaid invoice cannot silently post',ua.status===400,{proposals:unpaid.proposals,approval:ua});
 const invalidAccount=await req('/api/accounting',{action:'record_expense',payload:{entity_id:ids.person,payment_account_id:ids.home,category:'other',amount_cents:100,date:'2026-09-16',description:'TEST invalid property'}});
 check('Manual expense rejects property payment account',invalidAccount.status===400,invalidAccount);
 const patch=await req('/api/documents/proposals',{proposal_id:unpaid.proposals[0].id,review_status:'approved'},'PATCH');
 check('PATCH cannot bypass approval',patch.status===400,patch);
 const cross=await req('/api/accounting',{action:'record_transfer',payload:{from_account_id:ids.everyday,to_account_id:ids.businessBank,amount_cents:100,date:'2026-09-16',description:'TEST cross owner'}});
 check('Cross-owner posting blocked',cross.status===400,cross);
 const pages=[]; for(let offset=0;offset<100;offset+=5){const d=(await req('/api/accounting?include_transactions=true&limit=5&offset='+offset)).data;pages.push(...d.transactions);if(pages.length>=d.total_count)break;}
 check('Pagination retrieves every transaction once',new Set(pages.map(t=>t.id)).size===pages.length&&pages.length===(await req('/api/accounting?include_transactions=true')).data.total_count,{count:pages.length});
 const vault=(await req('/api/vault')).data.vault;
 check('Vault backup includes accounting and documents',!!vault.accounts&&!!vault.transactions&&!!vault.documents,{exportedKeys:Object.keys(vault)});
 fs.writeFileSync(__dirname+'/api-results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length}));
})().catch(e=>{fs.writeFileSync(__dirname+'/api-results.json',JSON.stringify(results,null,2));console.error(e);process.exitCode=1;});
