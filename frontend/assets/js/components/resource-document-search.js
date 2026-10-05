export function bindResourceDocumentSearch({ input, container }) {
  if (!input || !container) return;

  const empty = document.createElement('p');
  empty.className = 'resource-search-empty';
  empty.hidden = true;
  empty.textContent = 'No published documents match your search.';
  container.after(empty);

  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visibleProgrammes = 0;

    container.querySelectorAll('.programme').forEach((programme) => {
      const heading = programme.querySelector('.programme-heading')?.textContent.toLocaleLowerCase() || '';
      const programmeMatches = Boolean(query) && heading.includes(query);
      let visibleDocuments = 0;

      programme.querySelectorAll('.resource-document').forEach((documentRow) => {
        const visible = !query || programmeMatches || documentRow.textContent.toLocaleLowerCase().includes(query);
        documentRow.hidden = !visible;
        if (visible) visibleDocuments += 1;
      });

      programme.querySelectorAll('.semester-group').forEach((semester) => {
        const semesterMatches = Boolean(query) && semester.querySelector('summary')?.textContent.toLocaleLowerCase().includes(query);
        if (semesterMatches && !programmeMatches) {
          semester.querySelectorAll('.resource-document[hidden]').forEach((row) => {
            row.hidden = false;
            visibleDocuments += 1;
          });
        }
        const hasVisibleDocument = [...semester.querySelectorAll('.resource-document')].some((row) => !row.hidden);
        semester.closest('.semester-item').hidden = Boolean(query) && !programmeMatches && !semesterMatches && !hasVisibleDocument;
      });

      const visible = !query || programmeMatches || visibleDocuments > 0 || [...programme.querySelectorAll('.semester-item')].some((item) => !item.hidden);
      programme.hidden = !visible;
      if (visible) visibleProgrammes += 1;
    });

    empty.hidden = visibleProgrammes > 0;
  });
}
