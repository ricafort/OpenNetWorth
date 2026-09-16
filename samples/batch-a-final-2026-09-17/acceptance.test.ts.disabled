import {it,expect,afterEach} from 'vitest';
import fs from 'node:fs';
import {GET,POST} from '../../src/app/api/vault/route';
import {createTestDb,setTestDb} from '../../src/infrastructure/sqlite/db';
import {initAccountingSchema} from '../../src/lib/domain/accounting/schema';
import {saveDraft} from '../../src/lib/domain/accounting/draftService';
const snapshot=JSON.parse(fs.readFileSync('samples/batch-a-assessment-2026-09-17/archive.json','utf8'));
const original=snapshot.vault;
const dir='samples/batch-a-final-2026-09-17';
let db:any;
function setup(){db=createTestDb();initAccountingSchema(db);setTestDb(db);}
afterEach(()=>{setTestDb(null);db?.close();});
async function get(){return (await (await GET(new Request('http://test/api/vault'))).json()).vault;}
async function post(v:any,version=2){const res=await POST(new Request('http://test/api/vault',{method:'POST',body:JSON.stringify({action:'bulk_restore',schemaVersion:version,vault:v})}));return {status:res.status,body:await res.json()};}
function normalized(){const v=structuredClone(original);for(const t of v.transactions){if(t.evidence_refs){let refs=JSON.parse(t.evidence_refs);refs=refs.map((r:any)=>typeof r==='string'&&r.trim().startsWith('{')?JSON.parse(r):r);t.evidence_refs=JSON.stringify(refs);}}return v;}
function sort(v:any){return Object.fromEntries(Object.entries(v).map(([k,a])=>[k,Array.isArray(a)?[...a].sort((x,y)=>String(x.id).localeCompare(String(y.id))):a]));}
it('unmodified populated export restores successfully into fresh database',async()=>{setup();const result=await post(original);fs.writeFileSync(dir+'/unmodified-restore.json',JSON.stringify(result,null,2));expect(result.status,result.body.error).toBe(200);expect(sort(await get())).toEqual(sort(original));});
it('diagnostic normalized evidence restores JPY and unresolved proposal faithfully',async()=>{setup();const v=normalized();const r=await post(v);expect(r.status,r.body.error).toBe(200);const back=await get();for(const [key,value] of Object.entries(v)){if(Array.isArray(value))expect(sort({[key]:back[key]})).toEqual(sort({[key]:value}));}fs.writeFileSync(dir+'/normalized-roundtrip.json',JSON.stringify({status:r.status,collections:Object.fromEntries(Object.entries(back).filter(([k,v])=>Array.isArray(v)).map(([k,v]:any)=>[k,v.length]))},null,2));});
for(const [name,mutate] of [
 ['missing postings',(v:any)=>v.journal_entries=[]],
 ['journal/account currency mismatch',(v:any)=>v.journal_entries.forEach((j:any)=>j.currency='USD')],
 ['nonexistent document reference',(v:any)=>v.transactions[0].evidence_refs=JSON.stringify([{document_id:'missing-document'}])]
] as const){it('rejects '+name+' without changing destination',async()=>{setup();expect((await post(normalized())).status).toBe(200);const before=await get();const bad=normalized();mutate(bad);const res=await post(bad);expect(res.status,res.body.error).toBe(400);expect(await get()).toEqual(before);});}
it('rejects unsupported archive version without mutation',async()=>{setup();const before=await get();expect((await post(normalized(),99)).status).toBe(400);expect(await get()).toEqual(before);});
async function draftSetup(){setup();expect((await post(normalized())).status).toBe(200);const row=db.prepare("SELECT * FROM m1_drafts WHERE id='test-correct-jpy-roundtrip'").get();return saveDraft(db,{...row,currency:'JPY',amount_cents:500});}
it('description-only update preserves JPY amount/currency and both sources',async()=>{const before=await draftSetup();const after=saveDraft(db,{id:before.id,description:'Partial update'});for(const key of ['amount_cents','currency','payment_account_id','source_document_id','source_transaction_id'] as const)expect(after[key]).toEqual(before[key]);});
it('currency-only mismatch against retained payment account is rejected without mutation',async()=>{const before=await draftSetup();expect(()=>saveDraft(db,{id:before.id,currency:'USD'})).toThrow(/Currency mismatch/);expect(db.prepare('SELECT * FROM m1_drafts WHERE id=?').get(before.id)).toEqual(before);});
it('explicit source clearing preserves unrelated financial facts',async()=>{const before=await draftSetup();const after=saveDraft(db,{id:before.id,source_document_id:null});expect(after.source_document_id).toBeNull();for(const key of ['amount_cents','currency','payment_account_id','source_transaction_id'] as const)expect(after[key]).toEqual(before[key]);});

