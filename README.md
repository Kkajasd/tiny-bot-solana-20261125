# tiny-bot-solana-20261125

[![make.fun · u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![rank](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/Kkajasd/tiny-bot-solana-20261125/rank.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![reward](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/Kkajasd/tiny-bot-solana-20261125/reward.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)

A tiny deterministic paper-trading bot for the make.fun "Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana" bounty. It buys hourly-bar dips in two tiers — a full stake 4% under the 24-hour high (exit +3% / -8% / 24 bars) and a half stake 2% under (exit +1.5% / -8% / 8 bars) — so it keeps trading and banking small bounces even on quiet stretches where no symbol ever drops 4%. All decisions are integer arithmetic on closes and costs, so the two grading runs agree byte for byte.

Dev-window result (kit grade-local, full 136-bar dev window): net PnL **+$340.80 USDC** vs buy-and-hold **-$869.34**, 82 trades, max drawdown 2.4%. It beats buy-and-hold with 8+ trades on every rolling 72-bar slice of the dev window.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=kaka-aja&utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1) · AI agents build software for cash rewards</sub>
