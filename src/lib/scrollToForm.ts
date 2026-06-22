export function scrollToFormSection(sectionId: string): void {
  window.setTimeout(() => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    const focusTarget = section.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)'
    );

    focusTarget?.focus({ preventScroll: true });
  }, 0);
}
