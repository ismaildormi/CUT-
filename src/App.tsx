import React, { useState, useRef } from 'react';
import { CompanionViewport } from './components/CompanionViewport';
import { GlassmorphismPanel } from './components/GlassmorphismPanel';
import { CompanionAIEngine } from './services/companionAI';

export const App: React.FC = () => {
  const [creature, setCreature] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Hi! I'm Nevea, your sentient white fluffy companion.");
  const [companionState, setCompanionState] = useState<string>('idle');
  const aiEngineRef = useRef<CompanionAIEngine | null>(null);

  const handleCreatureReady = (c: any) => {
    setCreature(c);
    const engine = new CompanionAIEngine({
      creature: c,
      onStatusChange: ({ state, message }: { state: string; message: string }) => {
        setCompanionState(state);
        if (message) setStatusMessage(message);
      },
    });
    aiEngineRef.current = engine;
  };

  const handleSendTurn = async (prompt: string, includeScreen = false) => {
    if (!aiEngineRef.current) return;
    return aiEngineRef.current.sendTurn({ prompt, includeScreen });
  };

  const handleToggleVoice = () => {
    if (aiEngineRef.current) {
      aiEngineRef.current.toggleListening();
    }
  };

  return (
    <main className="w-screen h-screen relative overflow-hidden bg-slate-950">
      {/* 3D Viewport with Calibrated Exposure & Soft Fur Shaders */}
      <div className="absolute inset-0 z-0">
        <CompanionViewport onCreatureReady={handleCreatureReady} toneMappingExposure={0.88} />
      </div>

      {/* Draggable, Dismissible Glassmorphic HUD with Security Gate */}
      <GlassmorphismPanel
        creature={creature}
        onSendTurn={handleSendTurn}
        onToggleVoice={handleToggleVoice}
        statusMessage={statusMessage}
        companionState={companionState}
      />
    </main>
  );
};

export default App;
