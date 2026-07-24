import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAusleiheRueckgabe, enrichWartungReparatur } from '@/lib/enrich';
import type { EnrichedAusleiheRueckgabe } from '@/types/enriched';
import type { Mitarbeiterverwaltung, Werkzeugverwaltung, AusleiheRueckgabe, WartungReparatur } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconTools, IconPackage, IconUsers, IconAlertTriangle, IconArrowBack } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { RecordOverlay, RecordHeader, useRecordOverlayStack } from '@/components/widgets/RecordView';
import { WerkzeugverwaltungDetails } from '@/components/details/WerkzeugverwaltungDetails';
import { AusleiheRueckgabeDetails } from '@/components/details/AusleiheRueckgabeDetails';
import { WartungReparaturDetails } from '@/components/details/WartungReparaturDetails';
import { MitarbeiterverwaltungDetails } from '@/components/details/MitarbeiterverwaltungDetails';
import { WerkzeugverwaltungDialog } from '@/components/dialogs/WerkzeugverwaltungDialog';
import { AusleiheRueckgabeDialog } from '@/components/dialogs/AusleiheRueckgabeDialog';
import { WartungReparaturDialog } from '@/components/dialogs/WartungReparaturDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { format } from 'date-fns';

const APPGROUP_ID = '6a6363a07c101510ef5bb278';
const REPAIR_ENDPOINT = '/claude/build/repair';

type OverlayItem =
  | { type: 'werkzeug'; record: Werkzeugverwaltung }
  | { type: 'ausleihe'; record: AusleiheRueckgabe }
  | { type: 'wartung'; record: WartungReparatur }
  | { type: 'mitarbeiter'; record: Mitarbeiterverwaltung };

export default function DashboardOverview() {
  const {
    mitarbeiterverwaltung, werkzeugverwaltung, ausleiheRueckgabe, wartungReparatur,
    mitarbeiterverwaltungMap, werkzeugverwaltungMap,
    setWerkzeugverwaltung,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  const enrichedAusleiheRueckgabe = enrichAusleiheRueckgabe(ausleiheRueckgabe, { mitarbeiterverwaltungMap, werkzeugverwaltungMap });
  const enrichedWartungReparatur = enrichWartungReparatur(wartungReparatur, { werkzeugverwaltungMap });

  const overlay = useRecordOverlayStack<OverlayItem>();

  // Dialog state
  const [werkzeugDialog, setWerkzeugDialog] = useState<{ open: boolean; record?: Werkzeugverwaltung; defaults?: Record<string, unknown> }>({ open: false });
  const [ausleiheDialog, setAusleiheDialog] = useState<{ open: boolean; record?: EnrichedAusleiheRueckgabe; defaults?: Record<string, unknown> }>({ open: false });
  const [wartungDialog, setWartungDialog] = useState<{ open: boolean; record?: WartungReparatur; defaults?: Record<string, unknown> }>({ open: false });

  // Derived data — all hooks before early returns
  const currentlyBorrowed = useMemo(() =>
    enrichedAusleiheRueckgabe.filter(r => !r.fields.rueckgabedatum),
    [enrichedAusleiheRueckgabe]
  );

  const overdueAusleihe = useMemo(() =>
    enrichedAusleiheRueckgabe.filter(r =>
      !r.fields.rueckgabedatum &&
      r.fields.geplante_rueckgabe &&
      r.fields.geplante_rueckgabe < today
    ),
    [enrichedAusleiheRueckgabe, today]
  );

  const inMaintenance = useMemo(() =>
    werkzeugverwaltung.filter(w => lookupKey(w.fields.zustand) === 'reparaturbeduerftigt' || lookupKey(w.fields.zustand) === 'ausser_betrieb'),
    [werkzeugverwaltung]
  );

  const upcomingWartung = useMemo(() => {
    const in30 = format(new Date(clock.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    return enrichedWartungReparatur
      .filter(r => r.fields.naechste_wartung && r.fields.naechste_wartung >= today && r.fields.naechste_wartung <= in30)
      .sort((a, b) => (a.fields.naechste_wartung ?? '').localeCompare(b.fields.naechste_wartung ?? ''));
  }, [enrichedWartungReparatur, today, clock]);

  // Kanban columns from zustand lookup
  const kanbanColumns = useMemo(() =>
    (LOOKUP_OPTIONS['werkzeugverwaltung']?.['zustand'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'reparaturbeduerftigt' ? 'warning' as const
        : o.key === 'ausser_betrieb' ? 'destructive' as const
        : o.key === 'neuwertig' ? 'success' as const
        : 'default' as const,
    })),
    []
  );

  const kanbanCards: KanbanCard[] = useMemo(() =>
    werkzeugverwaltung.map(w => {
      const borrowed = currentlyBorrowed.find(a => extractRecordId(a.fields.werkzeug) === w.record_id);
      const zustand = lookupKey(w.fields.zustand) ?? '';
      return {
        id: `werkzeug:${w.record_id}`,
        column: zustand,
        title: w.fields.bezeichnung ?? '(ohne Bezeichnung)',
        subtitle: borrowed
          ? `Ausgeliehen · ${borrowed.mitarbeiterName || '—'}`
          : w.fields.standort
          ? w.fields.standort
          : w.fields.inventarnummer,
        tone: zustand === 'reparaturbeduerftigt' ? 'warning' as const
          : zustand === 'ausser_betrieb' ? 'destructive' as const
          : zustand === 'neuwertig' ? 'success' as const
          : 'default' as const,
      };
    }),
    [werkzeugverwaltung, currentlyBorrowed]
  );

  // Context line
  const contextLine = useMemo(() => {
    if (werkzeugverwaltung.length === 0) return 'Noch keine Werkzeuge erfasst.';
    if (overdueAusleihe.length > 0) {
      const names = namen(overdueAusleihe.map(a => a.werkzeugName || a.mitarbeiterName || ''));
      return `${names} überfällig — bitte Rückgabe klären.`;
    }
    if (currentlyBorrowed.length > 0) {
      const names = namen(currentlyBorrowed.map(a => a.werkzeugName || ''));
      return `${names} aktuell ausgeliehen.`;
    }
    return 'Alle Werkzeuge verfügbar.';
  }, [werkzeugverwaltung, overdueAusleihe, currentlyBorrowed]);

  // Early returns AFTER all hooks
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Advance: return a tool (optimistic)
  const handleReturnTool = async (ausleihe: EnrichedAusleiheRueckgabe) => {
    const returnTime = format(clock, "yyyy-MM-dd'T'HH:mm");
    const prev = ausleiheRueckgabe.find(a => a.record_id === ausleihe.record_id);
    // Optimistic not possible for ausleihe without setAusleiheRueckgabe from hook — just PATCH then fetchAll
    try {
      await LivingAppsService.updateAusleiheRueckgabeEntry(ausleihe.record_id, { rueckgabedatum: returnTime });
      undoToast(`${ausleihe.werkzeugName || 'Werkzeug'} zurückgegeben`, async () => {
        await LivingAppsService.updateAusleiheRueckgabeEntry(ausleihe.record_id, { rueckgabedatum: prev?.fields.rueckgabedatum ?? undefined });
        fetchAll();
      });
      fetchAll();
    } catch {
      fetchAll();
    }
  };

  // Card move: update zustand optimistically
  const handleCardMove = async (cardId: string, newColumn: string) => {
    const werkzeugId = cardId.split(':')[1];
    const snapshot = werkzeugverwaltung.find(w => w.record_id === werkzeugId);
    if (!snapshot) return;

    const zustandOpts = LOOKUP_OPTIONS['werkzeugverwaltung']?.['zustand'] ?? [];
    const newLookup = zustandOpts.find(o => o.key === newColumn) ?? { key: newColumn, label: newColumn };

    setWerkzeugverwaltung(prev => prev.map(w =>
      w.record_id === werkzeugId
        ? { ...w, fields: { ...w.fields, zustand: newLookup } }
        : w
    ));

    try {
      await LivingAppsService.updateWerkzeugverwaltungEntry(werkzeugId, { zustand: newColumn });
      undoToast(
        `Zustand geändert`,
        async () => {
          setWerkzeugverwaltung(prev => prev.map(w =>
            w.record_id === werkzeugId ? snapshot : w
          ));
          await LivingAppsService.updateWerkzeugverwaltungEntry(werkzeugId, { zustand: lookupKey(snapshot.fields.zustand) });
        }
      );
    } catch {
      fetchAll();
    }
  };

  const openWerkzeugOverlay = (record: Werkzeugverwaltung) => overlay.replace({ type: 'werkzeug', record });
  const openAusleiheOverlay = (record: AusleiheRueckgabe) => overlay.push({ type: 'ausleihe', record });
  const openWartungOverlay = (record: WartungReparatur) => overlay.push({ type: 'wartung', record });
  const openMitarbeiterOverlay = (record: Mitarbeiterverwaltung) => overlay.push({ type: 'mitarbeiter', record });

  const top = overlay.top;

  // Determine overlay edit/add handlers
  const getOverlayOnEdit = () => {
    if (!top) return undefined;
    if (top.type === 'werkzeug') return () => setWerkzeugDialog({ open: true, record: top.record });
    if (top.type === 'ausleihe') return () => setAusleiheDialog({ open: true, record: top.record as EnrichedAusleiheRueckgabe });
    if (top.type === 'wartung') return () => setWartungDialog({ open: true, record: top.record });
    return undefined;
  };

  const getOverlayTitle = () => {
    if (!top) return '';
    if (top.type === 'werkzeug') return top.record.fields.bezeichnung ?? 'Werkzeug';
    if (top.type === 'ausleihe') {
      const enriched = enrichedAusleiheRueckgabe.find(a => a.record_id === top.record.record_id);
      return enriched?.werkzeugName ?? 'Ausleihe';
    }
    if (top.type === 'wartung') {
      const enriched = enrichedWartungReparatur.find(w => w.record_id === top.record.record_id);
      return enriched?.werkzeugName ?? 'Wartung';
    }
    if (top.type === 'mitarbeiter') return `${top.record.fields.vorname ?? ''} ${top.record.fields.nachname ?? ''}`.trim() || 'Mitarbeiter';
    return '';
  };

  const getOverlayFooter = () => {
    if (!top) return undefined;
    if (top.type === 'werkzeug') {
      // Check if currently borrowed — offer return action
      const borrowed = currentlyBorrowed.find(a => extractRecordId(a.fields.werkzeug) === top.record.record_id);
      if (borrowed) {
        return (
          <Button size="sm" onClick={() => { handleReturnTool(borrowed); overlay.close(); }}>
            <IconArrowBack size={14} className="mr-1 shrink-0" />Rückgabe eintragen
          </Button>
        );
      }
      // Offer borrow action
      return (
        <Button size="sm" variant="outline" onClick={() => {
          setAusleiheDialog({ open: true, defaults: { werkzeug: createRecordUrl(APP_IDS.WERKZEUGVERWALTUNG, top.record.record_id) } });
        }}>
          <IconPackage size={14} className="mr-1 shrink-0" />Ausleihen
        </Button>
      );
    }
    if (top.type === 'ausleihe') {
      const rec = top.record as AusleiheRueckgabe;
      if (!rec.fields.rueckgabedatum) {
        const enriched = enrichedAusleiheRueckgabe.find(a => a.record_id === rec.record_id);
        if (enriched) {
          return (
            <Button size="sm" onClick={() => { handleReturnTool(enriched); overlay.close(); }}>
              <IconCheck size={14} className="mr-1 shrink-0" />Rückgabe eintragen
            </Button>
          );
        }
      }
    }
    return undefined;
  };

  // Hero: overdue borrowings
  const hero = overdueAusleihe.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      tone="destructive"
      action={{
        label: 'Rückgabe eintragen',
        onClick: () => {
          const enriched = enrichedAusleiheRueckgabe.find(a => a.record_id === overdueAusleihe[0].record_id);
          if (enriched) handleReturnTool(enriched);
        },
      }}
    >
      <b>{namen(overdueAusleihe.map(a => a.werkzeugName || ''))}</b>{' '}
      überfällig — geplante Rückgabe war{' '}
      {formatDate(overdueAusleihe[0].fields.geplante_rueckgabe)}.
    </HeroBanner>
  ) : undefined;

  // StatStrip
  const kpis = (
    <StatStrip>
      <StatStripItem
        title="Werkzeuge gesamt"
        value={werkzeugverwaltung.length}
        icon={<IconTool size={16} className="shrink-0" />}
      />
      <StatStripItem
        title="Ausgeliehen"
        value={currentlyBorrowed.length}
        icon={<IconPackage size={16} className="shrink-0" />}
        tone={currentlyBorrowed.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title="Überfällig"
        value={overdueAusleihe.length}
        icon={<IconAlertTriangle size={16} className="shrink-0" />}
        tone={overdueAusleihe.length > 0 ? 'destructive' : 'default'}
      />
      <StatStripItem
        title="In Reparatur"
        value={inMaintenance.length}
        icon={<IconTools size={16} className="shrink-0" />}
        tone={inMaintenance.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title="Mitarbeiter"
        value={mitarbeiterverwaltung.length}
        icon={<IconUsers size={16} className="shrink-0" />}
      />
    </StatStrip>
  );

  // Aside: active borrowings + upcoming maintenance
  const aside = (
    <>
      <WorkList
        title="Aktive Ausleihen"
        icon={<IconPackage size={16} className="shrink-0" />}
        items={currentlyBorrowed.map(a => ({
          id: a.record_id,
          title: a.werkzeugName || '(Werkzeug)',
          secondLine: (
            <>
              <span className={overdueAusleihe.some(o => o.record_id === a.record_id) ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                {overdueAusleihe.some(o => o.record_id === a.record_id) ? 'Überfällig' : 'Ausgeliehen'}
              </span>
              {' · '}{a.mitarbeiterName || '—'}
              {a.fields.geplante_rueckgabe ? <> · bis {formatDate(a.fields.geplante_rueckgabe)}</> : null}
            </>
          ),
          action: {
            label: '✓ Zurück',
            onClick: () => handleReturnTool(a),
          },
        }))}
        onItemClick={id => {
          const rec = ausleiheRueckgabe.find(a => a.record_id === id);
          if (rec) overlay.replace({ type: 'ausleihe', record: rec });
        }}
        empty={{
          text: werkzeugverwaltung.length > 0 ? 'Alle Werkzeuge im Lager.' : 'Noch keine Werkzeuge erfasst.',
          action: { label: 'Ausleihe erfassen', onClick: () => setAusleiheDialog({ open: true }) },
        }}
        max={6}
      />
      <WorkList
        title="Wartung in 30 Tagen"
        icon={<IconTools size={16} className="shrink-0" />}
        items={upcomingWartung.map(w => ({
          id: w.record_id,
          title: w.werkzeugName || '(Werkzeug)',
          secondLine: (
            <>
              <span className="text-amber-600 font-medium">{w.fields.massnahme_art?.label ?? 'Wartung'}</span>
              {w.fields.naechste_wartung ? <> · {formatDate(w.fields.naechste_wartung)}</> : null}
            </>
          ),
          action: {
            label: 'Wartung',
            onClick: () => setWartungDialog({ open: true, defaults: { werkzeug: w.fields.werkzeug } }),
          },
        }))}
        onItemClick={id => {
          const rec = wartungReparatur.find(r => r.record_id === id);
          if (rec) overlay.replace({ type: 'wartung', record: rec });
        }}
        empty={{
          text: 'Keine Wartungen in den nächsten 30 Tagen.',
          action: { label: 'Wartung erfassen', onClick: () => setWartungDialog({ open: true }) },
        }}
        max={5}
      />
    </>
  );

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button onClick={() => setWerkzeugDialog({ open: true })}>
          <IconTool size={16} className="mr-2 shrink-0" />Werkzeug anlegen
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={kpis}
        aside={aside}
        primary={
          <KanbanWidget
            columns={kanbanColumns}
            cards={kanbanCards}
            onCardClick={card => {
              const werkzeugId = card.id.split(':')[1];
              const rec = werkzeugverwaltung.find(w => w.record_id === werkzeugId);
              if (rec) overlay.replace({ type: 'werkzeug', record: rec });
            }}
            onCardMove={handleCardMove}
            onAddCard={column => setWerkzeugDialog({ open: true, defaults: { zustand: column } })}
          />
        }
      />

      {/* Single overlay host */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onBack={overlay.canGoBack ? overlay.pop : undefined}
        onEdit={getOverlayOnEdit()}
        footer={getOverlayFooter()}
      >
        {top?.type === 'werkzeug' && (
          <>
            <RecordHeader
              title={top.record.fields.bezeichnung ?? 'Werkzeug'}
              subtitle={top.record.fields.kategorie?.label}
            />
            <WerkzeugverwaltungDetails
              record={top.record}
              ausleiheRueckgabeList={ausleiheRueckgabe}
              onOpenAusleiheRueckgabe={openAusleiheOverlay}
              onAddAusleiheRueckgabe={() => setAusleiheDialog({ open: true, defaults: { werkzeug: createRecordUrl(APP_IDS.WERKZEUGVERWALTUNG, top.record.record_id) } })}
              wartungReparaturList={wartungReparatur}
              onOpenWartungReparatur={openWartungOverlay}
              onAddWartungReparatur={() => setWartungDialog({ open: true, defaults: { werkzeug: createRecordUrl(APP_IDS.WERKZEUGVERWALTUNG, top.record.record_id) } })}
            />
          </>
        )}
        {top?.type === 'ausleihe' && (
          <>
            <RecordHeader
              title={(() => {
                const enriched = enrichedAusleiheRueckgabe.find(a => a.record_id === top.record.record_id);
                return enriched?.werkzeugName ?? 'Ausleihe';
              })()}
              subtitle={(() => {
                const enriched = enrichedAusleiheRueckgabe.find(a => a.record_id === top.record.record_id);
                return enriched?.mitarbeiterName ?? undefined;
              })()}
            />
            <AusleiheRueckgabeDetails
              record={top.record}
              mitarbeiterverwaltungList={mitarbeiterverwaltung}
              onOpenMitarbeiterverwaltung={openMitarbeiterOverlay}
              werkzeugverwaltungList={werkzeugverwaltung}
              onOpenWerkzeugverwaltung={openWerkzeugOverlay}
            />
          </>
        )}
        {top?.type === 'wartung' && (
          <>
            <RecordHeader
              title={(() => {
                const enriched = enrichedWartungReparatur.find(w => w.record_id === top.record.record_id);
                return enriched?.werkzeugName ?? 'Wartung';
              })()}
              subtitle={top.record.fields.massnahme_art?.label}
            />
            <WartungReparaturDetails
              record={top.record}
              werkzeugverwaltungList={werkzeugverwaltung}
              onOpenWerkzeugverwaltung={openWerkzeugOverlay}
            />
          </>
        )}
        {top?.type === 'mitarbeiter' && (
          <>
            <RecordHeader
              title={`${top.record.fields.vorname ?? ''} ${top.record.fields.nachname ?? ''}`.trim() || 'Mitarbeiter'}
              subtitle={top.record.fields.abteilung?.label}
            />
            <MitarbeiterverwaltungDetails
              record={top.record}
              ausleiheRueckgabeList={ausleiheRueckgabe}
              onOpenAusleiheRueckgabe={openAusleiheOverlay}
              onAddAusleiheRueckgabe={() => setAusleiheDialog({ open: true, defaults: { mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, top.record.record_id) } })}
            />
          </>
        )}
      </RecordOverlay>

      {/* Dialogs */}
      <WerkzeugverwaltungDialog
        open={werkzeugDialog.open}
        onClose={() => setWerkzeugDialog({ open: false })}
        onSubmit={async fields => {
          if (werkzeugDialog.record) {
            await LivingAppsService.updateWerkzeugverwaltungEntry(werkzeugDialog.record.record_id, fields);
            undoToast('Werkzeug aktualisiert');
          } else {
            await LivingAppsService.createWerkzeugverwaltungEntry(fields);
            undoToast('Werkzeug angelegt');
          }
          fetchAll();
        }}
        defaultValues={(werkzeugDialog.record?.fields ?? werkzeugDialog.defaults) as Werkzeugverwaltung['fields']}
        recordId={werkzeugDialog.record?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeugverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Werkzeugverwaltung']}
      />

      <AusleiheRueckgabeDialog
        open={ausleiheDialog.open}
        onClose={() => setAusleiheDialog({ open: false })}
        onSubmit={async fields => {
          if (ausleiheDialog.record) {
            await LivingAppsService.updateAusleiheRueckgabeEntry(ausleiheDialog.record.record_id, fields);
            undoToast('Ausleihe aktualisiert');
          } else {
            await LivingAppsService.createAusleiheRueckgabeEntry(fields);
            undoToast('Ausleihe erfasst');
          }
          fetchAll();
        }}
        defaultValues={(ausleiheDialog.record?.fields ?? ausleiheDialog.defaults) as AusleiheRueckgabe['fields']}
        recordId={ausleiheDialog.record?.record_id}
        mitarbeiterverwaltungList={mitarbeiterverwaltung}
        werkzeugverwaltungList={werkzeugverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['AusleiheRueckgabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['AusleiheRueckgabe']}
      />

      <WartungReparaturDialog
        open={wartungDialog.open}
        onClose={() => setWartungDialog({ open: false })}
        onSubmit={async fields => {
          if (wartungDialog.record) {
            await LivingAppsService.updateWartungReparaturEntry(wartungDialog.record.record_id, fields);
            undoToast('Wartung aktualisiert');
          } else {
            await LivingAppsService.createWartungReparaturEntry(fields);
            undoToast('Wartung erfasst');
          }
          fetchAll();
        }}
        defaultValues={(wartungDialog.record?.fields ?? wartungDialog.defaults) as WartungReparatur['fields']}
        recordId={wartungDialog.record?.record_id}
        werkzeugverwaltungList={werkzeugverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['WartungReparatur']}
        enablePhotoLocation={AI_PHOTO_LOCATION['WartungReparatur']}
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
