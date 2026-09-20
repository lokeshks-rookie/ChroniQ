import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useHospitalStore } from '@/store/hospitalStore';
import { selectBoard, pageTiles, type DisplayDoctorTile } from '@/lib/display';
import { useLang, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import {
  globalAnnouncementQueue,
  playChime,
  formatTokenForSpeech,
  WebSpeechProvider,
} from '@/lib/announce';
import { getLiveClockIST } from '@/lib/time';
import {
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
  WifiOff,
  Sparkles,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';

export const DisplayBoardPage: React.FC = () => {
  const { hospitalId, deptId } = useParams<{ hospitalId: string; deptId: string }>();
  const { lang, setLang, t } = useLang('en');

  const {
    hospital,
    departments,
    queue_entries,
    call_events,
    heartbeat_at,
  } = useHospitalStore();

  // Settings state persisted in localStorage
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('chroniq_display_sound') !== 'false';
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('chroniq_display_vol');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [textSizePercent, setTextSizePercent] = useState<number>(() => {
    const saved = localStorage.getItem('chroniq_display_textsize');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Overlay state: browser autoplay requires a user gesture
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // UI timers and pagination
  const [liveClock, setLiveClock] = useState<string>(getLiveClockIST());
  const [tilePageIndex, setTilePageIndex] = useState<number>(0);
  const [noticeIndex, setNoticeIndex] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [userActive, setUserActive] = useState<boolean>(true);

  // Active Call Banner overlay (shows for 8s when a patient is called)
  const [activeCallBanner, setActiveCallBanner] = useState<{
    token: string;
    room: string;
    callCount: number;
  } | null>(null);

  const lastProcessedCallIdRef = useRef<string | null>(null);
  const userActivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadTimeRef = useRef<number>(Date.now());

  // Check hospital & department validity
  const isHospitalValid = hospital.id === hospitalId;
  const isLobby = deptId === 'all';
  const isDeptValid = isLobby || departments.some((d) => d.id === deptId);

  // Derive board data (Strict privacy: tokens only, no patient fields!)
  const boardData = useMemo(() => {
    if (!isHospitalValid || !isDeptValid) return null;
    return selectBoard({ hospitalId: hospitalId || '', deptId: deptId || 'all' }, lang);
  }, [hospitalId, deptId, isHospitalValid, isDeptValid, queue_entries, lang]);

  // Paginate doctor tiles (4 per page, rotate every 10s if > 4)
  const pagedTiles = useMemo(() => {
    if (!boardData) return { tiles: [], totalPages: 1, currentPage: 0 };
    return pageTiles(boardData.doctorTiles, tilePageIndex, 4);
  }, [boardData, tilePageIndex]);

  // Connection status: check online + heartbeat
  const isOnline = useMemo(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    if (!heartbeat_at) return true;
    const diffSec = (Date.now() - new Date(heartbeat_at).getTime()) / 1000;
    return diffSec < 25; // offline if no heartbeat within 25 seconds
  }, [heartbeat_at]);

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(getLiveClockIST());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Doctor tile page rotation (every 10 seconds if > 4 doctors)
  useEffect(() => {
    if (!boardData || boardData.doctorTiles.length <= 4) return;
    const interval = setInterval(() => {
      setTilePageIndex((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [boardData]);

  // 3. Notice bar rotation (every 8 seconds)
  useEffect(() => {
    if (!boardData || boardData.notices.length <= 1) return;
    const interval = setInterval(() => {
      setNoticeIndex((prev) => (prev + 1) % boardData.notices.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [boardData]);

  // 4. Update Announcement Queue settings
  useEffect(() => {
    globalAnnouncementQueue.setSoundEnabled(soundEnabled);
    globalAnnouncementQueue.setVolume(volume);
    globalAnnouncementQueue.setLanguage(lang);
  }, [soundEnabled, volume, lang]);

  // 5. Watch for new call_events and trigger visual banner + audio chime & announcement
  useEffect(() => {
    if (!call_events || call_events.length === 0) return;
    const latest = call_events[0];
    if (!latest) return;

    // Check scope
    const matchesScope =
      isLobby ||
      latest.department_id === deptId;
    if (!matchesScope) return;

    // Ignore if already processed
    if (latest.id === lastProcessedCallIdRef.current) return;
    lastProcessedCallIdRef.current = latest.id;

    // Ignore calls older than 20 seconds from board load
    const eventTime = new Date(latest.at).getTime();
    if (Date.now() - eventTime > 20000 && eventTime < initialLoadTimeRef.current) {
      return;
    }

    // Trigger visual call banner for 8 seconds
    setActiveCallBanner({
      token: latest.token,
      room: latest.room,
      callCount: latest.call_count,
    });

    if (callBannerTimeoutRef.current) {
      clearTimeout(callBannerTimeoutRef.current);
    }
    callBannerTimeoutRef.current = setTimeout(() => {
      setActiveCallBanner(null);
    }, 8000);

    // Enqueue speech announcement
    if (hasStarted) {
      globalAnnouncementQueue.enqueue({
        id: latest.id,
        token: latest.token,
        room: latest.room,
        callCount: latest.call_count,
        timestamp: latest.at,
      });
    }
  }, [call_events, isLobby, deptId, hasStarted]);

  // 6. Handle cursor & controls auto-hide after 3 seconds of inactivity
  const handleUserActivity = useCallback(() => {
    setUserActive(true);
    if (userActivityTimeoutRef.current) {
      clearTimeout(userActivityTimeoutRef.current);
    }
    userActivityTimeoutRef.current = setTimeout(() => {
      setUserActive(false);
      setShowSettings(false);
    }, 3500);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (userActivityTimeoutRef.current) clearTimeout(userActivityTimeoutRef.current);
    };
  }, [handleUserActivity]);

  // 7. Keyboard shortcuts: 'F' for fullscreen, '?' for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key === '?') {
        setShowSettings((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStartDisplay = async () => {
    setHasStarted(true);

    // Try request fullscreen
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // ignore
    }

    // Try screen wake lock
    if ('wakeLock' in navigator) {
      try {
        await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request('screen');
      } catch {
        // wakeLock might fail without user permission or power policy
      }
    }

    // Test initial gentle chime
    if (soundEnabled) {
      await playChime(volume);
    }
  };

  const testVoiceAnnouncement = async () => {
    await playChime(volume);
    const provider = new WebSpeechProvider();
    const tokenSpoken = formatTokenForSpeech('CARD-001', lang);
    const msg =
      lang === 'ta'
        ? `டோக்கன் எண் ${tokenSpoken}. தயவுசெய்து அறை எண் 101 க்கு வரவும்.`
        : lang === 'hi'
        ? `टोकन संख्या ${tokenSpoken}. कृपया कमरा नंबर 101 में जाएं.`
        : `Token ${tokenSpoken}. Please proceed to Room 101.`;
    await provider.speak(msg, lang);
  };

  // Full-screen not-found state if hospitalId or deptId unknown
  if (!isHospitalValid || !isDeptValid) {
    return (
      <div className="min-h-screen w-screen bg-ink text-base flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-danger/20 border border-danger/40 flex items-center justify-center text-danger">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-lg">
          <div className="text-xs uppercase font-bold tracking-widest text-accent">■ INVALID DISPLAY PARAMETERS</div>
          <h1 className="text-3xl font-semibold text-base">Display Board Not Found</h1>
          <p className="text-sm text-base/70 leading-relaxed">
            Could not find an active hospital or department corresponding to <code className="text-accent">/display/{hospitalId}/{deptId}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to={`/display/${hospital.id}/all`}
            className="px-6 py-3 rounded-full bg-accent text-ink font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Open All Departments (Lobby Mode)
          </Link>
          {departments.map((dept) => (
            <Link
              key={dept.id}
              to={`/display/${hospital.id}/${dept.id}`}
              className="px-5 py-2.5 rounded-full border border-base/20 text-base font-semibold text-sm hover:bg-base/10 transition-colors"
            >
              {dept.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const currentNotice = boardData?.notices[noticeIndex] || boardData?.notices[0];

  return (
    <div
      className={`h-screen w-screen flex flex-col justify-between overflow-hidden bg-ink text-base select-none transition-all ${
        !userActive ? 'cursor-none' : 'cursor-default'
      }`}
      style={{ fontSize: `${textSizePercent}%` }}
    >
      {/* 1. HEADER ROW */}
      <header className="px-8 py-4 border-b border-base/10 flex items-center justify-between gap-6 shrink-0 bg-ink">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="ChroniQ Logo"
            className="w-12 h-12 object-contain shrink-0"
          />
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-accent flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>■ {boardData?.hospitalName || 'HOSPITAL'}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-base mt-0.5">
              {boardData?.departmentName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Live / Offline Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-base/15 bg-base/5 text-xs">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-base/90 font-medium">{t('common.live')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-danger" />
                <span className="text-danger font-medium">
                  {t('common.offline')}
                </span>
              </>
            )}
          </div>

          {/* Large Live IST Clock */}
          <div className="text-2xl lg:text-3xl font-mono font-semibold tabular-nums text-base">
            {liveClock}
          </div>

          {/* Settings trigger button (revealed on mouse movement) */}
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            aria-label="Display settings"
            className={`p-2.5 rounded-full border border-base/20 text-base/80 hover:text-base hover:bg-base/10 transition-opacity ${
              userActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN REGIONS (Left: Now Serving 60%, Right: Next in Line 40%) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0 overflow-hidden relative">
        {/* CALL BANNER OVERLAY (Shows for 8 seconds when a patient is called) */}
        {activeCallBanner && (
          <div className="absolute inset-x-6 top-6 z-30 p-8 rounded-panel bg-accent text-ink border-2 border-ink shadow-2xl animate-calling-pulse flex items-center justify-between gap-8">
            <div className="space-y-1">
              <div className="text-sm font-bold uppercase tracking-widest text-ink/80 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-ink animate-ping" />
                <span>
                  {activeCallBanner.callCount > 1
                    ? t('display.second_call')
                    : t('display.now_calling')}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-bold tracking-tight text-ink">
                {t('display.proceed_to')} {activeCallBanner.room}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase font-bold text-ink/70">TOKEN</div>
              <div className="text-7xl lg:text-8xl font-black font-mono tracking-tight tabular-nums text-ink">
                {activeCallBanner.token}
              </div>
            </div>
          </div>
        )}

        {/* REGION A: NOW SERVING (60% width = 7 of 12 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-between min-h-0 space-y-4">
          <div className="flex items-center justify-between border-b border-base/10 pb-2">
            <div className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
              <span className="w-2 h-2 bg-accent inline-block" />
              <span>■ {t('display.now_serving')}</span>
            </div>

            {/* Pagination dots if > 4 doctors */}
            {pagedTiles.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: pagedTiles.totalPages }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === pagedTiles.currentPage
                        ? 'bg-accent w-6'
                        : 'bg-base/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Doctor Tiles Grid (2x2 on base panels) */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-0">
            {pagedTiles.tiles.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center p-8 rounded-panel bg-base/5 border border-base/10 text-center space-y-3">
                <Clock className="w-12 h-12 text-base/40" />
                <p className="text-lg text-base/80">{t('display.no_patients_waiting')}</p>
              </div>
            ) : (
              pagedTiles.tiles.map((tile: DisplayDoctorTile) => {
                const isCalling = tile.state === 'calling';
                const isServing = tile.state === 'serving';

                return (
                  <div
                    key={tile.doctorId}
                    className={`p-6 rounded-panel flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${
                      isCalling
                        ? 'bg-accent text-ink border-2 border-base animate-calling-pulse'
                        : 'bg-base text-ink border border-ink/10'
                    }`}
                  >
                    {/* Top bar: Doctor Name and Room */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div
                          className={`text-base lg:text-lg font-bold truncate ${
                            isCalling ? 'text-ink' : 'text-ink'
                          }`}
                        >
                          {tile.doctorName}
                        </div>
                        <div
                          className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${
                            isCalling ? 'text-ink/80' : 'text-ink/70'
                          }`}
                        >
                          {tile.room}
                        </div>
                      </div>

                      {/* State Tag */}
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isCalling
                            ? 'bg-ink text-base'
                            : isServing
                            ? 'bg-success/20 text-success border border-success/30'
                            : 'bg-ink/5 text-ink/70'
                        }`}
                      >
                        {isCalling
                          ? t('display.now_calling')
                          : isServing
                          ? 'Serving'
                          : tile.state === 'on_break'
                          ? 'On Break'
                          : tile.state === 'late'
                          ? 'Delayed'
                          : tile.state === 'on_leave'
                          ? 'On Leave'
                          : 'Available'}
                      </span>
                    </div>

                    {/* Middle hero: Big Numerals for token OR clear status message */}
                    <div className="my-auto py-2 text-center">
                      {tile.token ? (
                        <div
                          className={`text-5xl sm:text-6xl lg:text-7xl font-bold font-mono tracking-tight tabular-nums ${
                            isCalling ? 'text-ink' : 'text-ink'
                          }`}
                        >
                          {tile.token}
                        </div>
                      ) : (
                        <div className="text-base text-ink/70 font-medium py-4">
                          {tile.state === 'on_break' &&
                            `${t('display.on_break_until')} ${tile.breakUntil || '1:30 PM'}`}
                          {tile.state === 'late' &&
                            t('display.running_late', { min: tile.lateMinutes || 20 })}
                          {tile.state === 'on_leave' && t('display.not_available_today')}
                          {tile.state === 'available_empty' && t('display.no_patients_waiting')}
                        </div>
                      )}
                    </div>

                    {/* Bottom instruction */}
                    <div
                      className={`text-xs font-semibold truncate ${
                        isCalling ? 'text-ink' : 'text-ink/60'
                      }`}
                    >
                      {isCalling
                        ? `${t('display.proceed_to')} ${tile.room}`
                        : isServing
                        ? 'Consultation in progress'
                        : 'Please wait for your token call'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* REGION B: NEXT IN LINE (40% width = 5 of 12 cols) */}
        <section className="lg:col-span-5 flex flex-col justify-between min-h-0 space-y-4 bg-base/5 border border-base/10 rounded-panel p-6">
          <div className="flex items-center justify-between border-b border-base/10 pb-2">
            <div className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
              <span className="w-2 h-2 bg-accent inline-block" />
              <span>■ {t('display.next_in_line')}</span>
            </div>
            <div className="text-xs text-base/70">
              {boardData?.totalWaitingCount || 0} waiting
            </div>
          </div>

          {/* Tokens List (strictly tokens, room, wait - NO patient names or priority tags) */}
          <div className="flex-1 divide-y divide-base/10 overflow-hidden flex flex-col justify-around">
            {boardData?.nextInLine.length === 0 ? (
              <div className="text-center py-12 text-base/60 text-sm">
                {t('display.no_patients_waiting')}
              </div>
            ) : (
              boardData?.nextInLine.map((item) => (
                <div
                  key={item.token}
                  className="py-2 flex items-center justify-between gap-4 text-base"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-base tabular-nums">
                      {item.token}
                    </span>
                    <span className="eyebrow">
                      {item.room}
                    </span>
                  </div>

                  <span className="text-xs text-accent font-medium tabular-nums">
                    {item.approxWaitText}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer: +N more waiting */}
          {(boardData?.moreWaitingCount || 0) > 0 && (
            <div className="pt-2 border-t border-base/10 text-center text-xs font-semibold text-base/70">
              {t('display.more_waiting', { count: boardData?.moreWaitingCount || 0 })}
            </div>
          )}
        </section>
      </main>

      {/* 3. NOTICES BAR (Bottom Accent Band, rotating every 8s) */}
      {currentNotice && (
        <div className="px-8 py-3 bg-accent text-ink flex items-center justify-between gap-6 shrink-0 text-sm font-semibold tracking-wide">
          <div className="flex items-center gap-3 truncate">
            <span className="text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-ink text-base shrink-0">
              ■ {t('display.notices')}
            </span>
            <span className="truncate">{currentNotice.text}</span>
          </div>

          <div className="text-xs text-ink/80 shrink-0 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ChroniQ Live</span>
          </div>
        </div>
      )}

      {/* 4. FOOTER WITH QR CODE */}
      <footer className="px-8 py-3 bg-ink border-t border-base/10 flex items-center justify-between gap-6 shrink-0 text-xs text-base/70">
        <div className="flex items-center gap-4">
          <div className="bg-base p-1.5 rounded-sm">
            {/* TODO: Patient portal link will point to live web app */}
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/app`}
              size={48}
              bgColor="var(--color-base)"
              fgColor="var(--color-ink)"
            />
          </div>
          <div>
            <div className="font-semibold text-base/90">{t('display.track_phone')}</div>
            <div className="text-[11px] text-base/60">Scan QR to view real-time queue position on your mobile device</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ChroniQ Logo"
            className="w-7 h-7 object-contain shrink-0"
          />
          <div className="text-right">
            <div>ChroniQ Healthcare Platform</div>
            <div className="text-[11px] text-base/60">Automated Patient Flow & Queue Display</div>
          </div>
        </div>
      </footer>

      {/* 5. "START DISPLAY" OVERLAY (Required for browser autoplay audio permission) */}
      {!hasStarted && (
        <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6">
          <img
            src="/logo.png"
            alt="ChroniQ Logo"
            className="w-20 h-20 object-contain shrink-0"
          />

          <div className="space-y-2 max-w-md">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">■ CHRONIQ LIVE DISPLAY</div>
            <h2 className="text-4xl font-bold text-base">{t('display.start_overlay_title')}</h2>
            <p className="text-base text-base/70 leading-relaxed">
              {t('display.start_overlay_desc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartDisplay}
            className="px-8 py-4 rounded-full bg-accent text-ink font-bold text-lg hover:opacity-90 transition-all cursor-pointer shadow-xl"
          >
            {t('display.start_btn')}
          </button>
        </div>
      )}

      {/* 6. SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-panel bg-base text-ink p-8 space-y-6 shadow-2xl border border-ink/20">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <h3 className="text-2xl font-bold text-ink">{t('display.settings_title')}</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-ink/5 text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm">
              {/* Voice Announcements Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t('display.sound_toggle')}</div>
                  <div className="text-xs text-ink/70">Audio chime and voice calls</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    localStorage.setItem('chroniq_display_sound', String(next));
                  }}
                  className={`px-4 py-2 rounded-full font-bold text-xs cursor-pointer ${
                    soundEnabled ? 'bg-ink text-base' : 'bg-ink/10 text-ink'
                  }`}
                >
                  {soundEnabled ? (
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4" /> Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <VolumeX className="w-4 h-4" /> Muted
                    </span>
                  )}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{t('display.volume')}</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    localStorage.setItem('chroniq_display_vol', String(v));
                  }}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <div className="font-semibold text-xs uppercase text-ink/70">
                  {t('display.language')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLang(item.code)}
                      className={`p-3 rounded-card text-center cursor-pointer transition-all border ${
                        lang === item.code
                          ? 'bg-ink text-base border-ink'
                          : 'bg-base text-ink border-ink/20 hover:border-ink/40'
                      }`}
                    >
                      <div className="font-bold text-sm">{item.nativeLabel}</div>
                      <div className="text-[11px] opacity-70">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size Selection (100 / 115 / 130%) */}
              <div className="space-y-2">
                <div className="font-semibold text-xs uppercase text-ink/70">
                  {t('display.text_size')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 115, 130].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setTextSizePercent(pct);
                        localStorage.setItem('chroniq_display_textsize', String(pct));
                      }}
                      className={`py-2 px-3 rounded-card text-center font-bold text-sm cursor-pointer border ${
                        textSizePercent === pct
                          ? 'bg-ink text-base border-ink'
                          : 'bg-base text-ink border-ink/20 hover:border-ink/40'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions: Test Voice & Fullscreen */}
              <div className="pt-2 border-t border-ink/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={testVoiceAnnouncement}
                  className="px-4 py-2.5 rounded-full border border-ink/20 text-xs font-bold text-ink hover:bg-ink/5 transition-colors flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4 text-accent" />
                  <span>{t('display.test_speech')}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-4 py-2.5 rounded-full bg-ink text-base text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-4 h-4" /> Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" /> {t('display.fullscreen')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
