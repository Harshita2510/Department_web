export const syllabusProgrammes = [
  {
    id: 'ug-cse',
    level: 'Undergraduate programme',
    title: 'B.Tech. Computer Engineering',
    duration: '4 years — 8 semesters',
    semesters: Array.from({ length: 8 }, (_, index) => ({
      number: index + 1,
      label: `B.Tech. CE Semester ${index + 1}`,
      subjects: []
    }))
  },
  {
    id: 'pg-cse',
    level: 'Postgraduate programme',
    title: 'M.Tech. Computer Engineering',
    duration: '2 years — 4 semesters',
    semesters: Array.from({ length: 4 }, (_, index) => ({
      number: index + 1,
      label: `M.Tech. CE Semester ${index + 1}`,
      subjects: []
    }))
  }
];
