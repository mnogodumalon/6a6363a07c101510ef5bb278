import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { AusleiheRueckgabe, Mitarbeiterverwaltung, Werkzeugverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { AusleiheRueckgabeDialog } from '@/components/dialogs/AusleiheRueckgabeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/AusleiheRueckgabe';
import { evalComputed } from '@/config/form-enhancements/types';

export default function AusleiheRueckgabeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AusleiheRueckgabe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mitarbeiterverwaltungList, setMitarbeiterverwaltungList] = useState<Mitarbeiterverwaltung[]>([]);
  const [werkzeugverwaltungList, setWerkzeugverwaltungList] = useState<Werkzeugverwaltung[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, mitarbeiterverwaltungData, werkzeugverwaltungData] = await Promise.all([
        LivingAppsService.getAusleiheRueckgabe(),
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getWerkzeugverwaltung(),
      ]);
      setMitarbeiterverwaltungList(mitarbeiterverwaltungData);
      setWerkzeugverwaltungList(werkzeugverwaltungData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: AusleiheRueckgabe['fields']) {
    if (!record) return;
    await LivingAppsService.updateAusleiheRueckgabeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteAusleiheRueckgabeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/ausleihe-&-rueckgabe');
  }

  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  function getWerkzeugverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return werkzeugverwaltungList.find(r => r.record_id === refId)?.fields.bezeichnung ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/ausleihe-&-rueckgabe')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/ausleihe-&-rueckgabe')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.einsatzort ?? 'Ausleihe & Rückgabe'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          mitarbeiter: mitarbeiterverwaltungList,
          werkzeug: werkzeugverwaltungList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Mitarbeiter" value={getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter)} format="text" />
        <RecordField label="Werkzeug" value={getWerkzeugverwaltungDisplayName(record.fields.werkzeug)} format="text" />
        <RecordField label="Ausleihdatum" value={record.fields.ausleihdatum} format="datetime" />
        <RecordField label="Geplantes Rückgabedatum" value={record.fields.geplante_rueckgabe} format="date" />
        <RecordField label="Einsatzort / Baustelle" value={record.fields.einsatzort} format="text" />
        <RecordField label="Rückgabedatum" value={record.fields.rueckgabedatum} format="datetime" />
        <RecordField label="Zustand bei Rückgabe" value={record.fields.zustand_rueckgabe} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUSLEIHE_RUECKGABE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <AusleiheRueckgabeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        mitarbeiterverwaltungList={mitarbeiterverwaltungList}
        werkzeugverwaltungList={werkzeugverwaltungList}
        enablePhotoScan={AI_PHOTO_SCAN['AusleiheRueckgabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['AusleiheRueckgabe']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Ausleihe & Rückgabe löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
