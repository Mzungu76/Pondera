import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Notice } from '../components/ui/Notice';
import { deleteAllData, loadReports } from '../lib/storage';

export function Privacy() {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(() => loadReports().reports.length);
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-4xl mb-8">{t.privacy.title}</h1>
      <div className="space-y-8">
        {t.privacy.sections.map((s) => (
          <section key={s.t} className="space-y-3">
            <h2 className="text-2xl">{s.t}</h2>
            {s.p.map((p) => (
              <p key={p} className="prose-p">{p}</p>
            ))}
          </section>
        ))}
        <section className="space-y-3 border-t border-line pt-8">
          <h2 className="text-2xl">{t.privacy.deleteTitle}</h2>
          <p className="prose-p">{t.privacy.deleteBody}</p>
          <Button variant="danger" onClick={() => setConfirm(true)}>{t.privacy.deleteBtn}</Button>
          {done && <Notice role="status">{t.privacy.deleted}</Notice>}
        </section>
        <Link to="/" className="inline-block underline text-navy">{t.common.backToDashboard}</Link>
      </div>
      <ConfirmDialog
        open={confirm}
        title={t.privacy.deleteConfirmTitle}
        body={t.privacy.deleteConfirmBody(count)}
        confirmLabel={t.privacy.deleteConfirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteAllData();
          setCount(0);
          setConfirm(false);
          setDone(true);
        }}
      />
    </div>
  );
}
