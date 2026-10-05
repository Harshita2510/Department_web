export const timetableProgrammes = [
  {
    id: 'ug-cse', level: 'Undergraduate programme', title: 'B.Tech. Computer Engineering', duration: '4 years — 8 semesters',
    semesters: Array.from({ length:8 }, (_, index) => ({ number:index + 1, timetableFiles:{} }))
  },
  {
    id: 'pg-cse', level: 'Postgraduate programme', title: 'M.Tech. Computer Engineering', duration: '2 years — 4 semesters',
    semesters: Array.from({ length:4 }, (_, index) => ({ number:index + 1, timetableFiles:{} }))
  }
];
