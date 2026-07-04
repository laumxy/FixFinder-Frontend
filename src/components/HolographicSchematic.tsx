import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Layers, 
  Cpu, 
  Flame, 
  Wind, 
  Compass, 
  Droplets, 
  Radio,
  ExternalLink
} from 'lucide-react';

interface Hotspot {
  id: string;
  name: string;
  category: string;
  x: number; // percentage from left
  y: number; // percentage from top
  query: string;
  description: string;
  icon: React.ReactNode;
  subsystem: string;
}

interface HolographicSchematicProps {
  resolvedTheme: 'light' | 'dark';
  onSelectHotspot: (query: string) => void;
}

export default function HolographicSchematic({ resolvedTheme, onSelectHotspot }: HolographicSchematicProps) {
  const [hoveredSpot, setHoveredSpot] = useState<Hotspot | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const hotspots: Hotspot[] = [
    {
      id: 'ac',
      name: 'Overhead Climate Module',
      category: 'Roof AC & Heating',
      x: 52,
      y: 18,
      query: "RV Roof Leak near air conditioner unit",
      description: "Monitors foam gasket seals, condensation channels, and dual run capacitors.",
      icon: <Wind className="w-3.5 h-3.5 text-blue-400" />,
      subsystem: "SYS-CLIM-448"
    },
    {
      id: 'fridge',
      name: 'LP / AC Absorption Refrigerator',
      category: 'Refrigerators',
      x: 42,
      y: 45,
      query: "Dometic Fridge won't light on propane",
      description: "Controls the propane gas solenoid feed, burner orifice, and thermocouple safety loop.",
      icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
      subsystem: "SYS-FRIG-912"
    },
    {
      id: 'heater',
      name: 'Direct Spark Ignition Water Heater',
      category: 'Water Heaters',
      x: 80,
      y: 72,
      query: "Suburban Water Heater: No hot water / Won't ignite",
      description: "Inspects bypass valves, ECO high-limit switches, and 120V heating elements.",
      icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
      subsystem: "SYS-HEAT-115"
    },
    {
      id: 'generator',
      name: '4.0kW Auxiliary Generator',
      category: 'Power Generation',
      x: 23,
      y: 80,
      query: "Onan Generator starts then dies immediately",
      description: "Queries active oil sensor shutdowns, fuel pump pressure lines, and carburetor jets.",
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      subsystem: "SYS-GEN-306"
    },
    {
      id: 'pump',
      name: '12V On-Demand Water Pump',
      category: 'Plumbing Systems',
      x: 46,
      y: 79,
      query: "RV Water Pump runs continuously but no water flows",
      description: "Analyzes siphon valves, inlet strainer sediment, and suction line hairline cracks.",
      icon: <Droplets className="w-3.5 h-3.5 text-sky-400" />,
      subsystem: "SYS-PLUM-554"
    },
    {
      id: 'slide',
      name: 'Dual-Motor Slide-out Tracker',
      category: 'Slide-outs & Body',
      x: 64,
      y: 50,
      query: "Slide-out room won't retract or is stuck",
      description: "Monitors dual Lippert/Schwintek sync current draws, bypass locks, and battery voltage.",
      icon: <Layers className="w-3.5 h-3.5 text-purple-400" />,
      subsystem: "SYS-SLID-002"
    },
    {
      id: 'battery',
      name: 'Chassis Power Grid & Converter',
      category: 'Electrical DC/AC',
      x: 10,
      y: 72,
      query: "House battery not charging when plugged into shore power",
      description: "Traces reverse-polarity safety fuses, battery disconnect switches, and frame ground lines.",
      icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" />,
      subsystem: "SYS-ELEC-220"
    },
    {
      id: 'jacks',
      name: 'Hydraulic Stabilization Struts',
      category: 'Leveling Systems',
      x: 88,
      y: 88,
      query: "Hydraulic leveling jacks won't retract",
      description: "Validates parking brake interlocks, fluid reservoir volume, and manual bypass valves.",
      icon: <Compass className="w-3.5 h-3.5 text-cyan-400" />,
      subsystem: "SYS-JACK-770"
    }
  ];

  const handleSpotClick = (spot: Hotspot) => {
    setActiveScanId(spot.id);
    // Simulate high tech loading / sonar scan effect
    setTimeout(() => {
      setActiveScanId(null);
      onSelectHotspot(spot.query);
    }, 900);
  };

  return (
    <div className={`border rounded-[28px] p-6 relative overflow-hidden transition-all duration-300 ${
      resolvedTheme === 'dark' 
        ? 'bg-[#0B0F19]/60 border-white/[0.08] shadow-[0_15px_40px_rgba(0,0,0,0.6)]' 
        : 'bg-white border-slate-200 shadow-[0_15px_40px_rgba(0,0,0,0.03)]'
    }`}>
      {/* Decorative corners */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#8B5CF6]/30 rounded-tl" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#3B82F6]/30 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#10B981]/30 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#3B82F6]/30 rounded-br" />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2 border-b border-white/[0.05] pb-4">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#8B5CF6] animate-pulse" />
            <span className="text-[10px] font-mono font-black text-gray-400 tracking-widest uppercase">INTERACTIVE SCHEMATIC LAB</span>
          </div>
          <h3 className={`text-lg font-black tracking-tight mt-1 ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
            Holographic RV Telemetry Grid
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#10B981] font-bold bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/15">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          ACTIVE SENSOR COUPLING
        </div>
      </div>

      {/* Main Schematic Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[280px]">
        
        {/* Schematic SVG Stage (cols 7) */}
        <div className="lg:col-span-8 relative w-full aspect-[2/1] rounded-2xl bg-black/[0.15] border border-white/[0.04] p-4 flex items-center justify-center overflow-hidden">
          {/* Dynamic scan line effect */}
          {activeScanId && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8B5CF6]/15 to-transparent h-1/2 w-full animate-bounce pointer-events-none z-10 border-b border-[#8B5CF6]/40" />
          )}

          {/* Glowing tech grid */}
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

          {/* RV Wireframe Graphic */}
          <svg viewBox="0 0 540 270" className="w-full h-full text-[#3B82F6]/20 fill-none stroke-current" style={{ strokeWidth: 1.5 }}>
            {/* Ground / shadow line */}
            <line x1="20" y1="240" x2="520" y2="240" strokeDasharray="3,3" stroke="currentColor" className="opacity-40" />
            
            {/* RV Caravan Base Silhouette */}
            <path d="M 80 230 
                     L 460 230 
                     A 25 25 0 0 0 485 205 
                     L 485 110 
                     A 20 20 0 0 0 465 90 
                     L 430 90 
                     L 410 70 
                     L 210 70 
                     L 190 90 
                     L 80 90 
                     A 15 15 0 0 0 65 105 
                     L 65 215 
                     A 15 15 0 0 0 80 230 Z" 
                  className={`transition-colors duration-300 ${activeScanId ? 'text-[#8B5CF6]/30' : 'text-[#3B82F6]/20'}`}
                  style={{ strokeWidth: 2 }}
            />

            {/* Interior structural rails */}
            <path d="M 65 140 L 485 140 M 65 185 L 485 185" strokeDasharray="4,4" className="opacity-30" />

            {/* Slide-out border drawing */}
            <rect x="280" y="105" width="110" height="70" rx="4" stroke="currentColor" strokeDasharray="2,2" className="opacity-50" />

            {/* AC Unit on roof */}
            <path d="M 240 70 L 240 50 L 310 50 L 320 70 Z" className="opacity-40" />
            <line x1="265" y1="50" x2="265" y2="70" className="opacity-30" />
            <line x1="290" y1="50" x2="290" y2="70" className="opacity-30" />

            {/* Tow A-Frame Coupling (Left side) */}
            <path d="M 65 215 L 20 225 L 20 230 L 40 230" className="opacity-40" />
            <circle cx="20" cy="227" r="3" className="opacity-60" />

            {/* Dual Axle Wheels */}
            <circle cx="215" cy="230" r="22" strokeDasharray="2,2" className="opacity-50" />
            <circle cx="215" cy="230" r="12" className="opacity-40" />
            <circle cx="265" cy="230" r="22" strokeDasharray="2,2" className="opacity-50" />
            <circle cx="265" cy="230" r="12" className="opacity-40" />

            {/* Front Battery Tray Box */}
            <rect x="42" y="195" width="18" height="20" rx="2" className="opacity-40" />

            {/* Windows */}
            <rect x="115" y="110" width="45" height="30" rx="3" className="opacity-30" />
            <rect x="180" y="110" width="45" height="30" rx="3" className="opacity-30" />
            
            {/* Door outline */}
            <path d="M 410 140 L 410 230 M 450 140 L 450 230 M 410 140 L 450 140" className="opacity-30" />

            {/* Radar Sweep Arc around active scan */}
            {activeScanId && (
              <circle 
                cx={`${hotspots.find(h => h.id === activeScanId)?.x}%`} 
                cy={`${hotspots.find(h => h.id === activeScanId)?.y}%`} 
                r="45" 
                className="stroke-[#8B5CF6] opacity-35 animate-ping" 
                style={{ strokeWidth: 1 }} 
              />
            )}
          </svg>

          {/* Interactive Pulsing Hotspot Dots */}
          {hotspots.map(spot => {
            const isHovered = hoveredSpot?.id === spot.id;
            const isScanning = activeScanId === spot.id;

            return (
              <button
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                onMouseEnter={() => setHoveredSpot(spot)}
                onMouseLeave={() => setHoveredSpot(null)}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer focus:outline-none"
              >
                {/* Double pulsing radar ring */}
                <span className={`absolute inline-flex h-7 w-7 rounded-full opacity-60 animate-ping duration-1000 ${
                  isScanning 
                    ? 'bg-red-500' 
                    : spot.id === 'battery' 
                      ? 'bg-emerald-400' 
                      : 'bg-[#8B5CF6]'
                }`} />
                <span className={`absolute inline-flex h-4 w-4 rounded-full opacity-35 animate-ping duration-700 ${
                  isScanning ? 'bg-red-400' : 'bg-[#3B82F6]'
                }`} />

                {/* Inner core dot */}
                <div className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 flex items-center justify-center ${
                  isScanning 
                    ? 'bg-red-500 border-white scale-125' 
                    : isHovered 
                      ? 'bg-white border-[#8B5CF6] scale-125 shadow-[0_0_15px_rgba(139,92,246,0.6)]' 
                      : resolvedTheme === 'dark'
                        ? 'bg-[#0B0F19] border-[#3B82F6]'
                        : 'bg-white border-[#3B82F6] shadow-sm'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isScanning ? 'bg-white' : 'bg-[#8B5CF6]'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Telemetry Readout Panel (cols 4) */}
        <div className="lg:col-span-4 flex flex-col justify-center text-left h-full">
          <AnimatePresence mode="wait">
            {hoveredSpot ? (
              <motion.div
                key={hoveredSpot.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`p-5 rounded-2xl border ${
                  resolvedTheme === 'dark' 
                    ? 'bg-black/45 border-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {hoveredSpot.icon}
                  <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">{hoveredSpot.category}</span>
                </div>
                <h4 className={`text-md font-black tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                  {hoveredSpot.name}
                </h4>
                <div className="mt-2 text-xs font-mono text-[#8B5CF6] font-bold flex items-center gap-1">
                  <span>SUBSYS: {hoveredSpot.subsystem}</span>
                </div>
                <p className={`text-xs mt-2.5 leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                  {hoveredSpot.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-mono text-[#10B981] font-bold">
                  <span>⚡ CLICK TO INITIATE SENSOR SCAN</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="default-telemetry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`p-5 rounded-2xl border ${
                  resolvedTheme === 'dark' 
                    ? 'bg-black/30 border-white/[0.05]' 
                    : 'bg-slate-50/50 border-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">TELEMETRY MATRIX</span>
                </div>
                <h4 className={`text-sm font-bold tracking-tight ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-700'}`}>
                  Diagnostic Node Inactive
                </h4>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Hover over any pulsing radar junction point on the holographic chassis to query its operational subsystem parameters, or tap it to compile the corresponding on-device AI resolution guide.
                </p>
                <div className="mt-4 border-t border-white/[0.05] pt-3.5 grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-500 font-semibold">
                  <div>VECTOR MAPS: 218 NODES</div>
                  <div>OFFLINE INDEX: v2.1.0</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
