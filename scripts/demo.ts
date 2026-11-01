import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { planOrder } from '../src/ordering.js';

const fixture = JSON.parse(await readFile('evals/fixtures/tomato-soup.json', 'utf8'));
const draft = planOrder(fixture.orderInput);
await mkdir('outputs/demo', { recursive: true });
await writeFile('outputs/demo/order.json', JSON.stringify(draft, null, 2) + '\n');
console.log(JSON.stringify(draft, null, 2));
console.log('Synthetic order draft saved to outputs/demo/order.json. No order was sent.');
