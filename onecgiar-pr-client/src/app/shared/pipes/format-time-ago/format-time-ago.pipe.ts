import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNowStrict, parseISO, subHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
@Pipe({
  name: 'appFormatTimeAgo'
})
export class FormatTimeAgoPipe implements PipeTransform {
  transform(value: string | number | Date, serverTimezone: number = 0): string {
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

    return `${formatDistanceToNowStrict(localDate, { addSuffix: false, locale: enUS })} ago`;
  }
}
