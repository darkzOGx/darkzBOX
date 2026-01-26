'use client';

import { useState, useRef, useEffect } from 'react';
import { runScraperAction, importLeadsAction } from '@/actions/scraper';
import { Search, Loader2, Download, Instagram, Music2, ExternalLink, Check, AlertCircle, Play, StopCircle, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';

// Types
import { ScraperResult } from '@/lib/firecrawl';

export default function ScraperInterface({ campaigns }: { campaigns: any[] }) {
    // UI State
    const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
    const [enableFirecrawl, setEnableFirecrawl] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState('');

    // Execution State
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentDork, setCurrentDork] = useState<string>('');

    // Results State
    const [results, setResults] = useState<ScraperResult[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [targetCampaignId, setTargetCampaignId] = useState<string>(campaigns[0]?.id || '');
    const [importing, setImporting] = useState(false);
    const [importStats, setImportStats] = useState<{ imported: number, failed: number } | null>(null);

    // Refs for auto-scroll usage
    const logEndRef = useRef<HTMLDivElement>(null);
    const isRunningRef = useRef(false);

    // Initial Load: Check LocalStorage for API Key
    useEffect(() => {
        const savedKey = localStorage.getItem('firecrawl_api_key');
        if (savedKey) {
            setApiKey(savedKey);
        }
    }, []);

    // Save API Key on change
    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setApiKey(val);
        localStorage.setItem('firecrawl_api_key', val);
    };

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const startScraping = async (selectedPlatform: 'instagram' | 'tiktok') => {
        if (isRunning) return;

        setPlatform(selectedPlatform);
        setIsRunning(true);
        isRunningRef.current = true;
        setResults([]);
        setLogs([]);
        setImportStats(null);
        setSelectedIndices(new Set());

        addLog(`Starting ${selectedPlatform} scraper...`);
        addLog(`Firecrawl API is ${enableFirecrawl ? 'ENABLED' : 'DISABLED'}`);

        try {
            // Loop limit (SAFETY)
            let iterations = 0;
            const MAX_ITERATIONS = 5;

            while (isRunningRef.current && iterations < MAX_ITERATIONS) {
                iterations++;
                addLog(`Picking dork #${iterations}...`);

                const formData = new FormData();
                formData.append('platform', selectedPlatform);
                formData.append('enableFirecrawl', String(enableFirecrawl));
                if (enableFirecrawl && apiKey) {
                    formData.append('apiKey', apiKey);
                }

                const resp = await runScraperAction(formData);

                if (resp.queryUsed) {
                    setCurrentDork(resp.queryUsed);
                    addLog(`Running: ${resp.queryUsed}`);
                }

                if (!enableFirecrawl) {
                    if (resp.error) {
                        addLog(`Error: ${resp.error}`);
                        addLog("Stopping local fallback.");
                        break;
                    }
                } else {
                    // Firecrawl mode errors
                    if (resp.error) {
                        addLog(`Firecrawl Error: ${resp.error}`);
                        if (resp.error.includes("API Key")) {
                            addLog("Please check your API Key in settings below.");
                            break;
                        }
                    }
                }

                if (resp.success && resp.data) {
                    const newResults = resp.data || [];
                    addLog(`Found ${newResults.length} leads in this batch.`);

                    setResults(prev => {
                        // Dedup by username
                        const existing = new Set(prev.map(r => r.username));
                        const unique = newResults.filter(r => !existing.has(r.username));
                        return [...prev, ...unique];
                    });
                } else if (!resp.success && !resp.error) {
                    addLog(`Failed with unknown error.`);
                }

                // Wait before next batch
                if (iterations < MAX_ITERATIONS && isRunningRef.current) {
                    addLog("Waiting 3s...");
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            if (iterations >= MAX_ITERATIONS) {
                addLog("Batch limit reached. Stopping.");
            }

        } catch (err: any) {
            console.error(err);
            addLog(`Critical error: ${err.message}`);
        } finally {
            setIsRunning(false);
            isRunningRef.current = false;
            addLog("Scraping stopped.");
        }
    };

    const stopScraping = () => {
        isRunningRef.current = false;
        setIsRunning(false);
        addLog("Stopping requested...");
    };

    const toggleSelection = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };

    const toggleAll = () => {
        if (selectedIndices.size === results.length) {
            setSelectedIndices(new Set());
        } else {
            const all = new Set(results.map((_, i) => i));
            setSelectedIndices(all);
        }
    };

    const handleEmailChange = (index: number, newEmail: string) => {
        const updated = [...results];
        updated[index].email = newEmail;
        setResults(updated);
    };

    const handleImport = async () => {
        if (!targetCampaignId) {
            alert("Please create a campaign first!");
            return;
        }

        setImporting(true);
        const leadsToImport = results.filter((_, i) => selectedIndices.has(i));

        try {
            const res = await importLeadsAction(leadsToImport, targetCampaignId);
            if (res.success) {
                setImportStats({ imported: res.imported || 0, failed: res.failed || 0 });
            } else {
                alert(res.error || "Import failed");
            }
        } catch (err) {
            alert("Import error");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Control Panel */}
            <div className="bg-black/20 border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                <div className="flex flex-col gap-6">

                    {/* Top Row: Dork Display & Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1 block">Current Dork Query</label>
                            <div className="font-mono text-sm text-green-400 bg-black/40 px-3 py-2 rounded-lg border border-white/5 min-h-[40px] flex items-center">
                                {currentDork || <span className="text-white/20 italic">Ready to start...</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Firecrawl Toggle */}
                            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/10">
                                <span className={`text-xs font-medium px-2 py-1 rounded transition-colors ${!enableFirecrawl ? 'bg-white/10 text-white' : 'text-white/40'}`}>Off</span>
                                <button
                                    onClick={() => !isRunning && setEnableFirecrawl(!enableFirecrawl)}
                                    disabled={isRunning}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${enableFirecrawl ? 'bg-green-500' : 'bg-white/10'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${enableFirecrawl ? 'left-7' : 'left-1'}`} />
                                </button>
                                <span className={`text-xs font-medium px-2 py-1 rounded transition-colors ${enableFirecrawl ? 'bg-green-500/20 text-green-400' : 'text-white/40'}`}>Firecrawl</span>
                            </div>

                            {/* Settings Toggle */}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                <SettingsIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Settings Area (Expandable) */}
                    {showSettings && (
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold text-white mb-3">Firecrawl Configuration</h4>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-white/50 block mb-1">API Key</label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={handleApiKeyChange}
                                        placeholder="fc_..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/20"
                                    />
                                </div>
                                <div className="text-xs text-white/40 pb-2">
                                    Key is saved locally in your browser.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => startScraping('instagram')}
                            disabled={isRunning}
                            className={`group relative overflow-hidden rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${isRunning && platform === 'instagram' ? 'bg-pink-600/20 border-pink-500' : 'bg-gradient-to-br from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600'
                                } border border-white/10 shadow-lg`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                {isRunning && platform === 'instagram' ? <Loader2 className="w-6 h-6 animate-spin text-pink-400" /> : <Instagram className="w-6 h-6 text-white" />}
                                <div className="text-left">
                                    <div className="font-bold text-white">Scrape Instagram</div>
                                    <div className="text-[10px] text-pink-200/60 font-mono">USING PRE-CONFIGURED DORKS</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => startScraping('tiktok')}
                            disabled={isRunning}
                            className={`group relative overflow-hidden rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${isRunning && platform === 'tiktok' ? 'bg-cyan-600/20 border-cyan-500' : 'bg-gradient-to-br from-black to-slate-800 hover:bg-slate-900'
                                } border border-white/10 shadow-lg`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                {isRunning && platform === 'tiktok' ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : <Music2 className="w-6 h-6 text-white" />}
                                <div className="text-left">
                                    <div className="font-bold text-white">Scrape TikTok</div>
                                    <div className="text-[10px] text-slate-400 font-mono">USING PRE-CONFIGURED DORKS</div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Stop Button */}
                    {isRunning && (
                        <button
                            onClick={stopScraping}
                            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                        >
                            <StopCircle className="w-4 h-4" /> Stop Scraping
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal / Logs */}
            <div className="bg-black/80 border border-white/10 rounded-xl p-4 font-mono text-xs h-32 overflow-y-auto text-white/70 shadow-inner">
                {logs.length === 0 && <div className="text-white/20 italic">Waiting for commands...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-0.5">{log}</div>
                ))}
                <div ref={logEndRef} />
            </div>

            {/* Results Area */}
            {importStats && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <span>Successfully imported {importStats.imported} leads. ({importStats.failed} failed/skipped)</span>
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <h3 className="text-white/80 font-medium flex items-center gap-2">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/60">{results.length}</span>
                            Results Found
                        </h3>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
                                <span className="text-xs text-white/40 px-2">Import to:</span>
                                <select
                                    value={targetCampaignId}
                                    onChange={(e) => setTargetCampaignId(e.target.value)}
                                    className="bg-transparent text-sm text-white focus:outline-none max-w-[150px] appearance-none"
                                >
                                    {campaigns.length === 0 && <option value="">No Campaigns</option>}
                                    {campaigns.map(c => (
                                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={importing || selectedIndices.size === 0}
                                className="bg-white text-black hover:bg-white/90 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                Import ({selectedIndices.size})
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm text-white/70">
                            <thead className="bg-white/5 text-xs uppercase text-white/40 font-medium sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIndices.size === results.length && results.length > 0}
                                            onChange={toggleAll}
                                            className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0"
                                        />
                                    </th>
                                    <th className="p-4">Profile</th>
                                    <th className="p-4">Email (Editable)</th>
                                    <th className="p-4">Bio / Snippet</th>
                                    <th className="p-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {results.map((result, i) => (
                                    <tr key={i} className={`hover:bg-white/5 transition-colors ${selectedIndices.has(i) ? 'bg-white/[0.02]' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIndices.has(i)}
                                                onChange={() => toggleSelection(i)}
                                                className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result.platform === 'tiktok' ? 'bg-black border border-white/20' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'}`}>
                                                    {result.platform === 'tiktok' ? <Music2 className="w-4 h-4 text-white" /> : <Instagram className="w-4 h-4 text-white" />}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">@{result.username}</div>
                                                    <div className="text-xs text-white/40 capitalize">{result.platform}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                value={result.email || ''}
                                                onChange={(e) => handleEmailChange(i, e.target.value)}
                                                placeholder="No email found"
                                                className="bg-transparent border-b border-white/10 focus:border-purple-500 focus:outline-none w-full text-white/90 placeholder:text-white/20 pb-1"
                                            />
                                            {!result.email && <div className="text-[10px] text-orange-400/80 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing</div>}
                                        </td>
                                        <td className="p-4 max-w-md">
                                            <p className="line-clamp-2 text-xs text-white/50" title={result.description}>{result.description || result.title || 'No description'}</p>
                                        </td>
                                        <td className="p-4">
                                            <Link href={result.url} target="_blank" className="text-white/40 hover:text-white transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
