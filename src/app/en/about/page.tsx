import { BookOpenCheck, Compass, GitBranch, Hammer, Layers3, NotebookPen, Sparkles, UserRound } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const focusAreas = [
  {
    icon: Sparkles,
    title: "AI Exploration and Application",
    description: "I care about how AI enters real workflows, not just tool lists or abstract narratives.",
  },
  {
    icon: Compass,
    title: "Content Globalization",
    description: "I document bilingual expression, search entry points, and long-term distribution practice.",
  },
  {
    icon: Hammer,
    title: "Project Building",
    description: "I turn product, engineering, deployment, and iteration problems into reusable notes.",
  },
  {
    icon: GitBranch,
    title: "Personal Brand",
    description: "I document how ordinary people can use AI, content, and project practice to build a trustworthy personal presence over time.",
  },
];

const methods = [
  {
    icon: NotebookPen,
    title: "How I Choose Topics",
    description: "Topics usually come from real projects, repeated questions, long-term notes, and methods I am actively testing.",
  },
  {
    icon: Layers3,
    title: "How I Structure Notes",
    description: "I separate background, main thread, examples, risks, and advanced ideas so each piece supports both scanning and deep reading.",
  },
  {
    icon: BookOpenCheck,
    title: "What I Hope It Gives You",
    description: "I hope each piece becomes a returnable entry point, not just something you read once and forget.",
  },
];

export const metadata = {
  title: "About",
  description: "About Frank and ZhiZhi: a long-term writing space around AI, content globalization, project practice, personal brand, and personal knowledge systems.",
};

export default function EnglishAboutPage() {
  return (
    <>
      <SiteHeader locale="en" currentPath="/en/about" />

      <main className="min-h-screen bg-background">
        <section className="site-grid border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <UserRound className="h-4 w-4" />
              About Me
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-foreground">Hi, I am Frank Guo</h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              An ordinary Java engineer and AI practitioner.
            </p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              Even without a big-tech or elite-school background, I believe ordinary people can use AI to improve their competitiveness. This is my public knowledge base for collecting problems, methods, and practice notes, so scattered experience can become paths I can return to.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm font-semibold text-accent">Focus Areas</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {focusAreas.map((item) => (
              <article key={item.title} className="node-surface rounded-md border border-line bg-paper/80 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 leading-7 text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-5 px-6 py-12">
            <article className="about-surface-no-rail index-surface rounded-md border border-line px-6 py-7">
              <p className="text-sm font-semibold text-accent">Why This Site Exists</p>
              <p className="mt-4 leading-8 text-muted">
                The AI era has fully arrived, and information is exploding. Every day I see a lot of useful information, but it is often too fragmented and messy. My Notion and Obsidian pages kept growing, yet when the same problem appeared again, I would still ask again instead of quickly finding the exact note I needed.
              </p>
              <p className="mt-4 leading-8 text-muted">
                I need a knowledge space that is easy to read, easy to use, helpful to others, and worth returning to over the long term.
              </p>
              <p className="mt-4 leading-8 text-muted">
                What really made me decide to polish this website seriously was something I discovered while exploring and practicing with AI: in the AI era, everyone should have a system of their own. This system should not be just an ordinary blog, but a personal calling card worth shaping carefully.
              </p>
            </article>
            <div className="node-surface rounded-md border border-line bg-paper/80 p-2">
              {methods.map((item, index) => (
                <article key={item.title} className={`grid gap-4 p-4 md:grid-cols-[2.5rem_1fr] ${index > 0 ? "border-t border-line/80" : ""}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-3 leading-7 text-muted">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale="en" />
    </>
  );
}
