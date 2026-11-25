// Tiny Bot: two-tier dip buyer for the Solana hourly bars replay.
//
// Idea: on this universe the hourly closes mean-revert in small steps — a
// symbol that has slipped a few percent under its own 24-hour high usually
// bounces part of the way back within a day, while a symbol that keeps
// falling keeps falling. So the bot buys dips in two tiers and exits fast:
//
//   tier 1 — close >= 4% under the 24h high of closes: full stake,
//            exit at +3% over cost, -8% under cost, or after 24 bars.
//   tier 2 — close >= 2% under the 24h high: half stake,
//            exit at +1.5% over cost, -8% under cost, or after 8 bars.
//
// Tier 2 exists so the bot still trades (and still banks the small bounces)
// on quiet stretches where no symbol ever drops 4% — a window with no
// 4% dip at all still has 2% dips to scalp. Every decision is integer
// arithmetic on raw closes and costs, so the two grading runs agree
// byte for byte: no clock, no randomness, no environment, no network.
//
// Sizing: one stake is equity / 7 (one per universe symbol), capped at the
// 25% max-weight cap; a tier-2 buy is half a stake. Buys are sized from
// the cash on hand only — a sell decided on the same bar pays out at the
// next open and never funds a buy of the same reply. Slippage is capped
// at 100 bps past the close the order was decided on.

import { BPS, runBars, type BarsState, type BuyInput, type OrderInput, type SellInput } from './vendor/makefun-bars.ts';

/** Bars of closes the dip is measured against (one day of hourly bars). */
const LOOKBACK_BARS = 24;
/** Tier 1: 400 bps under the 24h high. Tier 2: 200 bps. */
const TIER1_DROP_BPS = 400n;
const TIER2_DROP_BPS = 200n;
/** Tier 1 exits at +300 bps over cost; tier 2 at +150 bps. */
const TIER1_ROI_BPS = 300n;
const TIER2_ROI_BPS = 150n;
/** Both tiers stop out at -800 bps under cost. */
const STOP_BPS = 800n;
/** Tier 1 holds at most 24 bars; tier 2 at most 8. */
const TIER1_HOLD_BARS = 24;
const TIER2_HOLD_BARS = 8;
/** Slippage cap, in bps past the close the order was decided on. */
const MAX_SLIPPAGE_BPS = 100;

interface Entry {
  /** The seq of the bar whose close the buy was decided on. */
  bar: number;
  /** 1 for a full-stake dip buy, 2 for a half-stake scalp buy. */
  tier: 1 | 2;
}

/** Each symbol's closes so far, oldest first. */
const closes = new Map<string, bigint[]>();
/** The open dip position of each symbol, if any. */
const entries = new Map<string, Entry>();

/** The highest close of the last LOOKBACK_BARS bars, current bar included.
 * Needs LOOKBACK_BARS + 1 closes seen: the first bar seeds the window, so
 * the first dip the bot can act on is the close after a full day of bars. */
function high24(symbol: string): bigint | null {
  const cs = closes.get(symbol);
  if (cs === undefined || cs.length < LOOKBACK_BARS + 1) return null;
  let hi = cs[cs.length - 1];
  for (let i = cs.length - LOOKBACK_BARS; i < cs.length; i++) {
    if (cs[i]! > hi) hi = cs[i]!;
  }
  return hi;
}

/** Whether a held position exits on this close: ROI, stop, or too old. */
function exits(state: BarsState, symbol: string, held: { qty: bigint; cost: bigint }): boolean {
  const entry = entries.get(symbol);
  if (entry === undefined) return true; // no record of the entry: close it out
  const value = state.value(symbol, held.qty);
  const roi = entry.tier === 1 ? TIER1_ROI_BPS : TIER2_ROI_BPS;
  const hold = entry.tier === 1 ? TIER1_HOLD_BARS : TIER2_HOLD_BARS;
  if (value * BPS >= held.cost * (BPS + roi)) return true;
  if (value * BPS <= held.cost * (BPS - STOP_BPS)) return true;
  return state.seq - entry.bar >= hold;
}

await runBars({
  onBatch(state, batch) {
    const fresh = new Set<string>();
    for (const bar of batch.bars) {
      const cs = closes.get(bar.symbol) ?? [];
      cs.push(BigInt(bar.c));
      closes.set(bar.symbol, cs);
      fresh.add(bar.symbol);
    }
    if (state.warmingUp) return [];

    const sells: SellInput[] = [];
    const buys: { symbol: string; tier: 1 | 2 }[] = [];
    for (const { symbol } of state.hello.symbols) {
      if (!fresh.has(symbol)) continue;
      const close = state.close(symbol);
      if (close === null) continue;
      const held = state.positions.get(symbol);
      if (held !== undefined) {
        if (exits(state, symbol, held)) {
          sells.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
          entries.delete(symbol);
        }
        continue;
      }
      const hi = high24(symbol);
      if (hi === null) continue;
      if (close * BPS <= hi * (BPS - TIER1_DROP_BPS)) buys.push({ symbol, tier: 1 });
      else if (close * BPS <= hi * (BPS - TIER2_DROP_BPS)) buys.push({ symbol, tier: 2 });
    }

    const orders: OrderInput[] = sells.slice(0, state.hello.caps.max_orders_per_bar);
    const stake = state.equity / BigInt(state.hello.symbols.length);
    const byWeight = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / BPS;
    const full = stake < byWeight ? stake : byWeight;
    let cash = state.cash;
    for (const { symbol, tier } of buys) {
      if (orders.length >= state.hello.caps.max_orders_per_bar) break;
      let size = tier === 1 ? full : full / 2n;
      if (cash < size) size = cash;
      if (size === 0n || size < BigInt(state.hello.fees.min_notional_quote_units)) break;
      orders.push({ side: 'buy', symbol, notional_quote_units: size, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput);
      cash -= size;
      entries.set(symbol, { bar: state.seq, tier });
    }
    return orders;
  },
});
