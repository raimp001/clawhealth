import CodebaseVisualizer from "@/components/visualizer/codebase-visualizer"

export default function ProjectVisualizerPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { repoUrl?: string }
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">Project AI Visualizer</h1>
        <p className="mt-1 text-sm text-warm-500">
          Project <span className="font-semibold text-warm-700">{params.id}</span>: map architecture, agent interactions, communication, deployments, and dependencies with one click.
        </p>
      </div>
      <CodebaseVisualizer repoUrl={searchParams?.repoUrl || ""} projectId={params.id} />
    </div>
  )
}
