"use client"

import { useState, useEffect, useCallback } from "react";
import DatabaseSchemaNode from "@/components/dashboard/schemas/node";
import { Background, BackgroundVariant, Controls, Node, Edge, NodeChange, ReactFlow, applyNodeChanges } from "@xyflow/react";
import { useSchemaOverview, type ApiTable, type ApiRelationship } from "@/hooks/use-schemas";
import { useParams } from "next/navigation";
import "@xyflow/react/dist/style.css";

const nodeTypes = { databaseSchema: DatabaseSchemaNode };

export default function TenantSchemasViewer() {
    const tenantId = useParams().id as string;
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const { data: schemaOverview, isLoading, error } = useSchemaOverview(tenantId, { autoRefresh: false });

    useEffect(() => {
        if (schemaOverview && !isDataLoaded) {
            const reactFlowNodes = schemaOverview.tables.map((table: ApiTable, index: number) => ({
                id: table.tableName || `table-${index}`,
                position: { x: (index % 3) * 400, y: Math.floor(index / 3) * 350 },
                type: "databaseSchema",
                data: {
                    label: table.tableName,
                    schema: table.columns?.map(col => ({ title: col.title, type: col.type })) || []
                },
                dragHandle: ".drag-handle"
            })) as Node[];

            const reactFlowEdges = schemaOverview.relationships?.map((rel: ApiRelationship, index: number) => ({
                id: rel.constraintName || `edge-${index}`,
                source: rel.fromTable,
                target: rel.toTable,
                sourceHandle: rel.fromColumn,
                targetHandle: rel.toColumn,
                type: "smoothstep",
                animated: true,
                label: `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`
            })) as Edge[] || [];
            
            setNodes(reactFlowNodes);
            setEdges(reactFlowEdges);
            setIsDataLoaded(true);
        }
    }, [schemaOverview, isDataLoaded]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading schema...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Failed to load schema: {error.message}</p>
                    <p className="text-gray-600 text-sm">Please check your connection and try again</p>
                </div>
            </div>
        );
    }

    if (!nodes || nodes.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No tables found in this schema</p>
                    <p className="text-gray-500 text-sm">Create some tables to see the schema visualization</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges || []}
                nodeTypes={nodeTypes}
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                fitView
                onNodesChange={handleNodesChange}
            >
                <Controls position="top-left" className="bg-background!" />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}