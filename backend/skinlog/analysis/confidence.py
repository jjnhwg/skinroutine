"""How sure a difference in breakout rates is: "strong" or "weak" (too few to tell).

Two groups of days, with breakouts counted in each. If breakouts were spread evenly
over days, each of the n breakouts would land in group A with probability
a_days / (a_days + b_days). The exact two-sided binomial test asks how likely a split
at least this lopsided is by chance; under 5% counts as a strong signal.

Example: 2 breakouts in 14 days before a trial, 4 in 14 during. That looks twice as
bad, but a 2-vs-4 split happens by chance often (p ≈ 0.69), so it's "weak".
"""

from math import exp, lgamma, log

STRONG_P = 0.05


def _log_pmf(k: int, n: int, p: float) -> float:
    if p <= 0:
        return 0.0 if k == 0 else float("-inf")
    if p >= 1:
        return 0.0 if k == n else float("-inf")
    return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * log(p) + (n - k) * log(1 - p)


def p_value(a_events: int, a_days: int, b_events: int, b_days: int) -> float:
    """Two-sided exact binomial test that both groups share one breakout rate."""
    n = a_events + b_events
    if n == 0 or a_days == 0 or b_days == 0:
        return 1.0
    p = a_days / (a_days + b_days)
    observed = _log_pmf(a_events, n, p)
    # Sum every outcome no more likely than the observed one (small slack for float error).
    total = sum(exp(lp) for k in range(n + 1) if (lp := _log_pmf(k, n, p)) <= observed + 1e-9)
    return min(1.0, total)


def confidence(a_events: int, a_days: int, b_events: int, b_days: int) -> str:
    return "strong" if p_value(a_events, a_days, b_events, b_days) < STRONG_P else "weak"
