import { ES_SHELL } from './es/shell';
import { ES_CATALOG } from './es/catalog';
import { ES_ACCOUNTS } from './es/accounts';
import { ES_LANDING } from './es/landing';
import { ES_LIFECYCLE } from './es/lifecycle';
import { ES_BUYER } from './es/buyer';
import { ES_SEARCH } from './es/search';
import { ES_EMBED } from './es/embed';
import { ES_BOOKLET } from './es/booklet';
import { ES_VIEWINGS } from './es/viewings';
import { ES_ALERTS } from './es/alerts';
import { ES_PROMO } from './es/promo';
import { ES_SEO } from './es/seo';

/** Іспанський словник: англійський рядок → переклад. Розбитий на файли за розділами сайту. */
export const ES: Record<string, string> = {
  ...ES_SHELL,
  ...ES_CATALOG,
  ...ES_ACCOUNTS,
  ...ES_LANDING,
  ...ES_LIFECYCLE,
  ...ES_BUYER,
  ...ES_SEARCH,
  ...ES_EMBED,
  ...ES_BOOKLET,
  ...ES_VIEWINGS,
  ...ES_ALERTS,
  ...ES_PROMO,
  ...ES_SEO,
};
