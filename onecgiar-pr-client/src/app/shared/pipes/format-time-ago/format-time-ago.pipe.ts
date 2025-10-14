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

    const localTimezoneOffset = new Date().getTimezoneOffset() / 60;
    const localDate = subHours(date, localTimezoneOffset);

    const now = new Date();
    const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

    if (now.getTime() - localDate.getTime() > oneWeekInMilliseconds) {
      return format(localDate, 'yyyy MMM dd', { locale: enUS });
    }

    return `${formatDistanceToNowStrict(localDate, { addSuffix: false, locale: enUS })} ${showAgo ? 'ago' : ''}`;
  }
}
