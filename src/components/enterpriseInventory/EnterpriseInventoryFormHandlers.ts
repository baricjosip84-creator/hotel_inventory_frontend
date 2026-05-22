import type { FormEvent } from 'react';

export function createEnterpriseInventoryFormSubmitHandler(submit: () => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };
}
