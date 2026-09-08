declare module 'country-list' {
  export interface CountryData {
    code: string;
    name: string;
  }

  export function getData(): CountryData[];
}