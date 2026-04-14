import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, CheckCircle2, Info, AlertCircle, BookOpen, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Atom {
  id: string;
  symbol: string;
  x: number;
  y: number;
  valanceElectrons: number;
}

interface Electron {
  id: string;
  atomId: string;
  x: number;
  y: number;
}

interface LewisCanvasProps {
  onClose: () => void;
  onSave: (imageData: string) => void;
}

export const LewisCanvas: React.FC<LewisCanvasProps> = ({ onClose, onSave }) => {
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [electrons, setElectrons] = useState<Electron[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Validate electron counts whenever atoms or electrons change
  useEffect(() => {
    const errors: string[] = [];
    atoms.forEach(atom => {
      const currentElectrons = electrons.filter(e => e.atomId === atom.id).length;
      const charge = atom.valanceElectrons - currentElectrons;
      
      if (charge === 0) {
        // Neutral state
      } else if (charge > 0) {
        if (currentElectrons === 0) {
          // Stable cation
        } else {
          errors.push(`Atom ${atom.symbol} sedang melepaskan elektron (Muatan: +${charge})`);
        }
      } else {
        if (currentElectrons === 8 || (atom.symbol === 'H' && currentElectrons === 2)) {
          // Stable anion
        } else {
          errors.push(`Atom ${atom.symbol} sedang menangkap elektron (Muatan: ${charge})`);
        }
      }
    });
    setValidationErrors(errors);
  }, [atoms, electrons]);

  const addAtom = (symbol: string, valence: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAtom: Atom = {
      id,
      symbol,
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      valanceElectrons: valence,
    };
    setAtoms([...atoms, newAtom]);
    
    // Add valence electrons around the atom
    const newElectrons: Electron[] = [];
    for (let i = 0; i < valence; i++) {
      newElectrons.push({
        id: Math.random().toString(36).substr(2, 9),
        atomId: id,
        x: 0, // Relative to atom
        y: 0,
      });
    }
    setElectrons([...electrons, ...newElectrons]);
  };

  const loadExample = (type: 'NaCl' | 'MgCl2') => {
    setAtoms([]);
    setElectrons([]);

    if (type === 'NaCl') {
      const naId = Math.random().toString(36).substr(2, 9);
      const clId = Math.random().toString(36).substr(2, 9);
      
      setAtoms([
        { id: naId, symbol: 'Na', x: 150, y: 150, valanceElectrons: 1 },
        { id: clId, symbol: 'Cl', x: 350, y: 150, valanceElectrons: 7 }
      ]);

      const newElectrons: Electron[] = [];
      // Na electron
      newElectrons.push({ id: Math.random().toString(36).substr(2, 9), atomId: naId, x: 0, y: 0 });
      // Cl electrons
      for (let i = 0; i < 7; i++) {
        newElectrons.push({ id: Math.random().toString(36).substr(2, 9), atomId: clId, x: 0, y: 0 });
      }
      setElectrons(newElectrons);
    } else if (type === 'MgCl2') {
      const mgId = Math.random().toString(36).substr(2, 9);
      const cl1Id = Math.random().toString(36).substr(2, 9);
      const cl2Id = Math.random().toString(36).substr(2, 9);

      setAtoms([
        { id: mgId, symbol: 'Mg', x: 250, y: 150, valanceElectrons: 2 },
        { id: cl1Id, symbol: 'Cl', x: 100, y: 150, valanceElectrons: 7 },
        { id: cl2Id, symbol: 'Cl', x: 400, y: 150, valanceElectrons: 7 }
      ]);

      const newElectrons: Electron[] = [];
      // Mg electrons
      for (let i = 0; i < 2; i++) newElectrons.push({ id: Math.random().toString(36).substr(2, 9), atomId: mgId, x: 0, y: 0 });
      // Cl1 electrons
      for (let i = 0; i < 7; i++) newElectrons.push({ id: Math.random().toString(36).substr(2, 9), atomId: cl1Id, x: 0, y: 0 });
      // Cl2 electrons
      for (let i = 0; i < 7; i++) newElectrons.push({ id: Math.random().toString(36).substr(2, 9), atomId: cl2Id, x: 0, y: 0 });
      setElectrons(newElectrons);
    }
  };

  const removeAtom = (id: string) => {
    setAtoms(atoms.filter(a => a.id !== id));
    setElectrons(electrons.filter(e => e.atomId !== id));
  };

  const handleCapture = async () => {
    if (!canvasRef.current) return;
    
    try {
      // Temporarily hide UI elements that shouldn't be in the screenshot
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#fdfbf7',
        scale: 2,
        logging: false,
        useCORS: true,
        ignoreElements: (element) => {
          return element.tagName === 'BUTTON' || element.classList.contains('no-capture');
        }
      });
      const imageData = canvas.toDataURL('image/png');
      onSave(imageData);
    } catch (error) {
      console.error("Capture error:", error);
      onSave("Canvas Lewis Structure (Capture Failed)");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-warm-bg/95 backdrop-blur-md flex flex-col p-4 md:p-8"
    >
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col bg-warm-paper rounded-3xl shadow-2xl border border-warm-accent/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-warm-accent/10 flex justify-between items-center bg-warm-paper">
          <div>
            <h2 className="serif text-2xl font-bold text-warm-accent">Laboratorium Lewis Ibu</h2>
            <p className="text-xs text-warm-accent/60 uppercase tracking-widest font-semibold">Susun atom dan elektronmu di sini</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-warm-accent/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-warm-accent" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Tools - Now Scrollable */}
          <div className="w-full md:w-72 p-6 border-b md:border-b-0 md:border-r border-warm-accent/10 space-y-6 bg-warm-bg/30 overflow-y-auto scrollbar-hide">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-warm-accent/50 mb-4">Tambah Atom</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { s: 'H', v: 1 }, { s: 'Li', v: 1 }, { s: 'Be', v: 2 },
                  { s: 'B', v: 3 }, { s: 'C', v: 4 }, { s: 'N', v: 5 },
                  { s: 'O', v: 6 }, { s: 'F', v: 7 }, { s: 'Na', v: 1 },
                  { s: 'Mg', v: 2 }, { s: 'Al', v: 3 }, { s: 'Si', v: 4 },
                  { s: 'P', v: 5 }, { s: 'S', v: 6 }, { s: 'Cl', v: 7 },
                  { s: 'K', v: 1 }, { s: 'Ca', v: 2 }, { s: 'Br', v: 7 },
                  { s: 'I', v: 7 }, { s: 'Ba', v: 2 }, { s: 'Sr', v: 2 }
                ].map(item => (
                  <button
                    key={item.s}
                    onClick={() => addAtom(item.s, item.v)}
                    className="p-2 bg-warm-paper border border-warm-accent/20 rounded-xl hover:border-warm-accent hover:bg-warm-accent hover:text-warm-bg transition-all text-xs font-bold flex flex-col items-center"
                  >
                    <span>{item.s}</span>
                    <span className="text-[7px] opacity-60">V: {item.v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-warm-accent/5 rounded-2xl border border-warm-accent/10">
              <div className="flex items-start gap-2 text-warm-accent/70">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Geser atom untuk mengatur posisi. Dalam ikatan ion, elektron berpindah dari logam ke non-logam.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-warm-accent/50 mb-4">Contoh Senyawa</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => loadExample('NaCl')}
                  className="p-3 bg-warm-paper border border-warm-accent/20 rounded-xl hover:border-warm-accent hover:bg-warm-accent hover:text-warm-bg transition-all text-xs font-bold flex items-center gap-3"
                >
                  <BookOpen className="w-4 h-4" />
                  Garam Dapur (NaCl)
                </button>
                <button
                  onClick={() => loadExample('MgCl2')}
                  className="p-3 bg-warm-paper border border-warm-accent/20 rounded-xl hover:border-warm-accent hover:bg-warm-accent hover:text-warm-bg transition-all text-xs font-bold flex items-center gap-3"
                >
                  <BookOpen className="w-4 h-4" />
                  Magnesium Klorida (MgCl2)
                </button>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                <div className="flex items-start gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Peringatan Valensi</p>
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-[9px] leading-tight opacity-80">{err}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area - Now with larger virtual space and scrollable container */}
          <div className="flex-1 relative overflow-auto bg-[radial-gradient(#5a5a40_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
            <div 
              ref={canvasRef}
              className="min-w-[1200px] min-h-[800px] relative"
            >
              <AnimatePresence>
              {atoms.map(atom => (
                <motion.div
                  key={atom.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0.1}
                  whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 50 }}
                  whileHover={{ scale: 1.05 }}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute cursor-grab group"
                  style={{ left: atom.x, top: atom.y }}
                >
                  <div className={`relative w-16 h-16 flex items-center justify-center bg-warm-paper border-2 rounded-full shadow-lg group-hover:scale-110 transition-all ${
                    electrons.filter(e => e.atomId === atom.id).length !== atom.valanceElectrons 
                      ? 'border-blue-500 shadow-blue-100' 
                      : 'border-warm-accent'
                  }`}>
                    <span className="serif text-xl font-bold text-warm-accent">
                      {atom.symbol}
                      {(() => {
                        const currentCount = electrons.filter(e => e.atomId === atom.id).length;
                        const charge = atom.valanceElectrons - currentCount;
                        if (charge === 0) return null;
                        const chargeText = Math.abs(charge) === 1 
                          ? (charge > 0 ? '+' : '-') 
                          : `${Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
                        return <sup className="text-[10px] ml-0.5">{chargeText}</sup>;
                      })()}
                    </span>
                    
                    {/* Charge Indicator Badge (Floating) */}
                    {(() => {
                      const currentCount = electrons.filter(e => e.atomId === atom.id).length;
                      const charge = atom.valanceElectrons - currentCount;
                      if (charge === 0) return null;
                      const chargeText = Math.abs(charge) === 1 
                        ? (charge > 0 ? '+' : '-') 
                        : `${Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
                      return (
                        <motion.div 
                          initial={{ scale: 0, y: 10 }}
                          animate={{ scale: 1, y: 0 }}
                          className={`absolute -top-4 -right-4 w-8 h-8 rounded-full flex flex-col items-center justify-center text-[10px] font-bold shadow-xl border-2 border-warm-paper z-20 ${charge > 0 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
                        >
                          <span>{chargeText}</span>
                          <span className="text-[6px] uppercase leading-none">{charge > 0 ? 'ION+' : 'ION-'}</span>
                        </motion.div>
                      );
                    })()}
                    
                    {/* Electrons around the atom */}
                    {electrons.filter(e => e.atomId === atom.id).map((electron, idx) => {
                      const angle = (idx / electrons.filter(e => e.atomId === atom.id).length) * 2 * Math.PI;
                      const r = 35;
                      const ex = Math.cos(angle) * r;
                      const ey = Math.sin(angle) * r;
                      
                      return (
                        <motion.div
                          key={electron.id}
                          drag
                          dragMomentum={false}
                          onDragEnd={(e, info) => {
                            const canvasRect = canvasRef.current?.getBoundingClientRect();
                            if (!canvasRect) return;
                            
                            const dropX = info.point.x - canvasRect.left;
                            const dropY = info.point.y - canvasRect.top;
                            
                            const targetAtom = atoms.find(a => {
                              if (a.id === atom.id) return false;
                              const dist = Math.sqrt(Math.pow(a.x + 32 - dropX, 2) + Math.pow(a.y + 32 - dropY, 2));
                              return dist < 60;
                            });

                            if (targetAtom) {
                              setElectrons(prev => prev.map(el => 
                                el.id === electron.id ? { ...el, atomId: targetAtom.id } : el
                              ));
                            }
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          whileDrag={{ scale: 1.5, zIndex: 60 }}
                          className="absolute w-3 h-3 bg-warm-accent rounded-full shadow-sm cursor-crosshair z-10"
                          style={{ 
                            left: `calc(50% + ${ex}px - 6px)`, 
                            top: `calc(50% + ${ey}px - 6px)` 
                          }}
                        />
                      );
                    })}

                    <button 
                      onClick={() => removeAtom(atom.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {atoms.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-accent/20 pointer-events-none">
                <Plus className="w-12 h-12 mb-2" />
                <p className="serif text-xl">Kanvas Kosong</p>
                <p className="text-xs uppercase tracking-widest font-bold">Pilih atom dari panel kiri</p>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-warm-accent/10 bg-warm-paper flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-warm-accent/60 hover:text-warm-accent transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleCapture}
            disabled={atoms.length === 0 || validationErrors.length > 0}
            className="px-8 py-2 bg-warm-accent text-warm-bg rounded-full text-sm font-bold uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Selesai & Kirim ke Ibu
          </button>
        </div>
      </div>
    </motion.div>
  );
};
