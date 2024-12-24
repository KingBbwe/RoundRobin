import React from 'react';
import { createRoot } from 'react-dom/client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../declarations/equalizing_round_robin';
import ContractInterface from './ContractInterface';

// Import global styles
import './styles.css';

// Initialize the agent
const initializeAgent = async () => {
  // When deployed locally, we need to specify the local URL
  const isLocal = process.env.NODE_ENV !== "production";
  const host = isLocal ? "http://localhost:8000" : "https://ic0.app";

  // Create an agent
  const agent = new HttpAgent({ host });

  // Only fetch the root key when running locally
  if (isLocal) {
    await agent.fetchRootKey();
  }

  // Get the canister ID from the environment
  const canisterId = process.env.EQUALIZING_ROUND_ROBIN_CANISTER_ID;

  // Create the actor
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  return actor;
};

// Initialize the application
const init = async () => {
  try {
    const actor = await initializeAgent();
    
    // Create the root element
    const container = document.getElementById('root');
    const root = createRoot(container);
    
    // Render the application
    root.render(
      <React.StrictMode>
        <div className="min-h-screen bg-background">
          <main className="container mx-auto py-8">
            <ContractInterface actor={actor} />
          </main>
        </div>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    
    // Render error state
    const container = document.getElementById('root');
    const root = createRoot(container);
    
    root.render(
      <React.StrictMode>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-4">
            <h1 className="text-2xl font-bold text-destructive mb-2">
              Failed to Initialize Application
            </h1>
            <p className="text-muted-foreground">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </React.StrictMode>
    );
  }
};

// Initialize the app
init();

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://webpack.js.org/concepts/hot-module-replacement/
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
