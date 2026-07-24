import type { Mitarbeiterverwaltung, AusleiheRueckgabe } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface MitarbeiterverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Mitarbeiterverwaltung;
  /** 1:N „Ausleihe & Rückgabe": VOLLE Liste — der Block filtert auf diesen Record. */
  ausleiheRueckgabeList: AusleiheRueckgabe[];
  /** Zeilen-Klick → overlay.push auf das AusleiheRueckgabe-Detail (nie der Edit-Dialog). */
  onOpenAusleiheRueckgabe: (record: AusleiheRueckgabe) => void;
  /** Kontextuelles „+": öffnet den AusleiheRueckgabe-Dialog mit diesem Record vorgesetzt. */
  onAddAusleiheRueckgabe: () => void;
}

export function MitarbeiterverwaltungDetails({
  record,
  ausleiheRueckgabeList,
  onOpenAusleiheRueckgabe,
  onAddAusleiheRueckgabe,
}: MitarbeiterverwaltungDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Vorname" value={record.fields.vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.nachname} format="text" />
        <RecordField label="Personalnummer" value={record.fields.personalnummer} format="text" />
        <RecordField label="Abteilung" value={record.fields.abteilung} format="pill" />
        <RecordField label="Telefonnummer" value={record.fields.telefon} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.email} format="email" />
      </RecordSection>

      <SatelliteSection
        title="Ausleihe & Rückgabe"
        items={ausleiheRueckgabeList.filter(r => extractRecordId(r.fields.mitarbeiter) === record.record_id)}
        map={r => ({ name: r.fields.einsatzort ?? 'Ausleihe & Rückgabe', meta: r.fields.ausleihdatum })}
        onOpen={onOpenAusleiheRueckgabe}
        onAdd={onAddAusleiheRueckgabe}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MITARBEITERVERWALTUNG} recordId={record.record_id} />
    </>
  );
}
