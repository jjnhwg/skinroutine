/** Landing page: why the app exists and how it helped. Same story as WHY.md. */
export function HomeScreen() {
  return (
    <>
      <h2 className="page-title">Why I built this</h2>
      <p className="page-sub">If you break out and have no idea why, this is for you.</p>

      <div className="card prose">
        <p>
          That was me. I'd see a skincare product going viral, buy it, and use it every day. For a week it seemed
          fine, so I figured it was working. Then I'd break out. I never spot tested anything. And I kept adding new
          products, so when my skin flared up I couldn't tell which one did it, or whether it was a product at all.
        </p>
        <p>
          So I built Skin Test Log. Every day I write down my morning and night routine. It takes about a minute. I
          tap tags for things that might matter, like sleeping on a dirty pillowcase, skipping a shower after the gym,
          bad sleep, or stress, and I add a quick note if something felt off.
        </p>
        <p>
          Then when I break out, I'm not guessing. I can look back at what I used and what I did in the days before.
          After a couple of weeks of logging, the app starts pointing out patterns on its own: which products and
          habits tend to come before my breakouts.
        </p>
      </div>

      <div className="card prose">
        <h2>Here's what it found for me</h2>
        <ul>
          <li>
            <strong>[Product name]</strong> kept showing up a few days before my breakouts. I stopped using it and
            [what happened].
          </li>
          <li>
            <strong>[Habit, e.g. "dirty pillowcase"]</strong> was another one. Once I started [fix], [result].
          </li>
          <li>
            I stopped product-hopping. Now I test one new product at a time for 21 days, and the app tells me whether
            my skin got better or worse compared with before I started.
          </li>
        </ul>
        <p>My skin is [clearer / mostly clear] now, and for the first time I know why.</p>
      </div>

      <p>
        If you keep trying new products and hoping one finally works, try writing it down first. Your skin is probably
        already telling you what's wrong. You just need a record to see it.
      </p>
      <a className="btn primary" style={{ marginTop: 8, width: "100%" }} href="#/log">
        Log today
      </a>
    </>
  );
}
