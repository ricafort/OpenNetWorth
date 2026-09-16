// Assessor diagnostic only. Reads the named isolated test vault; no application changes.
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8').replace(/^\uFEFF/, ''));
async function main() {
  const api = 'http://localhost:4005/api/accounting';
  const db = new Database(path.join(__dirname, 'daily_vault.sqlite'), {readonly: true});
  const before = db.prepare('SELECT COUNT(DISTINCT t.id) n FROM m1_transactions t JOIN m1_journal_entries j ON j.transaction_id=t.id JOIN m1_accounts a ON a.id=j.account_id WHERE a.entity_id = ? AND t.date >= ?').get(fixture.entities.business, '2026-09-01').n;
  if (process.argv.includes('--seed-volume')) {
    for (let i=1; i<=101; i++) {
      const response = await fetch(api, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'record_expense',payload:{entity_id:fixture.entities.business,payment_account_id:fixture.accounts['Company Bank'],category:'utilities',amount_cents:1,date:'2026-09-15',description:`TEST volume ${String(i).padStart(3,'0')}`,idempotency_key:`assessor-daily-volume-${i}`}})});
      if (!response.ok) throw new Error(await response.text());
    }
  }
  const scoped = await (await fetch(`${api}?entity_id=${fixture.entities.business}&include_transactions=true&start_date=2026-09-01&end_date=2026-09-30`)).json();
  const household = await (await fetch(`${api}?entity_id=${fixture.entities.household}&include_transactions=true&start_date=2026-09-01&end_date=2026-09-30`)).json();
  const result = {companyCountBefore:before,companyDatabaseCount:db.prepare('SELECT COUNT(DISTINCT t.id) n FROM m1_transactions t JOIN m1_journal_entries j ON j.transaction_id=t.id JOIN m1_accounts a ON a.id=j.account_id WHERE a.entity_id = ? AND t.date >= ?').get(fixture.entities.business,'2026-09-01').n, companyApiReturned:scoped.transactions.length,companyBalance:scoped.accounts.find(a=>a.id===fixture.accounts['Company Bank']).balance_cents,householdBalances:household.accounts.filter(a=>['asset','liability'].includes(a.type)).map(a=>({name:a.name,currency:a.currency,balance_cents:a.balance_cents})),incomeCategories:household.period_income_expenses.breakdown_by_category.filter(a=>a.type==='income'),unbalancedTransactions:db.prepare('SELECT transaction_id, SUM(amount_cents) total FROM m1_journal_entries GROUP BY transaction_id HAVING SUM(amount_cents) != 0').all(),voids:db.prepare("SELECT description,status FROM m1_transactions WHERE status='void'").all()};
  fs.writeFileSync(path.join(__dirname,'verification-results.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2)); db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});

