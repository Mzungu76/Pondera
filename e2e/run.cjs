// Browser E2E (requires `playwright` available globally + dev server on :5199 + mock on :8799).
const { chromium } = require('playwright');
const base = 'http://localhost:5199';
const mock = (q) => fetch('http://localhost:8799/__mode' + q).then((r) => r.json());
const calls = () => fetch('http://localhost:8799/__calls').then((r) => r.json());
let failures = 0;
const vis = (l) => l.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failures++; };

(async () => {
  await mock('?reset=1');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(base);
  ok(await vis(page.getByRole('heading', { name: 'Le decisioni migliori iniziano dalle domande giuste.' })), 'home headline');
  ok(await vis(page.getByText('non un oracolo').first()), 'disclaimer visible on home');
  ok(await vis(page.getByText('Non hai ancora analizzato')), 'empty history state');

  await page.getByRole('button', { name: /Analizza una decisione/ }).click();
  await page.waitForURL('**/nuova');

  // validation on step 0
  await page.getByRole('button', { name: 'Continua' }).click();
  ok((await page.getByText('Questo campo è necessario per procedere.').count()) >= 2, 'required errors on empty step 1');
  await page.getByLabel('Titolo della decisione').fill('Cambiare città');
  await page.getByLabel('Cosa devi decidere?').fill('Accettare il lavoro a Milano o restare a Torino?');
  await page.getByRole('button', { name: 'Continua' }).click();
  // step 2 optional, skip
  ok(await vis(page.getByText('facoltativi').first()), 'step 2 marks fields optional');
  await page.getByRole('button', { name: 'Continua' }).click();
  // alternatives: need 2
  await page.getByRole('button', { name: 'Continua' }).click();
  ok(await vis(page.getByText('Servono almeno due alternative')), 'min 2 alternatives enforced');
  await page.getByLabel('Alternativa 1').fill('Milano');
  await page.getByLabel('Alternativa 2').fill('Torino');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Aggiungi alternativa' }).click();
  ok(await vis(page.getByText('massimo di 5 alternative')), 'max 5 alternatives enforced');
  ok((await page.getByRole('button', { name: /Rimuovi alternativa/ }).count()) === 5, 'remove buttons present');
  for (let i = 5; i >= 3; i--) await page.getByRole('button', { name: `Rimuovi alternativa ${i}` }).click();
  await page.getByRole('button', { name: 'Continua' }).click();

  // draft persistence: reload mid-flow
  await page.reload();
  ok((await page.getByLabel('Titolo della decisione').inputValue().catch(() => '')) === 'Cambiare città', 'draft restored after reload');
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();

  // summary
  ok(await vis(page.getByRole('heading', { name: 'Riepilogo' })), 'summary shown');
  ok(await vis(page.getByText('Alcuni campi sono vuoti')), 'thin-info warning shown');
  ok((await calls()).length === 0, 'no API call before explicit action');

  // Failure at stage 2, then explicit retry resumes
  await mock('?fail=biases');
  await page.getByRole('button', { name: 'Metti alla prova questa decisione' }).click();
  await page.getByText("L'analisi si è interrotta").waitFor({ timeout: 15000 });
  ok(await vis(page.getByText('Il servizio IA non è raggiungibile')), 'API failure shows a clear error');
  await page.screenshot({ path: process.env.SHOTS + '/run-error.png' });
  const c1 = await calls();
  ok(c1.length === 2 && c1.every((c) => !c.isRepair || true), 'no automatic retry after failure (' + c1.length + ' calls)');
  await mock('');
  await page.getByRole('button', { name: 'Riprova da questa fase' }).click();
  await page.waitForURL('**/report/**', { timeout: 20000 });
  const c2 = await calls();
  ok(c2.filter((c) => c.stage === 'understand').length === 1, 'retry resumed without re-running completed stages');
  ok(c2.length === 7, 'total provider calls = 7 (6 stages + 1 failed) got ' + c2.length);

  // report
  await page.getByRole('heading', { name: 'Cambiare città' }).waitFor();
  ok(await vis(page.getByText('Salvato su questo browser')), 'saved indicator');
  ok(await vis(page.getByRole('heading', { name: 'Prima di decidere, chiediti...' })), '"Prima di decidere" section');
  ok((await page.locator('#before ~ ol li, section[aria-labelledby=before] li').count()) === 3, 'exactly three top questions');
  await page.getByRole('button', { name: /Rischi cognitivi/ }).waitFor();
  ok(await vis(page.getByText('Possibile indicazione').first()), 'bias shown with calibrated status');
  ok(await vis(page.getByText('"Resto dove sono"')), 'bias linked to trigger evidence');
  await page.getByRole('button', { name: /Matrice decisionale/ }).click();
  ok(await vis(page.getByRole('cell', { name: /8/ }).first()), 'matrix visible');
  await page.getByRole('button', { name: 'Espandi tutto' }).click();
  await page.screenshot({ path: process.env.SHOTS + '/report-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Comprimi tutto' }).click();
  ok((await page.locator('button[aria-expanded=true]').count()) === 0, 'collapse all');

  // rename + persistence
  await page.getByRole('button', { name: 'Rinomina' }).click();
  await page.getByLabel('Nome della decisione').fill('Milano vs Torino');
  await page.getByRole('button', { name: 'Salva' }).click();
  await page.reload();
  ok(await vis(page.getByRole('heading', { name: 'Milano vs Torino' })), 'rename persisted after reload');

  // dashboard history
  await page.getByRole('link', { name: 'Torna alla dashboard' }).first().click();
  ok(await vis(page.getByRole('link', { name: /Milano vs Torino/ })), 'report listed in history');
  await page.getByRole('link', { name: /Milano vs Torino/ }).click();

  // delete with confirmation
  await page.getByRole('button', { name: 'Elimina' }).first().click();
  ok(await vis(page.getByRole('heading', { name: 'Eliminare questo report?' })), 'delete asks for named confirmation');
  await page.getByRole('button', { name: 'Annulla' }).click();
  ok(await vis(page.getByRole('heading', { name: 'Milano vs Torino' })), 'cancel keeps report');
  await page.getByRole('button', { name: 'Elimina' }).first().click();
  await page.getByRole('button', { name: 'Elimina report' }).click();
  await page.waitForURL(base + '/');
  ok(await vis(page.getByText('Non hai ancora analizzato')), 'report deleted');

  // invalid model output -> repair -> clear error, nothing invented
  await mock('?garbage=challenge');
  await page.goto(base + '/nuova');
  await page.getByRole('button', { name: 'Continua' }).click().catch(() => {});
  await page.getByLabel('Titolo della decisione').fill('Test invalido');
  await page.getByLabel('Cosa devi decidere?').fill('Prova');
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByLabel('Alternativa 1').fill('Milano');
  await page.getByLabel('Alternativa 2').fill('Torino');
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Metti alla prova questa decisione' }).click();
  await page.getByText("L'analisi si è interrotta").waitFor({ timeout: 20000 });
  ok(await vis(page.getByText("L'IA non ha restituito un risultato valido")), 'invalid output error shown (no fabricated result)');
  const c3 = (await calls()).slice(c2.length);
  ok(c3.filter((c) => c.isRepair).length === 1, 'exactly one repair attempt');
  await page.getByRole('button', { name: 'Annulla e torna al riepilogo' }).click();
  ok(await vis(page.getByRole('heading', { name: 'Riepilogo' })), 'abort returns to summary');
  await mock('');

  // privacy + delete all
  await page.goto(base + '/privacy');
  ok(await vis(page.getByText('non costituisce una dichiarazione di conformità al GDPR')), 'privacy page: no GDPR claim');
  await page.getByRole('button', { name: 'Elimina tutti i dati locali' }).click();
  await page.getByRole('button', { name: 'Elimina tutto' }).click();
  ok(await vis(page.getByText('Dati locali eliminati.')), 'delete-all works');
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pondera:')));
  ok(keys.length === 0, 'no pondera keys left');

  // corrupted storage
  await page.evaluate(() => localStorage.setItem('pondera:v1:reports', '{broken'));
  await page.goto(base);
  ok(await vis(page.getByText('era danneggiato')), 'corrupted storage handled with notice');

  // Mobile
  const m = await browser.newContext({ viewport: { width: 375, height: 800 }, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  const overflow = async (name) => {
    const o = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(o <= 0, `mobile no horizontal overflow: ${name} (${o})`);
  };
  await mp.goto(base); await overflow('home'); await mp.screenshot({ path: process.env.SHOTS + '/home-mobile.png', fullPage: true });
  await mp.goto(base + '/nuova'); await overflow('wizard'); await mp.screenshot({ path: process.env.SHOTS + '/wizard-mobile.png' });
  // seed a report to view on mobile
  await mp.evaluate(async () => {});
  await mp.goto(base + '/nuova');
  await mp.getByLabel('Titolo della decisione').fill('Mobile test');
  await mp.getByLabel('Cosa devi decidere?').fill('Prova su mobile');
  await mp.getByRole('button', { name: 'Continua' }).click();
  await mp.getByRole('button', { name: 'Continua' }).click();
  await mp.getByLabel('Alternativa 1').fill('Milano');
  await mp.getByLabel('Alternativa 2').fill('Torino');
  await mp.getByRole('button', { name: 'Continua' }).click();
  await overflow('summary');
  await mp.getByRole('button', { name: 'Metti alla prova questa decisione' }).click();
  await mp.waitForURL('**/report/**', { timeout: 20000 });
  await mp.getByRole('button', { name: 'Espandi tutto' }).click();
  await overflow('report expanded');
  await mp.screenshot({ path: process.env.SHOTS + '/report-mobile.png', fullPage: true });

  const real = consoleErrors.filter((e) => !/status of 502/.test(e)); // 502s are the injected provider failures
  ok(real.length === 0, 'no unexpected console errors ' + JSON.stringify(real));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURES` : '\nALL E2E CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
