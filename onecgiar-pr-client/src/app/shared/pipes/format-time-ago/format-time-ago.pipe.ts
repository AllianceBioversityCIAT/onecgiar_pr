import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appFormatTimeAgo'
})
export class FormatTimeAgoPipe implements PipeTransform {
  transform(value: Date | string | number): string {
    const date = new Date(value);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      // less than a minute
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      // less than an hour
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minutes ago`;
    } else if (diffInSeconds < 86400) {
      // less than a day
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hours ago`;
    } else if (diffInSeconds < 2592000) {
      // less than a month
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} days ago`;
    } else if (diffInSeconds < 31536000) {
      // less than a year
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} months ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} years ago`;
    }
  }
}
