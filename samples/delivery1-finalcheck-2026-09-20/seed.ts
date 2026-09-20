import { createTestDb } from '../../src/infrastructure/sqlite/db';
import { initAccountingSchema } from '../../src/lib/domain/accounting/schema';
import { createEntity, createAccount } from '../../src/lib/domain/accounting/accountService';
import { recordBalanceObservation } from '../../src/lib/domain/accounting/balanceObservationService';
async function main() {
 const db=createTestDb(); initAccountingSchema(db);
 const owner=createEntity(db,{name:'Assessor Household',type:'household',currency:'AUD'});
 const business=createEntity(db,{name:'Assessor Business',type:'business',currency:'AUD'});
 for(const [name,currency,type,sub_type,mode,amount,entity] of [
  ['Assessor Super','AUD','asset','brokerage','balance',12500000,owner.id],
  ['Tokyo Savings','JPY','asset','savings','balance',150000,owner.id],
  ['Assessor Card','AUD','liability','credit_card','balance',75000,owner.id],
  ['Awaiting Balance','AUD','asset','savings','balance',null,owner.id],
  ['Assessor Everyday','AUD','asset','checking','transactions',null,owner.id],
  ['Assessor Everyday','AUD','asset','checking','balance',50000,business.id]
 ] as const) {
  const {account}=createAccount(db,{entity_id:entity,name,type,sub_type,currency,opening_date:'2026-09-01',tracking_mode:mode});
  if(amount!==null) recordBalanceObservation(db,{account_id:account.id,amount_cents:amount,balance_kind:'current_balance',effective_date:'2026-09-19',source_type:'manual'});
 }
 await db.backup('samples/delivery1-finalcheck-2026-09-20/isolated.sqlite'); db.close();
}
export { main };


