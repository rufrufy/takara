import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
mkdirSync('.impeccable',{recursive:true});
import {rolldown} from 'rolldown';
writeFileSync('.impeccable/receipt-app-test-entry.ts',[
"export {authenticateAccount,getCurrentAccount,signOutAccount,getReceiptAuthClient,changeAccountPin} from '../src/lib/receiptAuth';",
"export {uploadReceiptPhoto,resolveReceiptUrl} from '../src/lib/attachments';",
"export {syncTransactionToSupabase,deleteTransactionFromSupabase,syncDebtPaymentToSupabase,pullAllDataFromSupabase,DEFAULT_SUPABASE_CONFIG} from '../src/lib/supabase';"
].join('\n'));
const bundle=await rolldown({input:resolve('.impeccable/receipt-app-test-entry.ts'),cwd:process.cwd(),platform:'node',external:['@supabase/supabase-js']});
await bundle.write({file:'.impeccable/receipt-app-test-bundle.mjs',format:'esm'});await bundle.close();console.log('Built integration harness from actual application modules.');
