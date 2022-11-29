import { Column } from 'typeorm';

export class DepthSearch {
  public id: string;
  public title: string;
  public description!: string;
  public crp: string;
  public year: number;
  public legacy: number;
}
