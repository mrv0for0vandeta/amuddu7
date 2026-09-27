import { useI18n } from '@/lib/i18n';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-sand-200 bg-sand-100 dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">Amuddu</p>
            <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
              {t('nav.discover')} · {t('nav.plan')}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500 dark:text-sand-400">
            <button onClick={() => onNavigate('/listings')} className="hover:text-ink-800 dark:hover:text-sand-100">{t('nav.experiences')}</button>
            <button onClick={() => onNavigate('/gems')} className="hover:text-ink-800 dark:hover:text-sand-100">{t('nav.gems')}</button>
            <button onClick={() => onNavigate('/flights')} className="hover:text-ink-800 dark:hover:text-sand-100">{t('nav.flights')}</button>
            <button onClick={() => onNavigate('/transport')} className="hover:text-ink-800 dark:hover:text-sand-100">{t('nav.transport')}</button>
            <button onClick={() => onNavigate('/plan')} className="hover:text-ink-800 dark:hover:text-sand-100">{t('nav.plan')}</button>
          </div>
        </div>
        <p className="mt-6 text-xs text-ink-400 dark:text-sand-500">
          Amuddu · {t('plan.footerNote')}
        </p>
      </div>
    </footer>
  );
}
