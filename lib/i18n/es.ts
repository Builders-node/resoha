import { ES_SHELL } from './es/shell';
import { ES_CATALOG } from './es/catalog';
import { ES_ACCOUNTS } from './es/accounts';
import { ES_LANDING } from './es/landing';
import { ES_LIFECYCLE } from './es/lifecycle';

/** Іспанський словник: англійський рядок → переклад. Розбитий на файли за розділами сайту. */
export const ES: Record<string, string> = {
  ...ES_SHELL,
  ...ES_CATALOG,
  ...ES_ACCOUNTS,
  ...ES_LANDING,
  ...ES_LIFECYCLE,
};
