"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import DatabaseSchemaNode from "@/components/dashboard/schemas/node";
import CodeEditor from "@/components/dashboard/schemas/code-editor";
import { Background, BackgroundVariant, Controls, Node, Edge, NodeChange, ReactFlow, applyNodeChanges, ReactFlowInstance } from "@xyflow/react";
import { useSchemaOverview, type ApiTable, type ApiRelationship } from "@/hooks/use-schemas";
import { useParams } from "next/navigation";
import { 
  schemaToNodes, 
  apiSchemaToDBML, 
  type ParsedSchema 
} from "./schema-converter";
import "@xyflow/react/dist/style.css";

const nodeTypes = { databaseSchema: DatabaseSchemaNode };

export default function TenantSchemasViewer() {
    const tenantId = useParams().id as string;
    
    // Debug logging
    console.log("TenantSchemasViewer - tenantId:", tenantId);
    
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [initialCode, setInitialCode] = useState<string>("");
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    
    // Get schema overview for both visualization and editor (now includes DBML parsing)
    const { data: schemaOverview, isLoading, error } = useSchemaOverview(tenantId, { autoRefresh: false });

    // Load initial data and convert to nodes/edges and DBML code
    useEffect(() => {
        console.log("Viewer useEffect triggered:", { 
            hasSchemaOverview: !!schemaOverview, 
            isDataLoaded 
        });
        
        if (schemaOverview && !isDataLoaded) {
            // Convert API data to ReactFlow nodes
            const reactFlowNodes = schemaOverview.tables.map((table: ApiTable, index: number) => ({
                id: table.tableName || `table-${index}`,
                position: { x: (index % 3) * 400, y: Math.floor(index / 3) * 350 },
                type: "databaseSchema",
                data: {
                    label: table.tableName,
                    schema: table.columns?.map(col => ({ 
                        title: col.title, 
                        type: col.type
                    })) || []
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
                label: `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`,
                style: { stroke: '#64748b', strokeWidth: 2 }
            })) as Edge[] || [];

            // Use saved DBML code if available, otherwise generate from API data
            let dbmlCode = '';
            if (schemaOverview.savedCode) {
                dbmlCode = schemaOverview.savedCode;
                console.log("Using saved DBML code from database:", dbmlCode.length, "characters");
            } else {
                dbmlCode = apiSchemaToDBML(schemaOverview.tables, schemaOverview.relationships || []);
                console.log("Generated DBML code from database structure:", dbmlCode.length, "characters");
            }
            
            setNodes(reactFlowNodes);
            setEdges(reactFlowEdges);
            setInitialCode(dbmlCode);
            setIsDataLoaded(true);
        }
    }, [schemaOverview, isDataLoaded]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    // Handle schema changes from the code editor (real-time for nodes/edges)
    const handleSchemaChange = useCallback(async (code: string, isValid: boolean, parsedSchema?: ParsedSchema) => {
        // Update nodes and edges immediately for real-time feedback (no debounce)
        if (isValid && parsedSchema && parsedSchema.tables.length > 0) {
            const { nodes: newNodes, edges: newEdges } = schemaToNodes(parsedSchema, nodes);
            setNodes(newNodes);
            setEdges(newEdges);
            
            console.log('Real-time update: nodes and edges updated');
        } else if (!isValid || !parsedSchema || parsedSchema.tables.length === 0) {
            // Don't clear the visualization if code is invalid or empty - keep existing visualization
            console.log('Invalid or empty schema, keeping current visualization');
        }
    }, [nodes]);

    // Handle successful API saves - only then trigger fitView
    const handleSaveSuccess = useCallback(() => {
        console.log('API save successful, triggering fitView');
        
        // Fit view to show all nodes after a short delay to ensure nodes are rendered
        setTimeout(() => {
            if (reactFlowInstanceRef.current) {
                reactFlowInstanceRef.current.fitView({ padding: 0.2, duration: 800 });
            }
        }, 100);
    }, []);

    if (isLoading) {
        return (
            <main className="h-full w-full flex items-center justify-center">
                <section className="text-center">
                    <article className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></article>
                    <p className="text-gray-600">Loading schema...</p>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="h-full w-full flex items-center justify-center">
                <section className="text-center">
                    <p className="text-red-600 mb-4">Failed to load schema: {error.message}</p>
                    <p className="text-gray-600 text-sm">Please check your connection and try again</p>
                </section>
            </main>
        );
    }

    return (
        <main className="h-full w-full flex">
            <section className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges || []}
                    nodeTypes={nodeTypes}
                    minZoom={0.1}
                    maxZoom={2}
                    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                    fitView
                    onNodesChange={handleNodesChange}
                    onInit={(reactFlowInstance) => {
                        reactFlowInstanceRef.current = reactFlowInstance;
                    }}
                >
                    <Controls position="top-left" className="bg-background!" />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
            </section>

            <section className="w-[500px] h-full bg-card border-border flex flex-col">
                {initialCode ? (
                    <CodeEditor 
                        tenantId={tenantId}
                        onSchemaChange={handleSchemaChange}
                        onSaveSuccess={handleSaveSuccess}
                        initialCode={initialCode}
                        className="h-full"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading schema editor...</p>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}