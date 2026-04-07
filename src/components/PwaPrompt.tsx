import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Wifi } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PwaPrompt: React.FC = () => {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('PWA registration error:', error);
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    globalThis.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );
    globalThis.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      globalThis.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      globalThis.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (offlineReady) {
      setShowOfflineReady(true);
    }
  }, [offlineReady]);

  const handleInstall = async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <div className="fixed right-3 bottom-16 lg:bottom-4 z-[120] flex w-[min(92vw,360px)] flex-col gap-3">
      {installEvent && (
        <div className="rounded-2xl border border-indigo-200 bg-white/95 p-4 shadow-xl shadow-indigo-100 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900">
                Installer Gym Pro
              </p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                Ouvre l application plus rapidement depuis l ecran d accueil.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700"
            >
              Installer
            </button>
            <button
              type="button"
              onClick={() => setInstallEvent(null)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      {needRefresh && (
        <div className="rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-100 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900">
                Mise a jour disponible
              </p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                Une nouvelle version est prete. Recharge pour appliquer les
                dernieres modifications.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
            >
              Mettre a jour
            </button>
          </div>
        </div>
      )}

      {showOfflineReady && !needRefresh && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-100 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-600">
              <Wifi className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900">
                Mode hors ligne pret
              </p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                L application peut maintenant s ouvrir plus vite, meme avec une connexion faible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOfflineReady(false)}
              className="text-[11px] font-bold text-slate-400 transition-colors hover:text-slate-600"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
