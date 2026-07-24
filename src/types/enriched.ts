import type { AusleiheRueckgabe, WartungReparatur } from './app';

export type EnrichedAusleiheRueckgabe = AusleiheRueckgabe & {
  mitarbeiterName: string;
  werkzeugName: string;
};

export type EnrichedWartungReparatur = WartungReparatur & {
  werkzeugName: string;
};
