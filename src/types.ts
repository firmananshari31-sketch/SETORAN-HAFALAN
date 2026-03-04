export interface Student {
  id: string;
  name: string;
}

export interface Surah {
  name: string;
  totalAyat: number;
}

export interface MemorizationLog {
  id?: number;
  student_name: string;
  surah_name: string;
  start_ayat: number;
  end_ayat: number;
  date: string;
  grade: 'A' | 'B' | 'C' | 'D';
}
