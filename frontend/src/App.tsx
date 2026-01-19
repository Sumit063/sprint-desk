const features = [
  {
    title: "Workspaces",
    body: "Create private spaces for teams with clean role-based access."
  },
  {
    title: "Issues",
    body: "Track tasks with statuses, priorities, assignees, and comments."
  },
  {
    title: "Knowledge Base",
    body: "Write markdown articles and link them directly to issues."
  },
  {
    title: "Realtime",
    body: "Live updates across the team via WebSockets and notifications."
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          SprintDesk
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Multi-tenant Issue Tracker + Knowledge Base
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          A production-ready MERN starter focused on clarity, speed, and simple
          collaboration.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
