// Minimal page to satisfy Next.js static export build requirement.
// The actual game lives in public/index.html and is copied to out/ by `next export`.
export default function Home() {
  return <div id="fsd-sim-root" style={{display:'none'}}>FSD-Sim</div>;
}
