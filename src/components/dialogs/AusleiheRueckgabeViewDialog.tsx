import type { AusleiheRueckgabe, Mitarbeiterverwaltung, Werkzeugverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AusleiheRueckgabeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: AusleiheRueckgabe | null;
  onEdit: (record: AusleiheRueckgabe) => void;
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  werkzeugverwaltungList: Werkzeugverwaltung[];
}

export function AusleiheRueckgabeViewDialog({ open, onClose, record, onEdit, mitarbeiterverwaltungList, werkzeugverwaltungList }: AusleiheRueckgabeViewDialogProps) {
  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getWerkzeugverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugverwaltungList.find(r => r.record_id === id)?.fields.bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ausleihe & Rückgabe anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Werkzeug</Label>
            <p className="text-sm">{getWerkzeugverwaltungDisplayName(record.fields.werkzeug)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausleihdatum</Label>
            <p className="text-sm">{formatDate(record.fields.ausleihdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Rückgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.geplante_rueckgabe)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einsatzort / Baustelle</Label>
            <p className="text-sm">{record.fields.einsatzort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rückgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.rueckgabedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand bei Rückgabe</Label>
            <Badge variant="secondary">{record.fields.zustand_rueckgabe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.AUSLEIHE_RUECKGABE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}