import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import {
  IconTool,
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowRight,
  IconPlayerSkipForward,
  IconRefresh,
} from '@tabler/icons-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { AusleiheRueckgabe } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';

const STEPS = [
  { label: 'Ausleihe wählen' },
  { label: 'Rückgabe erfassen' },
  { label: 'Wartung anlegen' },
  { label: 'Abschluss' },
];

// Keys that indicate damage/bad condition
const DAMAGE_KEYS = new Set(['beschaedigt', 'verloren']);

function formatDT(dt?: string): string {
  if (!dt) return '—';
  try {
    return format(parseISO(dt), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    try {
      return format(new Date(dt), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dt;
    }
  }
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    return format(parseISO(d.slice(0, 10)), 'dd.MM.yyyy', { locale: de });
  } catch {
    return d;
  }
}

function nowDTLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function todayDate(): string {
  return nowDTLocal().slice(0, 10);
}

export default function WerkzeugRueckgabePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize step from URL
  const urlStep = parseInt(searchParams.get('step') ?? '1', 10);
  const [step, setStep] = useState<number>(isNaN(urlStep) || urlStep < 1 || urlStep > 4 ? 1 : urlStep);

  // Selected Ausleihe record
  const [selectedAusleihe, setSelectedAusleihe] = useState<AusleiheRueckgabe | null>(null);

  // Step 2 form state
  const [rueckgabeDatum, setRueckgabeDatum] = useState<string>(nowDTLocal());
  const [zustandRueckgabe, setZustandRueckgabe] = useState<string>('');
  const [bemerkungen, setBemerkungen] = useState<string>('');
  const [step2Submitting, setStep2Submitting] = useState(false);
  const [step2Error, setStep2Error] = useState<string>('');

  // Step 3 form state
  const [massnahmeArt, setMassnahmeArt] = useState<string>('');
  const [datumMassnahme, setDatumMassnahme] = useState<string>(todayDate());
  const [dienstleister, setDienstleister] = useState<string>('');
  const [kosten, setKosten] = useState<string>('');
  const [naechsteWartung, setNaechsteWartung] = useState<string>('');
  const [zustandNachMassnahme, setZustandNachMassnahme] = useState<string>('');
  const [beschreibung, setBeschreibung] = useState<string>('');
  const [step3Submitting, setStep3Submitting] = useState(false);
  const [step3Error, setStep3Error] = useState<string>('');

  // Track if Wartung was created
  const [wartungCreated, setWartungCreated] = useState(false);

  const { ausleiheRueckgabe, loading, error, fetchAll, mitarbeiterverwaltungMap, werkzeugverwaltungMap } = useDashboardData();

  // Deep-link: ?ausleiheId=xxx → pre-select and jump to step 2
  const ausleiheIdParam = searchParams.get('ausleiheId');
  useEffect(() => {
    if (!ausleiheIdParam || loading || ausleiheRueckgabe.length === 0) return;
    const found = ausleiheRueckgabe.find(a => a.record_id === ausleiheIdParam);
    if (found && !found.fields.rueckgabedatum) {
      setSelectedAusleihe(found);
      setStep(2);
    }
  }, [ausleiheIdParam, ausleiheRueckgabe, loading]);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    setSearchParams(params, { replace: true });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectAusleihe = useCallback((id: string) => {
    const found = ausleiheRueckgabe.find(a => a.record_id === id);
    if (!found) return;
    setSelectedAusleihe(found);
    setRueckgabeDatum(nowDTLocal());
    setZustandRueckgabe('');
    setBemerkungen('');
    setStep2Error('');
    setStep(2);
  }, [ausleiheRueckgabe]);

  // Filter open Ausleihe records (no rueckgabedatum)
  const offeneAusleihen = ausleiheRueckgabe.filter(a => !a.fields.rueckgabedatum);

  // Helper: get Werkzeug name from applookup URL
  function getWerkzeugName(ausleihe: AusleiheRueckgabe): string {
    const id = extractRecordId(ausleihe.fields.werkzeug);
    if (!id) return 'Unbekanntes Werkzeug';
    const w = werkzeugverwaltungMap.get(id);
    return w?.fields.bezeichnung ?? 'Unbekanntes Werkzeug';
  }

  function getMitarbeiterName(ausleihe: AusleiheRueckgabe): string {
    const id = extractRecordId(ausleihe.fields.mitarbeiter);
    if (!id) return 'Unbekannter Mitarbeiter';
    const m = mitarbeiterverwaltungMap.get(id);
    if (!m) return 'Unbekannter Mitarbeiter';
    return [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || 'Mitarbeiter';
  }

  const zustandRueckgabeOptions = LOOKUP_OPTIONS['ausleihe_&_rueckgabe']?.['zustand_rueckgabe'] ?? [];
  const massnahmeArtOptions = LOOKUP_OPTIONS['wartung_&_reparatur']?.['massnahme_art'] ?? [];
  const zustandNachMassnahmeOptions = LOOKUP_OPTIONS['wartung_&_reparatur']?.['zustand_nach_massnahme'] ?? [];

  const isDamaged = DAMAGE_KEYS.has(zustandRueckgabe);

  async function handleStep2Submit() {
    if (!selectedAusleihe) return;
    if (!zustandRueckgabe) {
      setStep2Error('Bitte wähle einen Zustand bei Rückgabe aus.');
      return;
    }
    if (!rueckgabeDatum) {
      setStep2Error('Bitte gib ein Rückgabedatum an.');
      return;
    }
    setStep2Error('');
    setStep2Submitting(true);
    try {
      await LivingAppsService.updateAusleiheRueckgabeEntry(selectedAusleihe.record_id, {
        rueckgabedatum: rueckgabeDatum.slice(0, 16),
        zustand_rueckgabe: zustandRueckgabe,
        bemerkungen: bemerkungen || undefined,
      });
      await fetchAll();
      if (DAMAGE_KEYS.has(zustandRueckgabe)) {
        setStep(3);
      } else {
        setStep(4);
      }
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'Fehler beim Speichern der Rückgabe.');
    } finally {
      setStep2Submitting(false);
    }
  }

  async function handleStep3Submit() {
    if (!selectedAusleihe) return;
    if (!massnahmeArt) {
      setStep3Error('Bitte wähle eine Maßnahmenart aus.');
      return;
    }
    if (!datumMassnahme) {
      setStep3Error('Bitte gib ein Datum der Maßnahme an.');
      return;
    }
    setStep3Error('');
    setStep3Submitting(true);
    try {
      const werkzeugId = extractRecordId(selectedAusleihe.fields.werkzeug);
      await LivingAppsService.createWartungReparaturEntry({
        werkzeug: werkzeugId ? createRecordUrl(APP_IDS.WERKZEUGVERWALTUNG, werkzeugId) : undefined,
        massnahme_art: massnahmeArt,
        datum_massnahme: datumMassnahme.slice(0, 10),
        dienstleister: dienstleister || undefined,
        kosten: kosten ? parseFloat(kosten) : undefined,
        naechste_wartung: naechsteWartung ? naechsteWartung.slice(0, 10) : undefined,
        zustand_nach_massnahme: zustandNachMassnahme || undefined,
        beschreibung: beschreibung || undefined,
      });
      setWartungCreated(true);
      await fetchAll();
      setStep(4);
    } catch (err) {
      setStep3Error(err instanceof Error ? err.message : 'Fehler beim Anlegen der Wartung.');
    } finally {
      setStep3Submitting(false);
    }
  }

  function handleReset() {
    setSelectedAusleihe(null);
    setRueckgabeDatum(nowDTLocal());
    setZustandRueckgabe('');
    setBemerkungen('');
    setStep2Error('');
    setMassnahmeArt('');
    setDatumMassnahme(todayDate());
    setDienstleister('');
    setKosten('');
    setNaechsteWartung('');
    setZustandNachMassnahme('');
    setBeschreibung('');
    setStep3Error('');
    setWartungCreated(false);
    setStep(1);
  }

  const werkzeugName = selectedAusleihe ? getWerkzeugName(selectedAusleihe) : '';
  const mitarbeiterName = selectedAusleihe ? getMitarbeiterName(selectedAusleihe) : '';

  // Lookup label for display
  const zustandRueckgabeLabel =
    zustandRueckgabeOptions.find((o: { key: string; label: string }) => o.key === zustandRueckgabe)?.label ?? zustandRueckgabe;

  return (
    <IntentWizardShell
      title="Werkzeug zurückgeben"
      subtitle="Rückgabe erfassen und optional Wartung dokumentieren"
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Offene Ausleihe wählen ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Offene Ausleihe wählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle die Ausleihe, die du jetzt zurückgibst.
            </p>
          </div>

          {offeneAusleihen.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <IconTool size={22} stroke={1.5} />
              </div>
              <p className="text-sm">Keine offenen Ausleihen vorhanden.</p>
            </div>
          )}

          <EntitySelectStep
            items={offeneAusleihen.map(a => {
              const wName = getWerkzeugName(a);
              const mName = getMitarbeiterName(a);
              const ausleihdatum = a.fields.ausleihdatum ? formatDT(a.fields.ausleihdatum) : '—';
              const geplant = a.fields.geplante_rueckgabe ? formatDate(a.fields.geplante_rueckgabe) : '—';
              return {
                id: a.record_id,
                title: wName,
                subtitle: `${mName} · seit ${ausleihdatum}`,
                status: { key: 'offen', label: 'Offen' },
                stats: [
                  { label: 'Einsatzort', value: a.fields.einsatzort ?? '—' },
                  { label: 'Geplante Rückgabe', value: geplant },
                ],
                icon: <IconTool size={20} className="text-primary" stroke={1.5} />,
              };
            })}
            onSelect={handleSelectAusleihe}
            searchPlaceholder="Werkzeug oder Mitarbeiter suchen..."
            emptyText="Keine offenen Ausleihen gefunden."
            emptyIcon={<IconTool size={32} stroke={1.5} />}
          />
        </div>
      )}

      {/* ── STEP 2: Rückgabe erfassen ── */}
      {step === 2 && selectedAusleihe && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Rückgabe erfassen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gib den Zustand und das Rückgabedatum ein.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border bg-card p-4 space-y-3 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconTool size={20} className="text-primary" stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{werkzeugName}</p>
                <p className="text-xs text-muted-foreground truncate">{mitarbeiterName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ausgeliehen am: {formatDT(selectedAusleihe.fields.ausleihdatum)}
                </p>
              </div>
            </div>
          </div>

          {/* Damage warning banner */}
          {isDamaged && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <IconAlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" stroke={2} />
              <p className="text-sm text-amber-800">
                Schaden erkannt — im nächsten Schritt kannst du eine Wartung anlegen.
              </p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Rückgabedatum */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rückgabedatum</label>
              <input
                type="datetime-local"
                value={rueckgabeDatum}
                onChange={e => setRueckgabeDatum(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Zustand bei Rückgabe */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zustand bei Rückgabe</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {zustandRueckgabeOptions.map((opt: { key: string; label: string }) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setZustandRueckgabe(opt.key)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors text-left ${
                      zustandRueckgabe === opt.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:bg-accent'
                    } ${DAMAGE_KEYS.has(opt.key) ? 'border-amber-300' : ''}`}
                  >
                    {DAMAGE_KEYS.has(opt.key) && (
                      <IconAlertTriangle size={15} className="text-amber-500 shrink-0" stroke={2} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bemerkungen */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Bemerkungen <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={bemerkungen}
                onChange={e => setBemerkungen(e.target.value)}
                rows={3}
                placeholder="Weitere Hinweise zur Rückgabe..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {step2Error && (
              <p className="text-sm text-destructive">{step2Error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                Zurück
              </Button>
              <Button
                onClick={handleStep2Submit}
                disabled={step2Submitting || !zustandRueckgabe}
                className="gap-2 flex-1 sm:flex-none"
              >
                {step2Submitting ? 'Wird gespeichert…' : 'Rückgabe bestätigen'}
                {!step2Submitting && <IconArrowRight size={16} />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Wartung/Reparatur anlegen ── */}
      {step === 3 && selectedAusleihe && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Schaden dokumentieren</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lege eine Wartungs- oder Reparaturmaßnahme für{' '}
              <span className="font-medium text-foreground">{werkzeugName}</span> an.
            </p>
          </div>

          <div className="space-y-4">
            {/* Maßnahmenart */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maßnahmenart</label>
              <select
                value={massnahmeArt}
                onChange={e => setMassnahmeArt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Bitte wählen…</option>
                {massnahmeArtOptions.map((opt: { key: string; label: string }) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Datum Maßnahme */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Datum der Maßnahme</label>
              <input
                type="date"
                value={datumMassnahme}
                onChange={e => setDatumMassnahme(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Zustand nach Maßnahme */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Zustand nach Maßnahme <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <select
                value={zustandNachMassnahme}
                onChange={e => setZustandNachMassnahme(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Bitte wählen…</option>
                {zustandNachMassnahmeOptions.map((opt: { key: string; label: string }) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dienstleister */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Dienstleister <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={dienstleister}
                  onChange={e => setDienstleister(e.target.value)}
                  placeholder="z. B. Werkstatt Müller"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Kosten */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Kosten (€) <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kosten}
                  onChange={e => setKosten(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Nächste Wartung */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nächste Wartung <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={naechsteWartung}
                onChange={e => setNaechsteWartung(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Beschreibung */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Beschreibung <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={beschreibung}
                onChange={e => setBeschreibung(e.target.value)}
                rows={3}
                placeholder="Beschreibe den Schaden oder die durchgeführte Maßnahme…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {step3Error && (
              <p className="text-sm text-destructive">{step3Error}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={handleStep3Submit}
                disabled={step3Submitting || !massnahmeArt}
                className="gap-2 flex-1 sm:flex-none"
              >
                {step3Submitting ? 'Wird angelegt…' : 'Wartung anlegen'}
                {!step3Submitting && <IconArrowRight size={16} />}
              </Button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconPlayerSkipForward size={15} />
                Überspringen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Abschluss ── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-green-600" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Rückgabe erfolgreich erfasst</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Das Werkzeug wurde zurückgebucht.
              </p>
            </div>
          </div>

          {/* Summary card */}
          {selectedAusleihe && (
            <div className="rounded-2xl border bg-card p-5 space-y-3 overflow-hidden">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Zusammenfassung
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Werkzeug</span>
                  <span className="font-medium truncate max-w-[60%] text-right">{werkzeugName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Mitarbeiter</span>
                  <span className="font-medium truncate max-w-[60%] text-right">{mitarbeiterName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Rückgabedatum</span>
                  <span className="font-medium">{formatDT(rueckgabeDatum)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Zustand</span>
                  <span className={`font-medium ${isDamaged ? 'text-amber-600' : ''}`}>
                    {zustandRueckgabeLabel || '—'}
                  </span>
                </div>
              </div>

              {wartungCreated && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <IconTool size={12} className="text-amber-600" stroke={2} />
                  </div>
                  <span className="text-amber-700 font-medium">Wartungsmaßnahme angelegt</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleReset} variant="outline" className="gap-2 flex-1 sm:flex-none">
              <IconRefresh size={16} />
              Weitere Rückgabe
            </Button>
            <a
              href="#/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-none text-center"
            >
              Zurück zum Dashboard
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
