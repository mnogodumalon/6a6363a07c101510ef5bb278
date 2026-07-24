import type { WartungReparatur, Werkzeugverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface WartungReparaturDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: WartungReparatur;
  /** N:1-Ziel „Werkzeugverwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  werkzeugverwaltungList: Werkzeugverwaltung[];
  /** Klick auf die Werkzeugverwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenWerkzeugverwaltung?: (record: Werkzeugverwaltung) => void;
}

export function WartungReparaturDetails({
  record,
  werkzeugverwaltungList,
  onOpenWerkzeugverwaltung,
}: WartungReparaturDetailsProps) {
  const werkzeugTarget = werkzeugverwaltungList.find(r => r.record_id === extractRecordId(record.fields.werkzeug));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Art der Maßnahme" value={record.fields.massnahme_art} format="pill" />
        <RecordField label="Datum der Maßnahme" value={record.fields.datum_massnahme} format="date" />
        <RecordField label="Dienstleister / Werkstatt" value={record.fields.dienstleister} format="text" />
        <RecordField label="Kosten (€)" value={record.fields.kosten} format="text" />
        <RecordField label="Nächste geplante Wartung" value={record.fields.naechste_wartung} format="date" />
        <RecordField label="Zustand nach Maßnahme" value={record.fields.zustand_nach_massnahme} format="pill" />
        <RecordField label="Beschreibung der Maßnahme" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Dokument / Rechnung" className="md:col-span-2">
          {record.fields.dokument ? (
            <MediaThumbnail src={record.fields.dokument as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Werkzeug"
          name={werkzeugTarget?.fields.bezeichnung ?? '—'}
          meta={[werkzeugTarget?.fields.inventarnummer, werkzeugTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={werkzeugTarget && onOpenWerkzeugverwaltung ? () => onOpenWerkzeugverwaltung!(werkzeugTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WARTUNG_REPARATUR} recordId={record.record_id} />
    </>
  );
}
