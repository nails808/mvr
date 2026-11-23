/**
 * Per-bank receipt templates.
 * To redesign a bank page: edit receiptTemplates/<bank>.js only
 * (or replace it from a screenshot-based HTML recreation).
 */
import * as commbank from './commbank.js';
import * as westpac from './westpac.js';
import * as anz from './anz.js';
import * as nab from './nab.js';
import * as up from './up.js';

const REGISTRY = {
  commbank,
  westpac,
  anz,
  nab,
  up,
};

export function renderBankReceipt(bank, data) {
  const mod = REGISTRY[bank] || REGISTRY.commbank;
  return mod.render(data);
}

export function listBanks() {
  return Object.keys(REGISTRY);
}
