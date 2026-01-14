"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Activity, Database, Globe } from "lucide-react";

export default function VisualEffects() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isAtlasMode, setIsAtlasMode] = useState(false);
    const [inputBuffer, setInputBuffer] = useState("");

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // Calculate normalized position (-0.5 to 0.5)
        setMousePos({
            x: (e.clientX / window.innerWidth) - 0.5,
            y: (e.clientY / window.innerHeight) - 0.5,
        });
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const char = e.key.toLowerCase();
        if (/^[a-z]$/.test(char)) {
            setInputBuffer((prev) => {
                const newBuffer = (prev + char).slice(-5); // Keep last 5 chars
                if (newBuffer === "atlas") {
                    setIsAtlasMode(true);
                    return "";
                }
                return newBuffer;
            });
        }
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleMouseMove, handleKeyDown]);

    return (
        <>
            {/* Parallax Orbs Background */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <motion.div
                    animate={{
                        x: mousePos.x * -60,
                        y: mousePos.y * -60,
                    }}
                    transition={{ type: "spring", damping: 30, stiffness: 50 }}
                    className="orb top-[-100px] left-[-100px] h-[500px] w-[500px] bg-blue-600/10"
                />
                <motion.div
                    animate={{
                        x: mousePos.x * 40,
                        y: mousePos.y * 40,
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 40 }}
                    className="orb animation-delay-2000 right-[-100px] bottom-[-100px] h-[400px] w-[400px] bg-purple-600/10"
                />
                <motion.div
                    animate={{
                        x: mousePos.x * -20,
                        y: mousePos.y * -20,
                    }}
                    transition={{ type: "spring", damping: 20, stiffness: 30 }}
                    className="orb animation-delay-4000 top-[40%] left-[20%] h-[300px] w-[300px] bg-indigo-600/10"
                />
            </div>

            {/* Atlas Mode Terminal Overlay */}
            <AnimatePresence>
                {isAtlasMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAtlasMode(false)}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-2xl rounded-3xl border border-blue-500/30 bg-black p-8 shadow-[0_0_100px_rgba(59,130,246,0.1)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                                        <Terminal className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black tracking-[0.3em] text-blue-400 uppercase">
                                            System Diagnostics
                                        </div>
                                        <div className="text-lg font-black tracking-tighter text-white">
                                            ATLAS CORE // VER 1.0.1
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAtlasMode(false)}
                                    className="rounded-lg border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5"
                                >
                                    Terminate Session
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: Shield, label: "Security Layer", val: "ACTIVE // AES-256" },
                                    { icon: Cpu, label: "Neural Engine", val: "GEMINI 1.5 PRO" },
                                    { icon: Activity, label: "Data Stream", val: "4.8 GBPS // REAL-TIME" },
                                    { icon: Database, label: "Caching Layer", val: "SUPABASE // EDGE" },
                                    { icon: Globe, label: "Global Nodes", val: "CITIES_INTEL.V4" },
                                    { icon: Activity, label: "Uptime", val: "99.982% // SYNC" },
                                ].map((item, i) => (
                                    <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/30">
                                            <item.icon className="h-3 w-3" />
                                            {item.label}
                                        </div>
                                        <div className="font-mono text-xs font-bold text-blue-400/80">{item.val}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 space-y-2 opacity-50">
                                <div className="font-mono text-[10px] text-green-500">
                                    {">"} INITIALIZING SCAN SEQUENCE...
                                </div>
                                <div className="font-mono text-[10px] text-green-500">
                                    {">"} ACCESSING GLOBAL CITY DATABASE... [OK]
                                </div>
                                <div className="font-mono text-[10px] text-green-500">
                                    {">"} BYPASSING OBSOLETE TRAVEL DATA... [COMPLETE]
                                </div>
                                <div className="font-mono text-[10px] text-blue-400 animate-pulse">
                                    {">"} STANDBY FOR INTELLIGENCE RETRIEVAL_
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
