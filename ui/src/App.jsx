import React, { useEffect, useState } from 'react';
import { Activity, Globe, Monitor, Code, Trash2, Play, Search, Server, CheckCircle2, AlertTriangle, Clock, Copy, Check } from 'lucide-react';

export default function App() {
  const [requests, setRequests] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [ws, setWs] = useState(null);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    // Подключаемся к нашему Node.js прокси
    const socket = new WebSocket('ws://localhost:4040');
    setWs(socket);
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'history') {
          setRequests(msg.data);
        } else if (msg.type === 'request') {
          setRequests(prev => [msg.data, ...prev]);
        } else if (msg.type === 'response') {
          setRequests(prev => prev.map(req => {
            if (req.id === msg.data.requestId) {
              return { ...req, response: msg.data };
            }
            return req;
          }));
        } else if (msg.type === 'config') {
          setTunnelUrl(msg.data.tunnelUrl);
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };
    
    return () => socket.close();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const selectedReq = requests.find(r => r.id === selectedReqId);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = filterMethod === 'ALL' || req.method === filterMethod;
    
    let matchesStatus = true;
    if (filterStatus === 'SUCCESS') {
      matchesStatus = req.response && req.response.statusCode >= 200 && req.response.statusCode < 300;
    } else if (filterStatus === 'ERROR') {
      matchesStatus = req.response && (req.response.statusCode < 200 || req.response.statusCode >= 300);
    }
    
    return matchesSearch && matchesMethod && matchesStatus;
  });

  // Telemetry Calculations
  const totalReqCount = requests.length;
  const requestsWithResponse = requests.filter(r => r.response);
  const responseCount = requestsWithResponse.length;
  const avgLatency = responseCount > 0 
    ? Math.round(requestsWithResponse.reduce((sum, r) => sum + (r.response.duration || 0), 0) / responseCount) 
    : 0;
  const successCount = requestsWithResponse.filter(r => r.response.statusCode >= 200 && r.response.statusCode < 300).length;
  const successRate = responseCount > 0 
    ? Math.round((successCount / responseCount) * 100) 
    : 0;
  const errorCount = requestsWithResponse.filter(r => r.response.statusCode >= 400 || r.response.statusCode === 502).length;

  const handleReplay = (id) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'replay', id }));
    }
  };

  const handleCopyCurl = (req) => {
    let curl = `curl -X ${req.method} "${req.url}"`;
    Object.entries(req.headers).forEach(([key, val]) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
        curl += ` -H "${key}: ${val}"`;
      }
    });
    if (req.body) {
      const escapedBody = req.body.replace(/"/g, '\\"');
      curl += ` -d "${escapedBody}"`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Левая панель: Список запросов */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <button 
            onClick={() => setSelectedReqId(null)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold tracking-wide transition-colors"
          >
            <Activity size={20} />
            FlareGUI
          </button>
          <button 
            onClick={() => { setRequests([]); setSelectedReqId(null); }}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
            title="Clear logs"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Поиск и Фильтры */}
        {requests.length > 0 && (
          <div className="p-3 border-b border-zinc-800 flex flex-col gap-2.5 bg-zinc-950/80 backdrop-blur">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Поиск URL..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500/80 font-mono transition-colors text-zinc-200"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMethod(m)}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all uppercase ${
                    filterMethod === m 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              {['ALL', 'SUCCESS', 'ERROR'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-[9px] px-2 py-0.5 rounded font-semibold transition-all border ${
                    filterStatus === s 
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold' 
                      : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {s === 'ALL' ? 'Любой статус' : s === 'SUCCESS' ? 'Успешные' : 'Ошибки'}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm flex flex-col items-center gap-3 mt-10">
              <Globe size={24} className="opacity-50" />
              {requests.length === 0 ? 'Ожидание запросов...' : 'Ничего не найдено'}
            </div>
          ) : (
            filteredRequests.map(req => (
              <div 
                key={req.id}
                onClick={() => setSelectedReqId(req.id)}
                className={`p-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selectedReq?.id === req.id ? 'bg-zinc-900 border-l-2 border-l-indigo-500' : 'hover:bg-zinc-900/50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      req.method === 'GET' ? 'bg-blue-500/10 text-blue-400' :
                      req.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400' :
                      req.method === 'PUT' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {req.method}
                    </span>
                    {req.response && (
                      <>
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                          req.response.statusCode >= 200 && req.response.statusCode < 300 ? 'bg-emerald-500/10 text-emerald-400' :
                          req.response.statusCode === 502 ? 'bg-red-500/10 text-red-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {req.response.statusCode}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {req.response.duration} ms
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(req.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm truncate text-zinc-300 font-mono" title={req.url}>
                  {req.url}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Правая панель: Детали запроса */}
      <div className="flex-1 flex flex-col bg-[#09090b]">
        {selectedReq ? (
          <>
            <div className="p-6 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
              <h2 className="text-xl font-mono flex items-center gap-3 truncate">
                <span className={`text-sm px-2 py-1 rounded ${
                    selectedReq.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                    selectedReq.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                  {selectedReq.method}
                </span>
                <span className="text-zinc-100">{selectedReq.url}</span>
                {selectedReq.response && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                      selectedReq.response.statusCode >= 200 && selectedReq.response.statusCode < 300 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {selectedReq.response.statusCode}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {selectedReq.response.duration} ms
                    </span>
                  </div>
                )}
              </h2>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleCopyCurl(selectedReq)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold rounded-md transition-colors"
                  title="Copy as cURL command"
                >
                  {copiedCurl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedCurl ? 'cURL скопирован!' : 'Скопировать cURL'}</span>
                </button>
                <button
                  onClick={() => handleReplay(selectedReq.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors shadow-lg shadow-indigo-600/15"
                >
                  <Play size={14} className="fill-current" />
                  Повторить запрос (Replay)
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-8 max-w-5xl">
                
                {/* Headers */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Monitor size={14} /> Request Headers
                  </h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <tbody className="divide-y divide-zinc-800">
                        {Object.entries(selectedReq.headers).map(([key, val]) => (
                          <tr key={key} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-2 font-mono text-zinc-400 w-1/3 break-all">{key}</td>
                            <td className="px-4 py-2 font-mono text-zinc-200 break-all">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Body */}
                {selectedReq.body && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                      <Code size={14} /> Request Payload
                    </h3>
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg overflow-hidden">
                      <pre className="p-4 text-sm font-mono text-emerald-400 overflow-x-auto">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedReq.body), null, 2);
                          } catch {
                            return selectedReq.body;
                          }
                        })()}
                      </pre>
                    </div>
                  </section>
                )}

                {/* Response Headers */}
                {selectedReq.response && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                      <Monitor size={14} /> Response Headers
                    </h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-zinc-800">
                          {Object.entries(selectedReq.response.headers).map(([key, val]) => (
                            <tr key={key} className="hover:bg-zinc-800/50 transition-colors">
                              <td className="px-4 py-2 font-mono text-zinc-400 w-1/3 break-all">{key}</td>
                              <td className="px-4 py-2 font-mono text-zinc-200 break-all">{String(val)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Response Body */}
                {selectedReq.response && selectedReq.response.body && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                      <Code size={14} /> Response Payload
                    </h3>
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg overflow-hidden">
                      <pre className="p-4 text-sm font-mono text-indigo-400 overflow-x-auto">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedReq.response.body), null, 2);
                          } catch {
                            return selectedReq.response.body;
                          }
                        })()}
                      </pre>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Server size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">FlareGUI Telemetry Dashboard</h1>
                <p className="text-sm text-zinc-500">Статистика трафика и телеметрия в реальном времени</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* QR Code and Active Tunnel card */}
              {tunnelUrl && (
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl flex items-center justify-between gap-6 md:col-span-3">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Адрес публичного туннеля</div>
                    <a href={tunnelUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-mono font-bold text-base break-all">
                      {tunnelUrl}
                    </a>
                    <p className="text-xs text-zinc-500 mt-2">Используйте эту ссылку для отправки внешних запросов (вебхуков, мобильных тестов).</p>
                  </div>
                  <div className="bg-white p-1 rounded-lg shrink-0 select-none shadow-md">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(tunnelUrl)}`} 
                      alt="QR Code" 
                      className="w-[80px] h-[80px]"
                    />
                  </div>
                </div>
              )}

              {/* Card 1: Total requests */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Всего запросов</div>
                <div className="text-3xl font-bold font-mono text-zinc-100">{totalReqCount}</div>
                <div className="mt-2 text-xs text-zinc-600">Накоплено в буфере истории</div>
              </div>

              {/* Card 2: Average latency */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={12} className="text-zinc-500" /> Среднее время ответа
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">{avgLatency} <span className="text-lg text-zinc-500 font-sans">мс</span></div>
                <div className="mt-2 text-xs text-zinc-600">На основе {responseCount} ответов</div>
              </div>

              {/* Card 3: Success rate */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Доля успешных (2xx)
                </div>
                <div className="text-3xl font-bold font-mono text-emerald-400">{successRate}%</div>
                <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${successRate}%` }}></div>
                </div>
              </div>
            </div>

            {totalReqCount === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-600 flex flex-col items-center gap-4">
                <Globe size={32} className="opacity-35 animate-pulse" />
                <div>
                  <p className="font-semibold text-zinc-400">Ожидание первого HTTP-запроса...</p>
                  <p className="text-xs text-zinc-500 mt-1">Отправьте запрос через ваш публичный URL туннеля</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* HTTP Methods distribution */}
                <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-xl">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-4">HTTP Методы</h3>
                  <div className="space-y-3 font-mono">
                    {['GET', 'POST', 'PUT', 'DELETE'].map(m => {
                      const count = requests.filter(r => r.method === m).length;
                      const percentage = totalReqCount > 0 ? Math.round((count / totalReqCount) * 100) : 0;
                      if (count === 0) return null;
                      return (
                        <div key={m} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-300 font-bold">{m}</span>
                            <span className="text-zinc-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full ${
                                m === 'GET' ? 'bg-blue-500' :
                                m === 'POST' ? 'bg-emerald-500' :
                                m === 'PUT' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Errors summary */}
                <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-xl">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" /> Ошибки
                  </h3>
                  {errorCount === 0 ? (
                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-4 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>Ошибок в логах истории не зафиксировано!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-zinc-500 mb-2">Найдено ошибок: <span className="text-red-400 font-bold font-mono">{errorCount}</span></div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                        {requestsWithResponse.filter(r => r.response.statusCode >= 400 || r.response.statusCode === 502).slice(0, 5).map(r => (
                          <div key={r.id} className="flex items-center justify-between text-[11px] bg-zinc-900 border border-zinc-800 p-2 rounded font-mono">
                            <span className="text-zinc-300 truncate w-2/3">{r.url}</span>
                            <span className="text-red-400 font-bold bg-red-500/10 px-1 py-0.5 rounded">{r.response.statusCode}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
