import type { EnrichedAusleiheRueckgabe, EnrichedWartungReparatur } from '@/types/enriched';
import type { AusleiheRueckgabe, Mitarbeiterverwaltung, WartungReparatur, Werkzeugverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AusleiheRueckgabeMaps {
  mitarbeiterverwaltungMap: Map<string, Mitarbeiterverwaltung>;
  werkzeugverwaltungMap: Map<string, Werkzeugverwaltung>;
}

export function enrichAusleiheRueckgabe(
  ausleiheRueckgabe: AusleiheRueckgabe[],
  maps: AusleiheRueckgabeMaps
): EnrichedAusleiheRueckgabe[] {
  return ausleiheRueckgabe.map(r => ({
    ...r,
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeiterverwaltungMap, 'vorname', 'nachname'),
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugverwaltungMap, 'bezeichnung'),
  }));
}

interface WartungReparaturMaps {
  werkzeugverwaltungMap: Map<string, Werkzeugverwaltung>;
}

export function enrichWartungReparatur(
  wartungReparatur: WartungReparatur[],
  maps: WartungReparaturMaps
): EnrichedWartungReparatur[] {
  return wartungReparatur.map(r => ({
    ...r,
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugverwaltungMap, 'bezeichnung'),
  }));
}
