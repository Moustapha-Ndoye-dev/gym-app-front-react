import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { History, User, CheckCircle2, XCircle, RefreshCw, Power, ArrowRight, UserCheck, Scan } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type AccessLog = {
  id: number;
  member?: { firstName: string; lastName: string; photo?: string };
  ticket?: { type: string };
  accessTime: string;
  status: 'granted' | 'denied';
};

type ScanResultState = {
  granted: boolean;
  message: string;
  member?: {
    firstName?: string;
    lastName?: string;
    photo?: string;
    subscriptionName?: string | null;
    activities?: string[];
  };
  scannedCode?: string;
};

/* ─── Scanner config ─────────────────────────────────────────────────────── */

/** Taille du viewfinder en pixels – synchronisé avec w-80 (320 px). */
const READER_PX = 320;

type CameraSurface = 'native' | 'html5' | null;

/** API navigateur (Chrome, Edge, Android) — absente des lib DOM TypeScript par défaut. */
type NativeQrBarcodeDetector = {
  detect: (source: HTMLVideoElement) => Promise<
    Array<{ rawValue?: string; boundingBox?: DOMRectReadOnly }>
  >;
};

type NativeQrBarcodeDetectorCtor = new (options?: { formats?: string[] }) => NativeQrBarcodeDetector;

function getNativeQrDetectorCtor(): NativeQrBarcodeDetectorCtor | null {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  return (window as unknown as { BarcodeDetector: NativeQrBarcodeDetectorCtor }).BarcodeDetector;
}

type QrHighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Convertit la bbox du détecteur (coords flux vidéo) en coords overlay dans l’élément affiché (object-fit: contain). */
function mapVideoBBoxToOverlay(
  bbox: DOMRectReadOnly,
  video: HTMLVideoElement,
): QrHighlightRect {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  if (!vw || !vh || !cw || !ch) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(cw / vw, ch / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (cw - dw) / 2;
  const oy = (ch - dh) / 2;
  return {
    left: bbox.x * scale + ox,
    top: bbox.y * scale + oy,
    width: bbox.width * scale,
    height: bbox.height * scale,
  };
}

/** Repli : scan sur tout le cadre (pas de petite qrbox) pour chercher le QR n’importe où. */
const HTML5_FALLBACK_CONFIG: {
  fps: number;
  qrbox: (vw: number, vh: number) => { width: number; height: number };
  disableFlip: boolean;
  videoConstraints: MediaTrackConstraints;
} = {
  fps: 12,
  qrbox: (vw, vh) => ({ width: vw, height: vh }),
  disableFlip: true,
  videoConstraints: { facingMode: { ideal: 'environment' } },
};

function noopScanError() {}

async function waitNextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatLogTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Interprète `granted` renvoyé par l’API (évite Boolean("false") === true). */
function parseApiGranted(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

/* ─── AccessIdlePanel ────────────────────────────────────────────────────── */

/** Panneau scanner — plein cadre + cadre vert sur le QR (BarcodeDetector) ou recherche globale (repli html5). */
const AccessIdlePanel: React.FC<{
  isScannerEnabled: boolean;
  cameraSurface: CameraSurface;
  qrHighlight: QrHighlightRect | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}> = ({ isScannerEnabled, cameraSurface, qrHighlight, videoRef }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[490px] p-10">

    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 border ${
      isScannerEnabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isScannerEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isScannerEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
        {isScannerEnabled ? 'Détection active' : 'Désactivé'}
      </span>
    </div>

    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1">Scanner QR</h2>
    <p className="text-[11px] text-slate-400 mb-7 text-center max-w-xs leading-relaxed">
      {isScannerEnabled && cameraSurface === 'native'
        ? 'Tout le cadre est analysé — le repère vert épouse le QR détecté'
        : isScannerEnabled && cameraSurface === 'html5'
          ? 'Recherche du QR sur toute la zone caméra'
          : 'Activez le scanner pour commencer'}
    </p>

    <div className={`p-[2.5px] rounded-[26px] transition-all duration-500 ${
      isScannerEnabled
        ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-700 shadow-[0_0_55px_rgba(99,102,241,0.40),0_10px_30px_rgba(0,0,0,0.28)]'
        : 'bg-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.10)]'
    }`}>
      <div className="relative w-80 h-80 rounded-[24px] bg-slate-950 overflow-hidden">

        <video
          ref={videoRef}
          className={`absolute inset-0 z-[1] block h-full w-full bg-[#020617] object-contain transition-opacity duration-300 ${
            isScannerEnabled && cameraSurface === 'native' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          playsInline
          muted
        />

        <div
          id="reader"
          className={`qr-reader absolute inset-0 z-[1] transition-opacity duration-300 ${
            isScannerEnabled && cameraSurface === 'html5' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ width: `${READER_PX}px`, height: `${READER_PX}px` }}
        />

        {isScannerEnabled && cameraSurface === 'native' && qrHighlight && qrHighlight.width > 4 && qrHighlight.height > 4 && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border-2 border-emerald-400 shadow-[0_0_26px_rgba(52,211,153,0.55)] transition-all duration-75 ease-out"
            style={{
              left: qrHighlight.left,
              top: qrHighlight.top,
              width: qrHighlight.width,
              height: qrHighlight.height,
            }}
          />
        )}

        {!isScannerEnabled && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md text-white/25">
            <Power className="w-12 h-12 mb-3" />
            <p className="text-[9px] font-black uppercase tracking-[0.28em]">Caméra éteinte</p>
          </div>
        )}
      </div>
    </div>

    <p className="mt-7 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
      {isScannerEnabled
        ? <><Scan className="h-3 w-3 text-indigo-400" /> Analyse du flux en cours…</>
        : <><Power className="h-3 w-3 opacity-40" /> Scanner désactivé</>
      }
    </p>
  </div>
);

/* ─── AccessResultPanel ──────────────────────────────────────────────────── */

const AccessResultPanel: React.FC<{ scanResult: ScanResultState; onNext: () => void }> = ({ scanResult, onNext }) => (
  <div className={`rounded-2xl p-1 shadow-xl border border-transparent animate-in zoom-in duration-300 min-h-[490px] flex flex-col ${
    scanResult.granted ? 'bg-emerald-500' : 'bg-rose-500'
  }`}>
    <div className="flex-1 bg-white m-1 rounded-xl p-6 flex flex-col items-center justify-between">
      <div className="text-center w-full">
        <div className={`inline-flex p-3 rounded-2xl mb-4 ${scanResult.granted ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {scanResult.granted ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
        </div>

        <div className="mb-6">
          <h3 className={`text-2xl font-black uppercase tracking-tight ${scanResult.granted ? 'text-emerald-600' : 'text-rose-600'}`}>
            {scanResult.message}
          </h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Statut de l&apos;accès</p>
        </div>

        {scanResult.member && (
          <div className="w-full max-w-sm mx-auto p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-5">
            <div className="w-24 h-24 rounded-xl bg-white overflow-hidden border-2 border-white shadow-md shrink-0">
              {scanResult.member.photo
                ? <img src={scanResult.member.photo} className="w-full h-full object-cover" alt="Portrait" />
                : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-3xl font-black">
                    {scanResult.member.firstName?.[0]}{scanResult.member.lastName?.[0]}
                  </div>
              }
            </div>
            <div className="text-left space-y-2 min-w-0 flex-1">
              <div>
                <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Adhérent</p>
                <p className="text-lg font-black text-slate-900 leading-tight">
                  {scanResult.member.firstName} <br /> {scanResult.member.lastName}
                </p>
              </div>
              {scanResult.member.subscriptionName && (
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Formule</p>
                  <p className="text-[11px] font-bold text-slate-800 uppercase">{scanResult.member.subscriptionName}</p>
                </div>
              )}
              {scanResult.member.activities && scanResult.member.activities.length > 0 && (
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Activités</p>
                  <div className="flex flex-wrap gap-1">
                    {scanResult.member.activities.map((name) => (
                      <span key={name} className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-100">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase w-fit">
                <UserCheck className="h-2.5 w-2.5" /> ID Vérifié
              </div>
            </div>
          </div>
        )}

        {!scanResult.member && scanResult.scannedCode && (
          <div className="w-full max-w-sm mx-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">QR lu</p>
            <p className="mt-2 break-all text-[12px] font-bold text-slate-900">{scanResult.scannedCode}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        className={`w-full max-w-xs py-3.5 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 text-[11px] mt-6 ${
          scanResult.granted ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-rose-600 text-white hover:bg-rose-700'
        }`}
      >
        Suivant <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

/* ─── AccessHistory ──────────────────────────────────────────────────────── */

const AccessHistory: React.FC<{ logs: AccessLog[]; onRefresh: () => void }> = ({ logs, onRefresh }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[490px]">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
          <History className="h-4 w-4" />
        </div>
        <h2 className="text-[13px] font-black tracking-tight uppercase text-slate-900">Historique</h2>
      </div>
      <button type="button" onClick={onRefresh} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-300 transition-colors">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>

    <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
      {logs.length === 0
        ? <div className="py-16 text-center opacity-20">
            <User className="h-10 w-10 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest mt-2">Vide</p>
          </div>
        : logs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                  {log.member?.photo
                    ? <img src={log.member.photo} className="w-full h-full object-cover" alt="" />
                    : <User className="h-4 w-4" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate max-w-[80px]">
                    {log.member ? log.member.firstName : 'Client'}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{formatLogTime(log.accessTime)}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${log.status === 'granted' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          ))
      }
    </div>
  </div>
);

/* ─── AccessControl (page) ───────────────────────────────────────────────── */

const NOTIFY_MS = 8000;

export const AccessControl: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [scanResult, setScanResult]         = useState<ScanResultState | null>(null);
  const [logs, setLogs]                     = useState<AccessLog[]>([]);
  const [isScannerEnabled, setIsScannerEnabled] = useState(true);
  const [cameraActive, setCameraActive]     = useState(false);
  const [cameraSurface, setCameraSurface]   = useState<CameraSurface>(null);
  const [qrHighlight, setQrHighlight]       = useState<QrHighlightRect | null>(null);

  const scannerRef       = useRef<Html5Qrcode | null>(null);
  const nativeStreamRef  = useRef<MediaStream | null>(null);
  const detectorRef      = useRef<NativeQrBarcodeDetector | null>(null);
  const rafRef           = useRef<number>(0);
  const videoRef         = useRef<HTMLVideoElement | null>(null);
  const scanLockRef      = useRef(false);
  /** Ignore les callbacks scanner retardataires (html5-qrcode) juste après « Suivant » — évite un 2e POST /verify sans nouveau scan. */
  const scanCooldownUntilRef = useRef(0);

  /* Logs — même comportement que Vue (toast si échec, pas de re-fetch à chaque toggle scanner). */
  const fetchLogs = useCallback(async () => {
    try {
      const res = await axiosInstance.get<AccessLog[]>('/api/access/logs');
      setLogs(res.data || []);
    } catch (error: unknown) {
      setLogs([]);
      showNotification(getApiErrorMessage(error, "Chargement de l'historique d'accès"), 'error', NOTIFY_MS);
    }
  }, [showNotification]);

  /* Stop */
  const stopScanner = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    detectorRef.current = null;
    if (nativeStreamRef.current) {
      nativeStreamRef.current.getTracks().forEach((t) => t.stop());
      nativeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setQrHighlight(null);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
      } catch (e) { console.error('stopScanner:', e); }
      scannerRef.current = null;
    }
    setCameraSurface(null);
    setCameraActive(false);
  }, []);

  /* Succès de scan — coupe tout de suite le toggle (hors ligne) pour que l’effet ne relance pas la caméra tant que scanResult est encore null. */
  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (Date.now() < scanCooldownUntilRef.current) return;
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    flushSync(() => {
      setIsScannerEnabled(false);
    });
    try {
      await stopScanner();
      const res = await axiosInstance.post<Record<string, unknown>>('/api/access/verify', { qr_code: decodedText });
      const d = res.data ?? {};
      setScanResult({
        granted: parseApiGranted(d.granted),
        message: typeof d.message === 'string' ? d.message : '',
        member: d.member as ScanResultState['member'],
        scannedCode: typeof d.scannedCode === 'string' ? d.scannedCode : decodedText,
      });
      void fetchLogs();
      /* Verrou maintenu jusqu’à Suivant : évite un 2e POST /verify (Pass journée, html5-qrcode). */
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, "Vérification d'accès");
      setScanResult({ granted: false, message: msg });
      showNotification(msg, 'error', NOTIFY_MS);
      scanLockRef.current = false;
    }
  }, [stopScanner, fetchLogs, showNotification]);

  /* Start — BarcodeDetector plein cadre + cadre dynamique ; sinon html5-qrcode plein cadre */
  const startScanner = useCallback(async () => {
    if (scannerRef.current || nativeStreamRef.current) return;
    setQrHighlight(null);
    try {
      let detector: NativeQrBarcodeDetector | null = null;
      const DetectorClass = getNativeQrDetectorCtor();
      if (DetectorClass) {
        try {
          detector = new DetectorClass({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }

      if (detector) {
        detectorRef.current = detector;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        nativeStreamRef.current = stream;
        setCameraSurface('native');
        await waitNextPaint();
        const video = videoRef.current;
        if (!nativeStreamRef.current || !video) {
          stream.getTracks().forEach((t) => t.stop());
          nativeStreamRef.current = null;
          detectorRef.current = null;
          setCameraSurface(null);
          throw new Error('Élément vidéo indisponible');
        }
        video.srcObject = stream;
        await video.play();
        setCameraActive(true);

        const minIntervalMs = 45;
        let lastFrameTime = 0;

        const tick = async (now: number) => {
          if (!nativeStreamRef.current || !detectorRef.current) return;
          /* Ne pas reprogrammer la boucle pendant un scan : sinon détections multiples (ex. Pass 2 séances). */
          if (scanLockRef.current) {
            return;
          }
          if (now - lastFrameTime < minIntervalMs) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          lastFrameTime = now;
          try {
            const codes = await detectorRef.current.detect(video);
            if (codes.length > 0) {
              const c = codes[0];
              const raw = c.rawValue ?? '';
              if (c.boundingBox && video.videoWidth > 0) {
                setQrHighlight(mapVideoBBoxToOverlay(c.boundingBox, video));
              }
              if (raw) {
                void onScanSuccess(raw);
                return;
              }
            } else {
              setQrHighlight(null);
            }
          } catch {
            setQrHighlight(null);
          }
          if (nativeStreamRef.current) {
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setCameraSurface('html5');
      await waitNextPaint();
      const qr = new Html5Qrcode('reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        HTML5_FALLBACK_CONFIG,
        onScanSuccess,
        noopScanError,
      );
      setCameraActive(true);
    } catch (e) {
      console.error('startScanner:', e);
      await stopScanner();
      setIsScannerEnabled(false);
    }
  }, [onScanSuccess, stopScanner]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  /* Scanner : comme le watch Vue ([isScannerEnabled, scanResult]) + onUnmounted stop. */
  useEffect(() => {
    if (isScannerEnabled && scanResult === null) void startScanner();
    else void stopScanner();
    return () => { void stopScanner(); };
  }, [isScannerEnabled, scanResult, startScanner, stopScanner]);

  /** Après un scan : couper la caméra avant de déverrouiller (sinon un callback html5-qrcode en retard peut refaire un verify). */
  const handleNext = () => {
    void (async () => {
      try {
        await stopScanner();
      } finally {
        scanCooldownUntilRef.current = Date.now() + 400;
        scanLockRef.current = false;
        setScanResult(null);
        setIsScannerEnabled(false);
      }
    })();
  };

  /* ── Render ── */
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-500 text-slate-900">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-start gap-3">
          <span className="hidden sm:block mt-1 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase text-slate-900">Contrôle d&apos;accès</h1>
            {user?.role === 'controller' ? (
              <p className="text-[11px] sm:text-[12px] font-medium text-slate-600 mt-0.5 leading-snug break-words [overflow-wrap:anywhere] max-w-full">
                <span className="font-bold text-slate-800">{user.username}</span>
                {user.gymName ? (
                  <>
                    {' '}
                    <span className="text-slate-400">·</span>{' '}
                    <span className="font-semibold text-indigo-600">{user.gymName}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium">Terminal de validation en temps réel.</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              {cameraActive ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsScannerEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${isScannerEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isScannerEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 xl:col-span-8">
          {scanResult
            ? <AccessResultPanel scanResult={scanResult} onNext={handleNext} />
            : (
              <AccessIdlePanel
                isScannerEnabled={isScannerEnabled}
                cameraSurface={cameraSurface}
                qrHighlight={qrHighlight}
                videoRef={videoRef}
              />
              )
          }
        </div>
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <AccessHistory logs={logs} onRefresh={fetchLogs} />
        </div>
      </div>

      {/*
        Repli html5-qrcode : qrbox = plein cadre ; vidéo injectée avec object-fit: contain (alignement drawImage).
        #qr-shaded-region masqué quand la lib ajoute le masque pour qrbox.
      */}
      <style>{`
        .qr-reader { overflow: hidden; }
        .qr-reader video {
          width:  ${READER_PX}px !important;
          height: ${READER_PX}px !important;
          max-width: none !important;
          object-fit: contain !important;
          object-position: center !important;
          display: block !important;
          background: #020617;
        }
        .qr-reader #qr-shaded-region { display: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
