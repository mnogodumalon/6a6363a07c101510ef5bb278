// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    personalnummer?: string;
    abteilung?: LookupValue;
    telefon?: string;
    email?: string;
  };
}

export interface Werkzeugverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    inventarnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    seriennummer?: string;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    naechste_pruefung?: string; // Format: YYYY-MM-DD oder ISO String
    standort?: string;
    zustand?: LookupValue;
    anmerkungen?: string;
    foto?: string;
  };
}

export interface AusleiheRueckgabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    werkzeug?: string; // applookup -> URL zu 'Werkzeugverwaltung' Record
    ausleihdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplante_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    einsatzort?: string;
    rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand_rueckgabe?: LookupValue;
    bemerkungen?: string;
  };
}

export interface WartungReparatur {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug?: string; // applookup -> URL zu 'Werkzeugverwaltung' Record
    massnahme_art?: LookupValue;
    datum_massnahme?: string; // Format: YYYY-MM-DD oder ISO String
    dienstleister?: string;
    kosten?: number;
    naechste_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    zustand_nach_massnahme?: LookupValue;
    beschreibung?: string;
    dokument?: string;
  };
}

export const APP_IDS = {
  MITARBEITERVERWALTUNG: '6a63637c96666d48d1774efb',
  WERKZEUGVERWALTUNG: '6a636381c03a0fca3a33b85b',
  AUSLEIHE_RUECKGABE: '6a63638134d98e10b647f8fe',
  WARTUNG_REPARATUR: '6a636382e82806c0e3e1e8fa',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeiterverwaltung': {
    abteilung: [{ key: "montage", label: "Montage" }, { key: "installation", label: "Installation" }, { key: "planung", label: "Planung" }, { key: "lager", label: "Lager" }, { key: "verwaltung", label: "Verwaltung" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'werkzeugverwaltung': {
    kategorie: [{ key: "handwerkzeug", label: "Handwerkzeug" }, { key: "elektrowerkzeug", label: "Elektrowerkzeug" }, { key: "messgeraet", label: "Messgerät" }, { key: "pruefgeraet", label: "Prüfgerät" }, { key: "schutzausruestung", label: "Schutzausrüstung" }, { key: "sonstiges", label: "Sonstiges" }, { key: "leiter_geruestung", label: "Leiter / Gerüst" }],
    zustand: [{ key: "neuwertig", label: "Neuwertig" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "reparaturbeduerftigt", label: "Reparaturbedürftig" }, { key: "ausser_betrieb", label: "Außer Betrieb" }],
  },
  'ausleihe_&_rueckgabe': {
    zustand_rueckgabe: [{ key: "einwandfrei", label: "Einwandfrei" }, { key: "leichte_gebrauchsspuren", label: "Leichte Gebrauchsspuren" }, { key: "beschaedigt", label: "Beschädigt" }, { key: "verloren", label: "Verloren" }],
  },
  'wartung_&_reparatur': {
    massnahme_art: [{ key: "routinewartung", label: "Routinewartung" }, { key: "reparatur", label: "Reparatur" }, { key: "pruefung_inspektion", label: "Prüfung / Inspektion" }, { key: "kalibrierung", label: "Kalibrierung" }, { key: "reinigung", label: "Reinigung" }, { key: "sonstiges", label: "Sonstiges" }],
    zustand_nach_massnahme: [{ key: "einwandfrei", label: "Einwandfrei" }, { key: "eingeschraenkt", label: "Eingeschränkt einsatzbereit" }, { key: "ausser_betrieb", label: "Außer Betrieb" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitarbeiterverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'personalnummer': 'string/text',
    'abteilung': 'lookup/select',
    'telefon': 'string/tel',
    'email': 'string/email',
  },
  'werkzeugverwaltung': {
    'bezeichnung': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'seriennummer': 'string/text',
    'kaufdatum': 'date/date',
    'naechste_pruefung': 'date/date',
    'standort': 'string/text',
    'zustand': 'lookup/radio',
    'anmerkungen': 'string/textarea',
    'foto': 'file',
  },
  'ausleihe_&_rueckgabe': {
    'mitarbeiter': 'applookup/select',
    'werkzeug': 'applookup/select',
    'ausleihdatum': 'date/datetimeminute',
    'geplante_rueckgabe': 'date/date',
    'einsatzort': 'string/text',
    'rueckgabedatum': 'date/datetimeminute',
    'zustand_rueckgabe': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
  'wartung_&_reparatur': {
    'werkzeug': 'applookup/select',
    'massnahme_art': 'lookup/select',
    'datum_massnahme': 'date/date',
    'dienstleister': 'string/text',
    'kosten': 'number',
    'naechste_wartung': 'date/date',
    'zustand_nach_massnahme': 'lookup/radio',
    'beschreibung': 'string/textarea',
    'dokument': 'file',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;
export type CreateWerkzeugverwaltung = StripLookup<Werkzeugverwaltung['fields']>;
export type CreateAusleiheRueckgabe = StripLookup<AusleiheRueckgabe['fields']>;
export type CreateWartungReparatur = StripLookup<WartungReparatur['fields']>;