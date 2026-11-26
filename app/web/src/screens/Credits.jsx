import credits from '../photo-credits.json';

const LICENCE = 'https://unsplash.com/license';

export default function Credits({ items }) {
  return (
    <section aria-labelledby="credits-title">
      <h1 id="credits-title">Photo credits</h1>
      <p className="lead">The dish photos come from Unsplash and Pexels. They are free to use under the Unsplash License or the Pexels License and are shown resized and cropped. They are not photos of this canteen&rsquo;s food.</p>
      <ul className="credits">
        {credits.map((c) => (
          <li key={c.slug}>
            <b>{items.find((m) => m.photo === c.slug)?.name ?? c.slug}</b>
            <span>Photo by {c.author}. Licence <a href={LICENCE} target="_blank" rel="noreferrer">{c.licence}</a>.</span>
            <a href={c.source} target="_blank" rel="noreferrer">Original photo</a>
          </li>
        ))}
      </ul>
      <a className="btn" href="#/menu">Back to the menu</a>
    </section>
  );
}
