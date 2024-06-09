import { Chunk, FlightResponse, isReference } from "@rsc-parser/react-client";
import React, { memo, useContext, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { EndTimeContext } from "./EndTimeContext";

interface Node extends d3.SimulationNodeDatum {
  chunk: Chunk;
  isInTimeRange: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

export type Data = {
  nodes: Node[];
  links: Link[];
};

export const WIDTH = 120;
export const HEIGHT = 50;

function findReferencesInChunk(chunk: Chunk) {
  if (chunk.type !== "model") {
    return [];
  }

  const references: string[] = [];

  function walk(data: unknown) {
    if (isReference(data)) {
      references.push(data.id);
      return;
    }

    if (Array.isArray(data)) {
      for (const value of data) {
        walk(value);
      }
      return;
    }

    if (typeof data == "object" && data !== null) {
      for (const value of Object.values(data)) {
        walk(value);
      }
    }
  }

  walk(chunk.value);

  return references;
}

function getChunkById(chunks: Chunk[], id: string) {
  return chunks.find((chunk) => chunk.id === id);
}

function getLinks(chunks: Chunk[], id: string) {
  const links: Link[] = [];

  function walk(id: string) {
    const chunk = getChunkById(chunks, id);
    if (!chunk) {
      return links;
    }

    const references = findReferencesInChunk(chunk);
    for (const reference of references) {
      links.push({
        source: id,
        target: reference,
      });

      walk(reference);
    }
  }

  walk(id);

  // Only return links for which there are nodes
  return links.filter((link) =>
    chunks.find((chunk) => chunk.id === link.target),
  );
}

export function FlightResponseTabNetwork({
  flightResponse,
}: {
  flightResponse: FlightResponse;
}) {
  const endTime = useContext(EndTimeContext);

  const nodes: Node[] = flightResponse._chunks.map((chunk) => {
    return {
      chunk,
      isInTimeRange: chunk.timestamp <= endTime,
    };
  });

  const links = getLinks(flightResponse._chunks, "0");

  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(0);
  const [svgHeight, setSvgHeight] = useState(0);
  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      setSvgWidth(svgRef.current!.clientWidth);
      setSvgHeight(svgRef.current!.clientHeight);
      simulation.current = undefined;
    });
    resizeObserver.observe(svgRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [linksState, setLinksState] = useState<Link[]>([]);
  const [nodesState, setNodesState] = useState<Node[]>([]);

  const simulation = useRef<d3.Simulation<Node, Link>>();

  useEffect(() => {
    if (simulation.current) {
      return;
    }

    if (!svgRef.current) {
      return;
    }

    simulation.current = d3
      .forceSimulation(nodes)

      // list of forces we apply to get node positions
      .force(
        "link",
        d3.forceLink<Node, Link>(links).id((d) => d.chunk.id),
      )
      .force("collide", d3.forceCollide().radius((WIDTH + HEIGHT) / 2))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(svgWidth / 2, svgHeight / 2))
      .on("tick", () => {
        setLinksState([...links]);
        setNodesState([...nodes]);
      });
  }, [svgWidth, svgHeight, nodes, links]);

  const svgGroupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !svgGroupRef.current || !svgWidth || !svgHeight) {
      return;
    }

    const selection = d3.select(svgRef.current);
    selection.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .extent([
          [0, 0],
          [svgWidth, svgHeight],
        ])
        .scaleExtent([0.3, 8])
        .on("zoom", ({ transform }) => {
          if (!svgGroupRef.current) {
            return;
          }
          svgGroupRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
        }),
    );
  }, [svgRef.current, svgGroupRef.current, svgWidth, svgHeight]);

  return (
    <div className="h-[calc(100vh-250px)] w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="size-full select-none rounded bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
      >
        <g cursor="grab" ref={svgGroupRef}>
          {linksState.map((link) => (
            <line
              // @ts-expect-error - d3 types are wrong
              key={`link-${link.index}-${link.source.chunk.id}-${link.target.chunk.id}`}
              // @ts-expect-error - d3 types are wrong
              x1={link.source.x}
              // @ts-expect-error - d3 types are wrong
              y1={link.source.y}
              // @ts-expect-error - d3 types are wrong
              x2={link.target.x}
              // @ts-expect-error - d3 types are wrong
              y2={link.target.y}
              stroke="currentColor"
            />
          ))}
          {nodesState.map((node) => (
            <foreignObject
              key={`node-${node.chunk.id}`}
              // @ts-expect-error - d3 types are wrong
              x={node.x - WIDTH / 2}
              // @ts-expect-error - d3 types are wrong
              y={node.y - HEIGHT / 2}
              width={WIDTH}
              height={HEIGHT * 2}
            >
              <MemoizedChunk chunk={node.chunk} />
            </foreignObject>
          ))}
        </g>
      </svg>
    </div>
  );
}

const MemoizedChunk = memo(function Chunk({ chunk }: { chunk: Chunk }) {
  return (
    <div className="rounded-full bg-slate-300 px-2.5 py-1.5 text-center text-black dark:bg-slate-700 dark:text-white">
      <span className="font-semibold">{chunk.id}</span> {chunk.type}
    </div>
  );
});
