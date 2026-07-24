import type { Werkzeugverwaltung, AusleiheRueckgabe, WartungReparatur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface WerkzeugverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Werkzeugverwaltung;
  /** 1:N „Ausleihe & Rückgabe": VOLLE Liste — der Block filtert auf diesen Record. */
  ausleiheRueckgabeList: AusleiheRueckgabe[];
  /** Zeilen-Klick → overlay.push auf das AusleiheRueckgabe-Detail (nie der Edit-Dialog). */
  onOpenAusleiheRueckgabe: (record: AusleiheRueckgabe) => void;
  /** Kontextuelles „+": öffnet den AusleiheRueckgabe-Dialog mit diesem Record vorgesetzt. */
  onAddAusleiheRueckgabe: () => void;
  /** 1:N „Wartung & Reparatur": VOLLE Liste — der Block filtert auf diesen Record. */
  wartungReparaturList: WartungReparatur[];
  /** Zeilen-Klick → overlay.push auf das WartungReparatur-Detail (nie der Edit-Dialog). */
  onOpenWartungReparatur: (record: WartungReparatur) => void;
  /** Kontextuelles „+": öffnet den WartungReparatur-Dialog mit diesem Record vorgesetzt. */
  onAddWartungReparatur: () => void;
}

export function WerkzeugverwaltungDetails({
  record,
  ausleiheRueckgabeList,
  onOpenAusleiheRueckgabe,
  onAddAusleiheRueckgabe,
  wartungReparaturList,
  onOpenWartungReparatur,
  onAddWartungReparatur,
}: WerkzeugverwaltungDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Bezeichnung" value={record.fields.bezeichnung} format="text" />
        <RecordField label="Inventarnummer" value={record.fields.inventarnummer} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Hersteller" value={record.fields.hersteller} format="text" />
        <RecordField label="Modell" value={record.fields.modell} format="text" />
        <RecordField label="Seriennummer" value={record.fields.seriennummer} format="text" />
        <RecordField label="Kaufdatum" value={record.fields.kaufdatum} format="date" />
        <RecordField label="Nächste Prüfung" value={record.fields.naechste_pruefung} format="date" />
        <RecordField label="Standort / Lagerort" value={record.fields.standort} format="text" />
        <RecordField label="Zustand" value={record.fields.zustand} format="pill" />
        <RecordField label="Anmerkungen" value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label="Foto des Werkzeugs" className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title="Ausleihe & Rückgabe"
        items={ausleiheRueckgabeList.filter(r => extractRecordId(r.fields.werkzeug) === record.record_id)}
        map={r => ({ name: r.fields.einsatzort ?? 'Ausleihe & Rückgabe', meta: r.fields.ausleihdatum })}
        onOpen={onOpenAusleiheRueckgabe}
        onAdd={onAddAusleiheRueckgabe}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title="Wartung & Reparatur"
        items={wartungReparaturList.filter(r => extractRecordId(r.fields.werkzeug) === record.record_id)}
        map={r => ({ name: r.fields.dienstleister ?? 'Wartung & Reparatur', meta: r.fields.datum_massnahme })}
        onOpen={onOpenWartungReparatur}
        onAdd={onAddWartungReparatur}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.WERKZEUGVERWALTUNG} recordId={record.record_id} />
    </>
  );
}
