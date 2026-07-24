import type { WartungReparatur, Werkzeugverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WartungReparaturViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: WartungReparatur | null;
  onEdit: (record: WartungReparatur) => void;
  werkzeugverwaltungList: Werkzeugverwaltung[];
}

export function WartungReparaturViewDialog({ open, onClose, record, onEdit, werkzeugverwaltungList }: WartungReparaturViewDialogProps) {
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
          <DialogTitle>Wartung & Reparatur anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Werkzeug</Label>
            <p className="text-sm">{getWerkzeugverwaltungDisplayName(record.fields.werkzeug)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Art der Maßnahme</Label>
            <Badge variant="secondary">{record.fields.massnahme_art?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Maßnahme</Label>
            <p className="text-sm">{formatDate(record.fields.datum_massnahme)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dienstleister / Werkstatt</Label>
            <p className="text-sm">{record.fields.dienstleister ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kosten (€)</Label>
            <p className="text-sm">{record.fields.kosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste geplante Wartung</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_wartung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand nach Maßnahme</Label>
            <Badge variant="secondary">{record.fields.zustand_nach_massnahme?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung der Maßnahme</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument / Rechnung</Label>
            {record.fields.dokument ? (
              <MediaThumbnail src={record.fields.dokument} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.WARTUNG_REPARATUR} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}