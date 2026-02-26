"use client"

import { useEffect, useState } from "react"

export default function MermaidRender({ code }: { code: string }) {
  const [svg, setSvg] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    async function render() {
      try {
        setError("")
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        })

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`
        const { svg } = await mermaid.render(id, code)
        if (mounted) setSvg(svg)
      } catch (issue) {
        if (mounted) {
          setSvg("")
          setError(issue instanceof Error ? issue.message : "Failed to render Mermaid diagram")
        }
      }
    }

    void render()

    return () => {
      mounted = false
    }
  }, [code])

  if (error) {
    return (
      <div className="rounded-xl border border-soft-red/30 bg-soft-red/5 p-4 text-xs text-soft-red">
        Mermaid render failed: {error}
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="rounded-xl border border-sand bg-cream/30 p-4 text-xs text-warm-500">
        Rendering Mermaid...
      </div>
    )
  }

  return <div className="overflow-auto rounded-xl border border-sand bg-[#10151c] p-3" dangerouslySetInnerHTML={{ __html: svg }} />
}
