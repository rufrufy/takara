import fs from 'fs';
import { parseFinancialExcel } from '../src/lib/excelImporter';

const buf = fs.readFileSync('Keuangan-Maruf-transactions-2026-11-10.xlsx');
const res = parseFinancialExcel(buf);

const code = `import type { AppState } from '../types';

export const initialData: AppState = {
  currentUser: {
    id: 'user-maruf',
    username: 'maruf',
    displayName: 'Maruf H',
    pinHash: '123456',
    avatarUrl: '',
    createdAt: '2026-11-01T00:00:00.000Z'
  },
  households: [
    ${JSON.stringify(res.household, null, 2)}
  ],
  activeHouseholdId: '${res.household.id}',
  members: ${JSON.stringify(res.members, null, 2)},
  wallets: ${JSON.stringify(res.wallets, null, 2)},
  categories: ${JSON.stringify(res.categories, null, 2)},
  labels: ${JSON.stringify(res.labels, null, 2)},
  transactions: ${JSON.stringify(res.transactions, null, 2)},
  ledgerEntries: ${JSON.stringify(res.ledgerEntries, null, 2)},
  importHistory: [
    ${JSON.stringify(res.summary, null, 2)}
  ],
  isLocked: false
};
`;

fs.writeFileSync('src/lib/initialData.ts', code, 'utf-8');
console.log('src/lib/initialData.ts successfully regenerated with full columns & labels.');
