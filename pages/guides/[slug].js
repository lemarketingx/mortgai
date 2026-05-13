import GuidePage from "../../components/GuidePage";
import { guides, guidesBySlug } from "../../lib/guides";

export default function MortgageGuidePage({ guide }) {
  return <GuidePage guide={guide} allGuides={guides} />;
}

export async function getStaticPaths() {
  return {
    paths: guides.map((guide) => ({ params: { slug: guide.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  return {
    props: {
      guide: guidesBySlug[params.slug],
    },
  };
}
