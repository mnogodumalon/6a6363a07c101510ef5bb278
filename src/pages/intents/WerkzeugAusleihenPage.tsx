import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Mitarbeiterverwaltung, Werkzeugverwaltung } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconUser,
  IconTool,
  IconCheck,
  IconAlertTriangle,
  IconCalendar,
  IconMapPin,
  IconArrowLeft,
  IconPlus,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Mitarbeiter' },
  { label: 'Werkzeug' },
  { label: 'Details' },
  { label: 'Fertig' },
];

function getNowDatetimeLocal(): string {
  const now = new Date();
  return format(now, "yyyy-MM-dd'T'HH:mm");
}

function getDefaultRueckgabe(): string {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd');
}

export default function WerkzeugAusleihenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mitarbeiterverwaltung, werkzeugverwaltung, ausleiheRueckgabe, loading, error, fetchAll } =
    useDashboardData();

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedMitarbeiterId, setSelectedMitarbeiterId] = useState<string | null>(null);
  const [selectedWerkzeugId, setSelectedWerkzeugId] = useState<string | null>(null);

  // Step 3 form state
  const [ausleihdatum, setAusleihdatum] = useState(getNowDatetimeLocal());
  const [geplanteRueckgabe, setGeplanteRueckgabe] = useState(getDefaultRueckgabe());
  const [einsatzort, setEinsatzort] = useState('');
  const [bemerkungen, setBemerkungen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 4 confirmation state
  const [createdRecord, setCreatedRecord] = useState<{
    mitarbeiterName: string;
    werkzeugName: string;
    ausleihdatum: string;
    geplanteRueckgabe: string;
    einsatzort: string;
  } | null>(null);

  // Deep-link: read URL params on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    const urlMitarbeiterId = searchParams.get('mitarbeiterId');
    const urlWerkzeugId = searchParams.get('werkzeugId');

    if (urlMitarbeiterId) {
      setSelectedMitarbeiterId(urlMitarbeiterId);
      if (urlWerkzeugId) {
        setSelectedWerkzeugId(urlWerkzeugId);
        setStep(urlStep >= 1 && urlStep <= 4 ? urlStep : 3);
      } else {
        setStep(urlStep >= 1 && urlStep <= 4 ? urlStep : 2);
      }
    } else if (urlStep >= 1 && urlStep <= 4) {
      setStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    if (selectedMitarbeiterId) params.set('mitarbeiterId', selectedMitarbeiterId);
    else params.delete('mitarbeiterId');
    if (selectedWerkzeugId) params.set('werkzeugId', selectedWerkzeugId);
    else params.delete('werkzeugId');
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedMitarbeiterId, selectedWerkzeugId]);

  // Compute currently loaned tool IDs (no rueckgabedatum = still out)
  const loanedWerkzeugIds = useMemo(() => {
    const ids = new Set<string>();
    ausleiheRueckgabe.forEach(a => {
      if (!a.fields.rueckgabedatum) {
        const wId = extractRecordId(a.fields.werkzeug);
        if (wId) ids.add(wId);
      }
    });
    return ids;
  }, [ausleiheRueckgabe]);

  // Available (not loaned) tools
  const availableWerkzeuge = useMemo(() => {
    return werkzeugverwaltung.filter(w => !loanedWerkzeugIds.has(w.record_id));
  }, [werkzeugverwaltung, loanedWerkzeugIds]);

  // Helpers
  const selectedMitarbeiter: Mitarbeiterverwaltung | undefined = useMemo(
    () => mitarbeiterverwaltung.find(m => m.record_id === selectedMitarbeiterId),
    [mitarbeiterverwaltung, selectedMitarbeiterId]
  );

  const selectedWerkzeug: Werkzeugverwaltung | undefined = useMemo(
    () => werkzeugverwaltung.find(w => w.record_id === selectedWerkzeugId),
    [werkzeugverwaltung, selectedWerkzeugId]
  );

  function isPruefungBald(naechste_pruefung?: string): boolean {
    if (!naechste_pruefung) return false;
    try {
      const diff = differenceInDays(parseISO(naechste_pruefung), new Date());
      return diff >= 0 && diff <= 30;
    } catch {
      return false;
    }
  }

  function handleSelectMitarbeiter(id: string) {
    setSelectedMitarbeiterId(id);
    setStep(2);
  }

  function handleSelectWerkzeug(id: string) {
    setSelectedWerkzeugId(id);
    setStep(3);
  }

  async function handleSubmit() {
    if (!selectedMitarbeiterId || !selectedWerkzeugId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Format datetimeminute: YYYY-MM-DDTHH:MM (no seconds)
      const formattedAusleihdatum = ausleihdatum.slice(0, 16);
      // Format date: YYYY-MM-DD
      const formattedRueckgabe = geplanteRueckgabe.slice(0, 10);

      await LivingAppsService.createAusleiheRueckgabeEntry({
        mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, selectedMitarbeiterId),
        werkzeug: createRecordUrl(APP_IDS.WERKZEUGVERWALTUNG, selectedWerkzeugId),
        ausleihdatum: formattedAusleihdatum,
        geplante_rueckgabe: formattedRueckgabe,
        einsatzort: einsatzort || undefined,
        bemerkungen: bemerkungen || undefined,
      });

      await fetchAll();

      const mitarbeiterName = selectedMitarbeiter
        ? `${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()
        : selectedMitarbeiterId;
      const werkzeugName = selectedWerkzeug?.fields.bezeichnung ?? selectedWerkzeugId;

      setCreatedRecord({
        mitarbeiterName,
        werkzeugName: werkzeugName ?? '',
        ausleihdatum: formattedAusleihdatum,
        geplanteRueckgabe: formattedRueckgabe,
        einsatzort,
      });
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSelectedMitarbeiterId(null);
    setSelectedWerkzeugId(null);
    setAusleihdatum(getNowDatetimeLocal());
    setGeplanteRueckgabe(getDefaultRueckgabe());
    setEinsatzort('');
    setBemerkungen('');
    setSubmitError(null);
    setCreatedRecord(null);
    setStep(1);
  }

  return (
    <IntentWizardShell
      title="Werkzeug ausleihen"
      subtitle="Werkzeugausleihe in 3 Schritten erfassen"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Mitarbeiter wählen ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mitarbeiter wählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle den Mitarbeiter aus, der das Werkzeug ausleiht.
            </p>
          </div>
          <EntitySelectStep
            items={mitarbeiterverwaltung.map(m => ({
              id: m.record_id,
              title: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || m.record_id,
              subtitle: m.fields.personalnummer ?? '',
              status: m.fields.abteilung
                ? { key: m.fields.abteilung.key, label: m.fields.abteilung.label }
                : undefined,
              icon: <IconUser size={18} className="text-primary" />,
            }))}
            onSelect={handleSelectMitarbeiter}
            searchPlaceholder="Name oder Personalnummer suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Kein Mitarbeiter gefunden."
          />
        </div>
      )}

      {/* ── Step 2: Werkzeug wählen ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Selected mitarbeiter reminder */}
          {selectedMitarbeiter && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary text-sm text-muted-foreground overflow-hidden">
              <IconUser size={15} className="shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">
                {`${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()}
              </span>
              <button
                onClick={() => { setSelectedMitarbeiterId(null); setStep(1); }}
                className="ml-auto shrink-0 text-xs text-primary underline-offset-2 hover:underline"
              >
                Ändern
              </button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-foreground">Werkzeug wählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Nur verfügbare Werkzeuge werden angezeigt ({availableWerkzeuge.length} von{' '}
              {werkzeugverwaltung.length} verfügbar).
            </p>
          </div>

          <EntitySelectStep
            items={availableWerkzeuge.map(w => {
              const bald = isPruefungBald(w.fields.naechste_pruefung);
              return {
                id: w.record_id,
                title: w.fields.bezeichnung ?? w.record_id,
                subtitle: [w.fields.inventarnummer, w.fields.standort].filter(Boolean).join(' · '),
                status: w.fields.zustand
                  ? { key: w.fields.zustand.key, label: w.fields.zustand.label }
                  : undefined,
                icon: bald
                  ? <IconAlertTriangle size={18} className="text-amber-500" />
                  : <IconTool size={18} className="text-primary" />,
                stats: bald && w.fields.naechste_pruefung
                  ? [{ label: 'Nächste Prüfung', value: w.fields.naechste_pruefung.slice(0, 10) }]
                  : undefined,
              };
            })}
            onSelect={handleSelectWerkzeug}
            searchPlaceholder="Bezeichnung oder Inventarnummer suchen..."
            emptyIcon={<IconTool size={32} />}
            emptyText="Kein verfügbares Werkzeug gefunden."
          />

          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1.5">
            <IconArrowLeft size={15} stroke={2} />
            Zurück
          </Button>
        </div>
      )}

      {/* ── Step 3: Ausleihdetails ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Ausleihdetails</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gib die Details zur Ausleihe ein.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-secondary border-b">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Zusammenfassung
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconUser size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                  <p className="text-sm font-medium truncate">
                    {selectedMitarbeiter
                      ? `${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()
                      : '—'}
                  </p>
                  {selectedMitarbeiter?.fields.personalnummer && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedMitarbeiter.fields.personalnummer}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconTool size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Werkzeug</p>
                  <p className="text-sm font-medium truncate">
                    {selectedWerkzeug?.fields.bezeichnung ?? '—'}
                  </p>
                  {selectedWerkzeug?.fields.inventarnummer && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedWerkzeug.fields.inventarnummer}
                      {selectedWerkzeug.fields.standort
                        ? ` · ${selectedWerkzeug.fields.standort}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="p-4 space-y-4">
              {/* Ausleihdatum */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <IconCalendar size={14} className="text-muted-foreground" />
                  Ausleihdatum
                </label>
                <Input
                  type="datetime-local"
                  value={ausleihdatum}
                  onChange={e => setAusleihdatum(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Geplante Rückgabe */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <IconCalendar size={14} className="text-muted-foreground" />
                  Geplante Rückgabe
                </label>
                <Input
                  type="date"
                  value={geplanteRueckgabe}
                  onChange={e => setGeplanteRueckgabe(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Einsatzort */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <IconMapPin size={14} className="text-muted-foreground" />
                  Einsatzort
                </label>
                <Input
                  type="text"
                  placeholder="z. B. Baustelle Nord, Halle 3 ..."
                  value={einsatzort}
                  onChange={e => setEinsatzort(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Bemerkungen */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Bemerkungen{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Zusätzliche Hinweise zur Ausleihe ..."
                  value={bemerkungen}
                  onChange={e => setBemerkungen(e.target.value)}
                  rows={3}
                  className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(2)}
              className="gap-1.5 sm:self-start"
              disabled={submitting}
            >
              <IconArrowLeft size={15} stroke={2} />
              Zurück
            </Button>
            <Button
              className="flex-1 sm:flex-none sm:ml-auto gap-2"
              onClick={handleSubmit}
              disabled={submitting || !ausleihdatum || !geplanteRueckgabe}
            >
              {submitting ? (
                <>Wird gespeichert ...</>
              ) : (
                <>
                  <IconPlus size={16} stroke={2} />
                  Ausleihe erfassen
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Bestätigung ── */}
      {step === 4 && createdRecord && (
        <div className="space-y-5">
          {/* Success banner */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="flex flex-col items-center text-center px-6 py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <IconCheck size={26} className="text-primary" stroke={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Werkzeug erfolgreich ausgeliehen
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Die Ausleihe wurde gespeichert.
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="border-t px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Mitarbeiter" value={createdRecord.mitarbeiterName} />
              <DetailRow label="Werkzeug" value={createdRecord.werkzeugName} />
              <DetailRow
                label="Ausleihdatum"
                value={createdRecord.ausleihdatum.replace('T', ' ')}
              />
              <DetailRow label="Geplante Rückgabe" value={createdRecord.geplanteRueckgabe} />
              {createdRecord.einsatzort && (
                <DetailRow label="Einsatzort" value={createdRecord.einsatzort} />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1 gap-2">
              <IconPlus size={15} stroke={2} />
              Neue Ausleihe
            </Button>
            <a href="#/" className="flex-1">
              <Button variant="default" className="w-full">
                Zurück zum Dashboard
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}

// ── Small helper component ──
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground truncate">{value || '—'}</span>
    </div>
  );
}
