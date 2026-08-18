import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNowStrict, parseISO, subHours, format } from 'date-fns';
import { enUS } from 'date-fns/locale';

@Pipe({
  name: 'appFormatTimeAgo',
  standalone: true
})
export class FormatTimeAgoPipe implements PipeTransform {
  transform(value: string | number | Date, serverTimezone: number = 0, showAgo: boolean = true): string {
    let date: Date;

    if (typeof value === 'string') {
      date = parseISO(value);
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    // Adjust for server timezone if not UTC
    if (serverTimezone !== 0) {
      date = subHours(date, serverTimezone);
    }

    // Relative/elapsed time is timezone-agnostic: `date` is already a correct
    // absolute (UTC) instant and `now` is absolute too, so their difference is
    // valid for every viewer. Do NOT subtract the viewer's local offset here —
    // that shifted every "time ago" by the viewer's UTC offset (e.g. showed a
    // just-created item as "5 hours ago" in UTC-5). The >1-week absolute-date
    // fallback uses the native Date, which `format` renders in the viewer's
    // local day by design.
    const now = new Date();
    const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

    if (now.getTime() - date.getTime() > oneWeekInMilliseconds) {
      return format(date, 'yyyy MMM dd', { locale: enUS });
    }

    return `${formatDistanceToNowStrict(date, { addSuffix: false, locale: enUS })} ${showAgo ? 'ago' : ''}`;
  }
}
