/*
  Homepage-specific JavaScript for the SGSITS CE Phase 1 homepage.

  Shared site behaviour remains in main.js.
*/

/*
  Dropdown navigation:
  Top-level tabs are hover-only labels.
  Clicking a dropdown tab does not open, close, or otherwise change it.
  Individual dropdown links remain clickable.
*/

document.querySelectorAll('.main-nav .nav-group > button').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
});