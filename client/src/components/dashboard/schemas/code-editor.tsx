"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Copy, Download, RefreshCw, AlertTriangle, CheckCircle, Save } from "lucide-react";
import { debounce } from "lodash";
import { 
  parseDBML, 
  type ParsedSchema, 
  type ValidationError, 
} from "./schema-converter";
import { useUpdateTenantSchema } from "@/hooks/use-schemas";
import { toast } from "sonner";

interface CodeEditorProps {
  tenantId: string;
  onSchemaChange?: (code: string, isValid: boolean, parsedSchema?: ParsedSchema) => void;
  onSaveSuccess?: () => void; // New callback for successful API saves
  initialCode: string;
  className?: string;
}

export default function CodeEditor({ tenantId, onSchemaChange, onSaveSuccess, initialCode, className = "" }: CodeEditorProps) {
  // Debug logging
  console.log("CodeEditor - tenantId:", tenantId);
  
  const [code, setCode] = useState(initialCode);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState(initialCode);
  const editorRef = useRef<any>(null);

  // Mutation hook for updating schema
  const updateTenantSchemaMutation = useUpdateTenantSchema();

  // Auto-save function with callback for successful saves
  const performSave = useCallback(async (codeToSave: string, onSaveSuccess?: () => void) => {
    if (!codeToSave.trim() || codeToSave === lastSavedCode) return;

    console.log("performSave - tenantId:", tenantId, "codeLength:", codeToSave.length);

    setIsSaving(true);
    try {
      const payload = {
        tenantId,
        schemaData: {
          schemaCode: codeToSave,
          name: "Schema",
          description: "Updated schema"
        }
      };
      
      console.log("performSave - payload:", payload);
      
      await updateTenantSchemaMutation.mutateAsync(payload);

      setLastSavedCode(codeToSave);
      setHasUnsavedChanges(false);
      toast.success("Schema saved successfully");
      
      // Trigger success callback if provided
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Failed to save schema:", error);
      toast.error("Failed to save schema");
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, lastSavedCode, updateTenantSchemaMutation]);

  // Manual save function
  const handleSave = useCallback(() => {
    performSave(code, onSaveSuccess);
  }, [code, performSave, onSaveSuccess]);

  // Sync with initialCode prop changes - only when prop actually changes
  useEffect(() => {
    console.log("CodeEditor useEffect - initialCode changed:", initialCode.length, "characters");
    setCode(initialCode);
    setLastSavedCode(initialCode);
    setHasUnsavedChanges(false);
  }, [initialCode]);

  // Debounced API save (5 seconds delay) - only for auto-save
  const debouncedApiSave = useCallback(
    debounce(async (newCode: string) => {
      // Only save if code is valid, has changes, and is not empty
      if (newCode.trim() && newCode !== lastSavedCode) {
        const result = parseDBML(newCode);
        if (result.isValid) {
          await performSave(newCode, onSaveSuccess);
        }
      }
    }, 5000),
    [lastSavedCode, performSave, onSaveSuccess]
  );

  // Real-time validation and schema change notification (no delay)
  const handleRealTimeValidation = useCallback((newCode: string) => {
    // Track changes immediately
    setHasUnsavedChanges(newCode !== lastSavedCode);
    
    // Don't show errors for empty code
    if (!newCode.trim()) {
      setErrors([]);
      setIsValid(false);
      if (onSchemaChange) {
        onSchemaChange(newCode, false);
      }
      return;
    }
    
    const result = parseDBML(newCode);
    setErrors(result.errors);
    setIsValid(result.isValid);
    
    // Update editor markers immediately
    if (editorRef.current) {
      updateErrorMarkers(result.errors);
    }
    
    // Notify parent component immediately for real-time node/edge updates
    if (onSchemaChange) {
      onSchemaChange(newCode, result.isValid, result.parsedSchema);
    }
  }, [lastSavedCode, onSchemaChange]);

  // Update error markers in Monaco editor
  const updateErrorMarkers = useCallback((validationErrors: ValidationError[]) => {
    if (!editorRef.current) return;
    
    const monaco = (window as any).monaco;
    const model = editorRef.current.getModel();
    
    if (model && monaco) {
      const markers = validationErrors.map(error => ({
        severity: error.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: error.column + 20, // Highlight a reasonable length
        message: error.message,
      }));
      
      monaco.editor.setModelMarkers(model, 'dbml-errors', markers);
    }
  }, []);

  // Initial validation when component mounts
  useEffect(() => {
    handleRealTimeValidation(code);
  }, []); // Only run once on mount

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Custom theme for database schema
    monaco.editor.defineTheme('db-schema-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'attribute', foreground: '9CDCFE' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editor.wordHighlightBackground': '#575757',
        'editor.wordHighlightStrongBackground': '#004972',
      }
    });

    // Register DBML language
    monaco.languages.register({ id: 'dbml' });
    
    // Set language configuration
    monaco.languages.setLanguageConfiguration('dbml', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '`', close: '`' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '`', close: '`' }
      ]
    });

    // Set tokenization rules
    monaco.languages.setMonarchTokensProvider('dbml', {
      defaultToken: 'invalid',
      tokenPostfix: '.dbml',
      
      keywords: [
        'Table', 'Ref', 'Enum', 'Project', 'Note', 'TableGroup',
        'primary', 'key', 'unique', 'not', 'null', 'default',
        'increment', 'pk', 'ref'
      ],
      
      typeKeywords: [
        'integer', 'int', 'bigint', 'smallint', 'tinyint',
        'varchar', 'char', 'text', 'longtext', 'mediumtext',
        'timestamp', 'datetime', 'date', 'time',
        'boolean', 'bool', 'bit',
        'decimal', 'numeric', 'float', 'double',
        'json', 'jsonb', 'uuid', 'serial', 'bigserial'
      ],

      operators: ['>', '<', '-', '=', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--'],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],

          // Keywords
          [/\b(?:Table|Ref|Enum|Project|Note|TableGroup)\b/, 'keyword'],
          [/\b(?:primary|key|unique|not|null|default|increment|pk|ref)\b/, 'keyword'],

          // Types
          [/\b(?:integer|int|bigint|smallint|tinyint|varchar|char|text|longtext|mediumtext|timestamp|datetime|date|time|boolean|bool|bit|decimal|numeric|float|double|json|jsonb|uuid|serial|bigserial)\b/, 'type'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/`([^`\\]|\\.)*$/, 'string.invalid'],
          [/`/, { token: 'string.quote', bracket: '@open', next: '@string_backtick' }],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],

          // Attributes in brackets
          [/\[/, 'attribute', '@attribute'],

          // Operators
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>=!~&|+\-*\/\^%]/, 'operator'],
          [/[;,.]/, 'delimiter'],

          // Identifiers
          [/[a-zA-Z_]\w*/, 'identifier'],

          // Whitespace
          { include: '@whitespace' },
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          ["\\*/", 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        string_backtick: [
          [/[^\\`]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/`/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        attribute: [
          [/[^\[\]]+/, 'attribute'],
          [/\]/, 'attribute', '@pop']
        ],

        whitespace: [
          [/[ \t\r\n]+/, 'white'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],
      },
    });

    monaco.editor.setTheme('db-schema-theme');

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (isValid && !isSaving) {
        handleSave();
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (isValid && !isSaving) {
        handleSave();
      }
    });

    // Initial validation
    handleRealTimeValidation(code);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    
    // Trigger real-time validation and schema change notification (immediate)
    handleRealTimeValidation(newCode);
    
    // Trigger debounced API save (5 seconds delay)
    debouncedApiSave(newCode);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dbml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCode(initialCode);
  };

  const handleSaveNow = () => {
    if (isValid && !isSaving) {
      handleSave();
    }
  };

  return (
    <section className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
          Schema Editor
          {hasUnsavedChanges && !isSaving && (
            <span className="text-xs text-orange-400">• unsaved</span>
          )}
          {isSaving ? (
            <Save className="h-3 w-3 text-blue-500 animate-pulse" />
          ) : isValidating ? (
            <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />
          ) : isValid ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </h3>
        <nav className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveNow}
            disabled={!isValid || isSaving || !hasUnsavedChanges}
            className="h-7 px-2 text-gray-400 hover:text-gray-200 disabled:opacity-50"
            title={
              !isValid 
                ? "Fix errors to save" 
                : !hasUnsavedChanges 
                ? "No changes to save" 
                : isSaving 
                ? "Saving..." 
                : "Save now (Ctrl+S)"
            }
          >
            <Save className={`h-3 w-3 ${isSaving ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2 text-gray-400 hover:text-gray-200"
            title="Copy to clipboard"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-7 px-2 text-gray-400 hover:text-gray-200"
            title="Download as .dbml file"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-7 px-2 text-gray-400 hover:text-gray-200"
            title="Reset to default schema"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </nav>
      </header>

      {/* Editor */}
      <main className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          defaultLanguage="dbml"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Consolas, "Cascadia Code", monospace',
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            folding: true,
            foldingStrategy: 'indentation',
            lineDecorationsWidth: 5,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            selectionHighlight: false,
            bracketPairColorization: {
              enabled: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showWords: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            contextmenu: true,
            mouseWheelZoom: true,
          }}
        />
      </main>

      {/* Error Display */}
      {errors.length > 0 && (
        <footer className="p-3 border-t border-red-800 bg-red-950/20 h-[100px] overflow-y-auto">
          <h4 className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Syntax Errors ({errors.length})
          </h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-xs text-red-300 flex gap-2">
                <span className="font-mono text-red-500 min-w-fit">
                  Line {error.line}:
                </span>
                <span className="flex-1">{error.message}</span>
              </li>
            ))}
          </ul>
        </footer>
      )}

      {/* Status Footer */}
      <footer className="p-2 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          {isSaving ? (
            <span className="text-blue-500">Saving schema...</span>
          ) : isValidating ? (
            <span className="text-yellow-500">Validating...</span>
          ) : isValid ? (
            <span className="text-green-500">
              Schema is valid
            </span>
          ) : (
            <span className="text-red-500">Fix syntax errors to auto-save</span>
          )}
        </p>
      </footer>
    </section>
  );
}
