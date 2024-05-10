import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WordCounterService {
  constructor() {}

  counter(words: string) {
    let wordCount = 0;
    if (words) {
      const textReplaced = words.replace(/(<(\/?p)>)|(&nbsp;)/gi, ' ').replace(/(<([^>]+)>)/gi, '');
      const splitWords = textReplaced.split(' ');
      if (splitWords.length) {
        wordCount = 0;
        splitWords.map(item => {
          if (item === '' || item === '\n' || item === '\t') return;
          wordCount++;
        });
      } else {
        return 0;
      }
    } else {
      return 0;
    }
    return wordCount;
  }
}
